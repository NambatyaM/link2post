import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { unauthorized } from "@/lib/with-auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return unauthorized();
    const user = await verifyToken(token);
    if (!user) return unauthorized();

    const { rating, text, projectId } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const supabase = getSupabaseServer(req, token);
    const { error } = await supabase.from("beta_feedback").insert({
      user_id: user.userId,
      project_id: projectId || null,
      rating,
      text: text || "",
    });

    if (error) {
      console.error("[beta/feedback] Insert error:", error);
      return Response.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
