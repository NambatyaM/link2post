import { NextRequest } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, writeFileSync, chmodSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";

const execFileAsync = promisify(execFile);
const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseTranscriptXml(xml: string): string {
  const texts: string[] = [];
  let match;

  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  while ((match = pRegex.exec(xml)) !== null) {
    const inner = match[3];
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch;
    while ((sMatch = sRegex.exec(inner)) !== null) {
      text += sMatch[1];
    }
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).trim();
    if (text) texts.push(text);
  }
  if (texts.length > 0) return texts.join(" ");

  const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  while ((match = classicRegex.exec(xml)) !== null) {
    const text = decodeEntities(match[3]).trim();
    if (text) texts.push(text);
  }
  return texts.join(" ");
}

function parseVtt(vtt: string): string {
  const lines: string[] = [];
  for (const line of vtt.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "WEBVTT") continue;
    if (trimmed.startsWith("Kind:") || trimmed.startsWith("Language:")) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/^\d{2}:\d{2}/.test(trimmed)) continue;
    if (trimmed.startsWith("NOTE")) continue;
    if (trimmed.startsWith("STYLE")) continue;
    lines.push(trimmed);
  }
  return [...new Set(lines)].join(" ");
}

function getTitleFromOembed(videoId: string): Promise<string> {
  return fetchWithTimeout(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.title || "")
    .catch(() => "");
}

interface TranscriptResult {
  title: string;
  description: string;
  transcript: string;
}

// ─── Method 1: youtube-transcript npm package ────────────────────────────────
// Uses InnerTube Android client + web page scraping with proper token extraction.
// Most likely to succeed from any IP because it handles YouTube's bot detection tokens.
async function fetchViaNpmPackage(videoId: string): Promise<TranscriptResult> {
  const { YoutubeTranscript } = await import("youtube-transcript");
  const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
  if (!items || items.length === 0) throw new Error("No transcript items returned");

  const transcript = items.map((item: { text: string }) => item.text).join(" ");
  const title = await getTitleFromOembed(videoId);
  return { title, description: "", transcript };
}

// ─── Method 2: yt-dlp CLI ────────────────────────────────────────────────────
// yt-dlp is the most robust YouTube extractor. Handles PO tokens, cookies, and
// anti-bot measures that simple HTTP fetchers cannot.
const YTDLP_PATH = join("/tmp", "yt-dlp");

async function ensureYtDlp(): Promise<string> {
  if (existsSync(YTDLP_PATH)) return YTDLP_PATH;

  // Download yt-dlp standalone binary (Linux x64 for Vercel, or fallback)
  const isWin = process.platform === "win32";
  if (isWin) {
    // On Windows, try to find yt-dlp.exe in PATH or common locations
    try {
      const { stdout } = await execFileAsync("where", ["yt-dlp"]);
      return stdout.trim().split("\n")[0].trim();
    } catch {
      throw new Error("yt-dlp not found on Windows");
    }
  }

  const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
  const resp = await fetchWithTimeout(url, {}, 30000);
  if (!resp.ok) throw new Error(`Failed to download yt-dlp: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  writeFileSync(YTDLP_PATH, buffer);
  chmodSync(YTDLP_PATH, 0o755);
  return YTDLP_PATH;
}

async function fetchViaYtDlp(videoId: string): Promise<TranscriptResult> {
  const ytDlp = await ensureYtDlp();
  const subFile = join("/tmp", `${videoId}.en.vtt`);
  const jsonFile = join("/tmp", `${videoId}.info.json`);

  // Clean up any previous files
  try { unlinkSync(subFile); } catch { /* */ }
  try { unlinkSync(jsonFile); } catch { /* */ }

  try {
    const { stdout } = await execFileAsync(ytDlp, [
      "--write-auto-sub",
      "--sub-lang", "en",
      "--sub-format", "vtt",
      "--skip-download",
      "--no-warnings",
      "--print-json",
      `-o`, join("/tmp", `${videoId}`),
      `https://www.youtube.com/watch?v=${videoId}`,
    ], { timeout: 30000 });

    // Parse video info JSON (last line of stdout)
    const jsonLines = stdout.trim().split("\n");
    const lastLine = jsonLines[jsonLines.length - 1];
    let title = "";
    let description = "";
    try {
      const info = JSON.parse(lastLine);
      title = info?.title || "";
      description = info?.description || "";
    } catch { /* */ }

    // If stdout didn't have JSON, try reading the file
    if (!title && existsSync(jsonFile)) {
      try {
        const info = JSON.parse(readFileSync(jsonFile, "utf-8"));
        title = info?.title || "";
        description = info?.description || "";
      } catch { /* */ }
    }

    // Read and parse the VTT subtitle file
    if (!existsSync(subFile)) throw new Error("No subtitle file created");
    const vtt = readFileSync(subFile, "utf-8");
    const transcript = parseVtt(vtt);
    if (!transcript) throw new Error("Subtitle file was empty");

    return { title, description, transcript };
  } finally {
    try { unlinkSync(subFile); } catch { /* */ }
    try { unlinkSync(jsonFile); } catch { /* */ }
  }
}

// ─── Method 3: @distube/ytdl-core ────────────────────────────────────────────
async function fetchViaYtdlCore(videoId: string): Promise<TranscriptResult> {
  const ytdl = (await import("@distube/ytdl-core")).default;
  const info = await ytdl.getInfo(videoId);
  const tracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("No caption tracks found");

  const track = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, { headers: { "User-Agent": CHROME_UA } });
  if (!xmlResp.ok) throw new Error(`Caption fetch failed: ${xmlResp.status}`);
  const transcript = parseTranscriptXml(await xmlResp.text());

  const details = info.videoDetails as unknown as Record<string, string>;
  return { title: details?.title || "", description: details?.short_description || "", transcript };
}

// ─── Method 4: InnerTube WEB client ──────────────────────────────────────────
async function fetchViaInnerTubeWeb(videoId: string): Promise<TranscriptResult> {
  const resp = await fetchWithTimeout("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": CHROME_UA },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00", hl: "en", gl: "US" } },
      videoId,
    }),
  });
  if (!resp.ok) throw new Error(`InnerTube WEB failed: ${resp.status}`);
  const data = await resp.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("No caption tracks");

  const track = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, { headers: { "User-Agent": CHROME_UA } });
  if (!xmlResp.ok) throw new Error(`Caption XML failed: ${xmlResp.status}`);

  const transcript = parseTranscriptXml(await xmlResp.text());
  return {
    title: data?.videoDetails?.title || "",
    description: data?.videoDetails?.shortDescription || "",
    transcript,
  };
}

// ─── Method 5: HTML scrape ───────────────────────────────────────────────────
async function fetchViaHtmlScrape(videoId: string): Promise<TranscriptResult> {
  const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": CHROME_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999",
    },
  });
  if (!res.ok) throw new Error(`HTML fetch failed: ${res.status}`);
  const html = await res.text();
  if (html.includes("g-recaptcha")) throw new Error("YouTube requires CAPTCHA");
  if (!html.includes("playabilityStatus")) throw new Error("Video unavailable");

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "";

  const startToken = "var ytInitialPlayerResponse = ";
  const startIndex = html.indexOf(startToken);
  if (startIndex === -1) throw new Error("No player response found");

  const jsonStart = startIndex + startToken.length;
  let depth = 0;
  let captionTracks: Array<{ languageCode: string; baseUrl: string }> | null = null;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          const pr = JSON.parse(html.slice(jsonStart, i + 1));
          captionTracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        } catch { /* continue */ }
        break;
      }
    }
  }

  if (!Array.isArray(captionTracks) || captionTracks.length === 0) throw new Error("No caption tracks in HTML");

  const track = captionTracks.find((t) => t.languageCode?.startsWith("en")) || captionTracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, { headers: { "User-Agent": CHROME_UA } });
  if (!xmlResp.ok) throw new Error(`Caption XML failed: ${xmlResp.status}`);

  const transcript = parseTranscriptXml(await xmlResp.text());
  return { title, description: "", transcript };
}

// ─── Method 6: Timedtext API directly ────────────────────────────────────────
async function fetchViaTimedtext(videoId: string): Promise<TranscriptResult> {
  const title = await getTitleFromOembed(videoId);
  const langs = ["en", "en-US", "en-GB"];
  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": CHROME_UA } });
      if (res.ok) {
        const xml = await res.text();
        const transcript = parseTranscriptXml(xml);
        if (transcript) return { title, description: "", transcript };
      }
    } catch { /* try next */ }
  }
  throw new Error("No transcripts from timedtext API");
}

// ─── Orchestration ───────────────────────────────────────────────────────────
async function fetchSubtitles(videoId: string): Promise<TranscriptResult> {
  const errors: string[] = [];

  const methods: [string, () => Promise<TranscriptResult>][] = [
    ["youtube-transcript", () => fetchViaNpmPackage(videoId)],
    ["yt-dlp", () => fetchViaYtDlp(videoId)],
    ["ytdl-core", () => fetchViaYtdlCore(videoId)],
    ["InnerTube WEB", () => fetchViaInnerTubeWeb(videoId)],
    ["HTML scrape", () => fetchViaHtmlScrape(videoId)],
    ["timedtext API", () => fetchViaTimedtext(videoId)],
  ];

  for (const [name, fn] of methods) {
    try {
      const result = await fn();
      if (result.transcript && result.transcript.length > 10) {
        console.log(`Transcript fetched via ${name} for ${videoId}: ${result.transcript.length} chars`);
        return result;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      errors.push(`${name}: ${msg}`);
      console.warn(`[transcript] ${name} failed: ${msg}`);
    }
  }

  console.error(`All transcript methods failed for ${videoId}:`, errors);
  return { transcript: "", title: "", description: "" };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "Please provide a YouTube URL." }, { status: 400 });
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return Response.json(
        { error: "Invalid YouTube URL. Please paste a valid video link." },
        { status: 400 },
      );
    }

    const rateResult = await checkRateLimit({ plan: "anonymous" });
    if (!rateResult.allowed) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const { transcript, title, description } = await fetchSubtitles(videoId);

    if (!transcript) {
      const fallbackTitle = await getTitleFromOembed(videoId);
      return Response.json(
        {
          error: "Could not extract captions. The video may not have captions enabled. Try a different video with subtitles.",
          title: fallbackTitle,
          description: "",
        },
        { status: 422 },
      );
    }

    return Response.json({
      title,
      description,
      transcript,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
    });
  } catch (error) {
    console.error("Transcript fetch error:", error);
    return Response.json(
      { error: "Failed to fetch video transcript. Please try again." },
      { status: 500 },
    );
  }
}
