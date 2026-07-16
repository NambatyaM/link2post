import { NextRequest } from "next/server";
import {
  extractVoiceProfile,
  formatVoiceProfileForPrompt,
} from "@/services/linkedin/voice-extractor";
import { extractBearerToken, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { posts: rawPosts, csvData } = (await req.json()) as {
      posts?: string;
      csvData?: string;
    };

    let posts: string[] = [];

    if (csvData) {
      const { parseLinkedInCSV } = await import("@/services/linkedin/csv-parser");
      const csvPosts = parseLinkedInCSV(csvData);
      posts = csvPosts
        .split(/\n\n---+\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 30);
    } else if (rawPosts) {
      posts = rawPosts
        .split(/(?:^|\n)---+\s*\n|^\s*===+\s*\n/gm)
        .map((p) => p.trim())
        .filter((p) => p.length > 30);
    }

    if (posts.length === 0) {
      return Response.json(
        { error: "No valid posts found. Please paste your posts separated by --- or upload a CSV file." },
        { status: 400 },
      );
    }

    const token = extractBearerToken(req);
    if (token) {
      const user = await verifyToken(token);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const voiceProfile = await extractVoiceProfile(posts);
    const voiceProfilePrompt = formatVoiceProfileForPrompt(voiceProfile);

    return Response.json({
      postCount: posts.length,
      voiceProfile,
      voiceProfilePrompt,
      postSamples: posts.slice(0, 3).map((p) => p.slice(0, 300)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze posts";
    return Response.json({ error: message }, { status: 500 });
  }
}
