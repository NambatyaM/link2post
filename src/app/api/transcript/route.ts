import { NextRequest } from "next/server";
import { getSubtitles, getVideoDetails } from "youtube-caption-extractor";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
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

    const [details, subtitles] = await Promise.all([
      getVideoDetails({ videoID: videoId, lang: "en" }).catch(() => null),
      getSubtitles({ videoID: videoId, lang: "en" }).catch(() => []),
    ]);

    if (!details) {
      return Response.json(
        { error: "Could not fetch video details. The video may be private or unavailable." },
        { status: 404 },
      );
    }

    const transcript = subtitles.length > 0
      ? subtitles.map((s) => s.text).join(" ")
      : "";

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
