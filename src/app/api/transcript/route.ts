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
    if (!text) {
      text = inner.replace(/<[^>]+>/g, "");
    }
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

// Method 1: InnerTube WEB client (what the browser uses)
async function fetchViaInnerTubeWeb(videoId: string): Promise<string> {
  const resp = await fetchWithTimeout("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": CHROME_UA,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20241126.01.00",
          hl: "en",
          gl: "US",
        },
      },
      videoId,
    }),
  });

  if (!resp.ok) throw new Error(`InnerTube WEB failed: ${resp.status}`);

  const data = await resp.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("No caption tracks in WEB response");

  const track = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, {
    headers: { "User-Agent": CHROME_UA },
  });
  if (!xmlResp.ok) throw new Error(`Caption XML fetch failed: ${xmlResp.status}`);

  return parseTranscriptXml(await xmlResp.text());
}

// Method 2: InnerTube ANDROID client (youtube-transcript's approach)
async function fetchViaInnerTubeAndroid(videoId: string): Promise<string> {
  const resp = await fetchWithTimeout("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
        },
      },
      videoId,
    }),
  });

  if (!resp.ok) throw new Error(`InnerTube ANDROID failed: ${resp.status}`);

  const data = await resp.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("No caption tracks in ANDROID response");

  const track = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, {
    headers: { "User-Agent": CHROME_UA },
  });
  if (!xmlResp.ok) throw new Error(`Caption XML fetch failed: ${xmlResp.status}`);

  return parseTranscriptXml(await xmlResp.text());
}

// Method 3: InnerTube IOS client
async function fetchViaInnerTubeIOS(videoId: string): Promise<string> {
  const resp = await fetchWithTimeout("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "IOS",
          clientVersion: "19.29.1",
          deviceMake: "Apple",
          deviceModel: "iPhone16,2",
          hl: "en",
          osName: "iPhone",
          osVersion: "17.5.1.21F90",
        },
      },
      videoId,
    }),
  });

  if (!resp.ok) throw new Error(`InnerTube IOS failed: ${resp.status}`);

  const data = await resp.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("No caption tracks in IOS response");

  const track = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, {
    headers: { "User-Agent": CHROME_UA },
  });
  if (!xmlResp.ok) throw new Error(`Caption XML fetch failed: ${xmlResp.status}`);

  return parseTranscriptXml(await xmlResp.text());
}

// Method 4: HTML page scraping with consent cookie
async function fetchViaHtmlScrape(videoId: string): Promise<string> {
  const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": CHROME_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999",
    },
  });
  if (!res.ok) throw new Error(`HTML page fetch failed: ${res.status}`);

  const html = await res.text();

  if (html.includes("class=\"g-recaptcha\"")) throw new Error("YouTube requires CAPTCHA");
  if (!html.includes("\"playabilityStatus\":")) throw new Error("Video unavailable");

  // Extract ytInitialPlayerResponse
  const startToken = "var ytInitialPlayerResponse = ";
  const startIndex = html.indexOf(startToken);
  if (startIndex === -1) throw new Error("Could not find player response");

  const jsonStart = startIndex + startToken.length;
  let depth = 0;
  let playerResponse: Record<string, unknown> | null = null;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try { playerResponse = JSON.parse(html.slice(jsonStart, i + 1)); } catch { /* continue */ }
        break;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pr = playerResponse as any;
  const captionTracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(captionTracks) || captionTracks.length === 0) throw new Error("No caption tracks in HTML");

  const track = captionTracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || captionTracks[0];
  if (!track?.baseUrl) throw new Error("No track URL");

  const xmlResp = await fetchWithTimeout(track.baseUrl, {
    headers: { "User-Agent": CHROME_UA },
  });
  if (!xmlResp.ok) throw new Error(`Caption XML fetch failed: ${xmlResp.status}`);

  return parseTranscriptXml(await xmlResp.text());
}

// Method 5: Direct timedtext API
async function fetchViaTimedtextApi(videoId: string): Promise<string> {
  const langs = ["en", "en-US", "en-GB"];
  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
      const res = await fetchWithTimeout(url, {
        headers: { "User-Agent": CHROME_UA },
      });
      if (res.ok) {
        const xml = await res.text();
        const text = parseTranscriptXml(xml);
        if (text) return text;
      }
    } catch { /* try next lang */ }
  }
  throw new Error("No transcripts from timedtext API");
}

async function fetchVideoDetails(videoId: string): Promise<{ title: string; description: string } | null> {
  // oEmbed is the most reliable — it's a public API
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      if (data.title) return { title: data.title, description: "" };
    }
  } catch { /* continue */ }

  // Try extracting from page HTML
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": CHROME_UA, "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999" },
    });
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].replace(" - YouTube", "").trim();
        if (title && title !== "YouTube") return { title, description: "" };
      }
    }
  } catch { /* continue */ }

  return null;
}

async function fetchSubtitles(videoId: string): Promise<string> {
  const errors: string[] = [];

  const methods: [string, () => Promise<string>][] = [
    ["InnerTube WEB", () => fetchViaInnerTubeWeb(videoId)],
    ["InnerTube ANDROID", () => fetchViaInnerTubeAndroid(videoId)],
    ["InnerTube IOS", () => fetchViaInnerTubeIOS(videoId)],
    ["HTML scrape", () => fetchViaHtmlScrape(videoId)],
    ["timedtext API", () => fetchViaTimedtextApi(videoId)],
  ];

  for (const [name, fn] of methods) {
    try {
      const result = await fn();
      if (result && result.length > 10) {
        console.log(`Transcript fetched via ${name} for ${videoId}: ${result.length} chars`);
        return result;
      }
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  console.error(`All transcript methods failed for ${videoId}:`, errors);
  return "";
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

    const details = await fetchVideoDetails(videoId);
    if (!details) {
      return Response.json(
        { error: "Could not fetch video details. The video may be private or unavailable." },
        { status: 404 },
      );
    }

    const transcript = await fetchSubtitles(videoId);

    if (!transcript) {
      return Response.json(
        {
          error: "Could not extract captions. The video may not have captions enabled. Try a different video with subtitles.",
          title: details.title,
          description: details.description,
        },
        { status: 422 },
      );
    }

    return Response.json({
      title: details.title,
      description: details.description,
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
