import { NextRequest } from "next/server";
import { getSubtitles, getVideoDetails } from "youtube-caption-extractor";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const FETCH_TIMEOUT_MS = 10_000;

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

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchVideoDetails(videoId: string): Promise<{ title: string; description: string } | null> {
  try {
    const details = await getVideoDetails({ videoID: videoId, lang: "en" });
    if (details?.title) return { title: details.title, description: details.description || "" };
  } catch { /* continue */ }

  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      if (data.title) return { title: data.title, description: "" };
    }
  } catch { /* continue */ }

  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
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
  const langs = ["en", "en-US", "en-GB"];

  for (const lang of langs) {
    try {
      const subtitles = await getSubtitles({ videoID: videoId, lang });
      if (subtitles.length > 0) {
        return subtitles.map((s) => s.text).join(" ");
      }
    } catch { /* try next lang */ }
  }

  try {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/watch?v=${videoId}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } },
      15000,
    );
    if (res.ok) {
      const html = await res.text();

      const captionTracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionTracksMatch) {
        try {
          const tracks = JSON.parse(captionTracksMatch[1]);
          const enTrack = tracks.find((t: { languageCode: string }) => t.languageCode?.startsWith("en")) || tracks[0];
          if (enTrack?.baseUrl) {
            const captionRes = await fetchWithTimeout(enTrack.baseUrl, {}, 10000);
            if (captionRes.ok) {
              const xml = await captionRes.text();
              const texts = xml.match(/<text[^>]*>(.*?)<\/text>/g);
              if (texts && texts.length > 0) {
                return texts
                  .map((t) => t.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
                  .join(" ");
              }
            }
          }
        } catch { /* continue */ }
      }
    }
  } catch { /* continue */ }

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
          error: "No captions available for this video. Try a video with auto-generated or manual captions.",
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
