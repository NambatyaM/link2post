import { NextRequest } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

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
  // srv3 format: <p t="ms" d="ms"><s>word</s>...</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  const texts: string[] = [];
  let match;
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

  // Classic format: <text start="s" dur="s">content</text>
  const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  while ((match = classicRegex.exec(xml)) !== null) {
    const text = decodeEntities(match[3]).trim();
    if (text) texts.push(text);
  }
  return texts.join(" ");
}

// Method 1: @distube/ytdl-core (handles YouTube anti-bot measures)
async function fetchViaYtdlCore(videoId: string): Promise<{ title: string; description: string; transcript: string }> {
  // Dynamic import to avoid bundling issues
  const ytdl = (await import("@distube/ytdl-core")).default;

  const info = await ytdl.getInfo(videoId);
  const tracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No caption tracks found");
  }

  // Prefer English, fall back to first available
  const track = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, {
    headers: { "User-Agent": CHROME_UA },
  });
  if (!xmlResp.ok) throw new Error(`Caption fetch failed: ${xmlResp.status}`);

  const xml = await xmlResp.text();
  const transcript = parseTranscriptXml(xml);

  const details = info.videoDetails as unknown as Record<string, string>;
  const title = details?.title || "";
  const description = details?.short_description || "";

  return { title, description, transcript };
}

// Method 2: InnerTube WEB client
async function fetchViaInnerTubeWeb(videoId: string): Promise<{ title: string; description: string; transcript: string }> {
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
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("No caption tracks in WEB response");

  const track = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, { headers: { "User-Agent": CHROME_UA } });
  if (!xmlResp.ok) throw new Error(`Caption XML failed: ${xmlResp.status}`);

  const transcript = parseTranscriptXml(await xmlResp.text());
  const title = data?.videoDetails?.title || "";
  const description = data?.videoDetails?.shortDescription || "";

  return { title, description, transcript };
}

// Method 3: oEmbed for details + HTML scrape for captions
async function fetchViaHtmlScrape(videoId: string): Promise<{ title: string; description: string; transcript: string }> {
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

  // Extract title
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "";

  // Extract caption tracks from ytInitialPlayerResponse
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

// Method 4: oEmbed for details + timedtext list for transcript
async function fetchViaTimedtext(videoId: string): Promise<{ title: string; description: string; transcript: string }> {
  // First get title from oEmbed
  const oembedResp = await fetchWithTimeout(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  if (!oembedResp.ok) throw new Error("oEmbed failed");
  const oembedData = await oembedResp.json();
  const title = oembedData?.title || "";

  // Try timedtext API directly
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

async function fetchSubtitles(videoId: string): Promise<{ transcript: string; title: string; description: string }> {
  const errors: string[] = [];

  const methods: [string, () => Promise<{ title: string; description: string; transcript: string }>][] = [
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
      errors.push(`${name}: ${e instanceof Error ? e.message : "unknown"}`);
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
      // Still try to get title for the error response
      let fallbackTitle = "";
      try {
        const oembedResp = await fetchWithTimeout(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedResp.ok) {
          const data = await oembedResp.json();
          fallbackTitle = data?.title || "";
        }
      } catch { /* */ }

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
