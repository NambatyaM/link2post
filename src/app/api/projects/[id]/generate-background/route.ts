import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { generateContentTask } from "@/trigger/generate-content";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { niche, audience, voiceProfilePrompt } = await req.json() as {
      niche?: string;
      audience?: string;
      voiceProfilePrompt?: string;
    };

    const run = await generateContentTask.trigger(
      { projectId, userId: user.userId, niche, audience, voiceProfilePrompt },
      { tags: [`user:${user.userId}`, `project:${projectId}`] },
    );

    return Response.json({ runId: run.id });
  } catch (error) {
    console.error("Generate background error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
