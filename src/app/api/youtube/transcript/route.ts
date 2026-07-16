import { NextRequest } from "next/server";
import { extractYouTubeTranscript } from "@/services/youtube/transcript";
import { extractBearerToken, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    const token = extractBearerToken(req);
    if (token) {
      const user = await verifyToken(token);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await extractYouTubeTranscript(url);

    return Response.json({
      videoId: result.videoId,
      title: result.title,
      transcript: result.transcript,
      charCount: result.transcript.length,
      wordCount: result.transcript.split(/\s+/).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to extract transcript";
    return Response.json({ error: message }, { status: 400 });
  }
}
