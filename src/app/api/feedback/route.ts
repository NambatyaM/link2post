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

    const { postId, rating } = await req.json() as { postId?: string; rating?: "up" | "down" };

    if (!postId || !rating) {
      return Response.json({ error: "postId and rating are required" }, { status: 400 });
    }

    const supabase = getSupabaseServer(req, token);
    const { error } = await supabase.from("post_feedback").upsert({
      post_id: postId,
      user_id: user.userId,
      rating,
      updated_at: new Date().toISOString(),
    }, { onConflict: "post_id,user_id" });

    if (error) {
      console.error("[feedback] Failed to save:", error);
      return Response.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[feedback] Error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
