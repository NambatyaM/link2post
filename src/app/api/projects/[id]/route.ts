import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getSupabaseServer();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, raw_transcript, status, niche, audience, created_at")
      .eq("id", id)
      .eq("user_id", user.userId)
      .single();

    if (projectError || !project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, content, hook, post_type, virality_score, authority_score, comment_potential, readability_score, image_prompt, status, scheduled_date, created_at")
      .eq("project_id", id)
      .eq("user_id", user.userId)
      .order("created_at", { ascending: true });

    if (postsError) {
      console.error("Posts fetch error:", postsError);
      return Response.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    return Response.json({ project, posts: posts || [] });
  } catch (error) {
    console.error("Project get error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
