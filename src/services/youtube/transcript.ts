import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptResult {
  title: string;
  transcript: string;
  videoId: string;
  url: string;
  durationMs: number;
}

function extractVideoId(url: string): string | null {
  // Handle all YouTube URL formats:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function extractYouTubeTranscript(url: string): Promise<TranscriptResult> {
  const start = Date.now();
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Could not extract video ID.");
  }

  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    // Combine all transcript segments into a single text
    const transcript = transcriptItems
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!transcript || transcript.length < 50) {
      throw new Error("Transcript is too short or unavailable for this video.");
    }

    // Try to get video title from the first few items or use videoId
    const title = `YouTube Video ${videoId}`;

    return {
      title,
      transcript,
      videoId,
      url,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to extract transcript: ${err.message}`);
    }
    throw new Error("Failed to extract transcript from YouTube video.");
  }
}

export { extractVideoId };
