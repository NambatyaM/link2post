import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { postId, content, image_prompt, status } = await req.json() as {
      postId?: string;
      content?: string;
      image_prompt?: string;
      status?: string;
    };

    if (!postId) {
      return Response.json({ error: "postId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServer(req);

    const updates: Record<string, unknown> = {};
    if (content !== undefined) updates.content = content;
    if (image_prompt !== undefined) updates.image_prompt = image_prompt;
    if (status !== undefined) {
      if (!["draft", "approved", "archived"].includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId)
      .eq("project_id", projectId)
      .eq("user_id", user.userId)
      .select("id, content, hook, post_type, virality_score, authority_score, comment_potential, readability_score, image_prompt, status, scheduled_date, created_at")
      .single();

    if (error) {
      console.error("Post update error:", error);
      return Response.json({ error: "Failed to update post" }, { status: 500 });
    }

    return Response.json({ post: data });
  } catch (error) {
    console.error("Post update error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
