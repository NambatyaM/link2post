/**
 * Client-side YouTube transcript extraction.
 *
 * YouTube blocks transcript requests from data center IPs (Vercel, AWS, etc.)
 * but serves them normally to real browsers with residential IPs.
 * This module runs in the browser to extract transcripts directly.
 */

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseTranscriptXml(xml: string): string {
  const texts: string[] = [];

  // srv3 format: <p t="ms" d="ms"><s>word</s>...</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
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

interface TranscriptResult {
  title: string;
  description: string;
  transcript: string;
  url: string;
  videoId: string;
}

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

/**
 * Fetch transcript from YouTube directly in the browser.
 * Works because the browser has a residential IP that isn't blocked.
 */
export async function fetchTranscriptClient(url: string): Promise<TranscriptResult> {
  const videoId = extractVideoId(url.trim());
  if (!videoId) throw new Error("Invalid YouTube URL");

  const resultUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Step 1: Fetch the YouTube page HTML
  const pageResp = await fetch(resultUrl, {
    headers: { "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!pageResp.ok) throw new Error("Failed to fetch YouTube page");
  const html = await pageResp.text();

  // Step 2: Extract title
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "";

  // Step 3: Extract ytInitialPlayerResponse
  const startToken = "var ytInitialPlayerResponse = ";
  const startIndex = html.indexOf(startToken);
  if (startIndex === -1) throw new Error("Could not find player response — video may be unavailable");

  const jsonStart = startIndex + startToken.length;
  let depth = 0;
  let captionTracks: Array<{ languageCode: string; baseUrl: string; name?: { simpleText: string } }> | null = null;
  let description = "";
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          const pr = JSON.parse(html.slice(jsonStart, i + 1));
          captionTracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          description = pr?.videoDetails?.shortDescription || "";
        } catch { /* continue */ }
        break;
      }
    }
  }

  if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // Step 4: Pick the best caption track (prefer English)
  const track =
    captionTracks.find((t) => t.languageCode === "en") ||
    captionTracks.find((t) => t.languageCode?.startsWith("en")) ||
    captionTracks[0];

  if (!track?.baseUrl) throw new Error("No caption track URL");

  // Step 5: Fetch the transcript XML
  const xmlResp = await fetch(track.baseUrl);
  if (!xmlResp.ok) throw new Error("Failed to fetch transcript XML");
  const xml = await xmlResp.text();

  // Step 6: Parse the XML
  const transcript = parseTranscriptXml(xml);
  if (!transcript) throw new Error("Transcript was empty");

  return { title, description, transcript, url: resultUrl, videoId };
}
