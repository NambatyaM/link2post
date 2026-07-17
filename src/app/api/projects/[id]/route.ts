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
    const supabase = getSupabaseServer(req);

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, title, raw_transcript, status, niche, audience, goals, created_at")
      .eq("id", id)
      .eq("user_id", user.userId)
      .single();

    if (projectError || !project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, project_id, user_id, content, hook, post_type, virality_score, authority_score, comment_potential, readability_score, image_prompt, status, scheduled_date, created_at")
      .eq("project_id", id)
      .eq("user_id", user.userId)
      .order("created_at", { ascending: true });

    if (postsError) {
      console.error("Posts fetch error:", postsError);
      return Response.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    const mappedProject = {
      id: project.id,
      userId: project.user_id,
      title: project.title,
      rawTranscript: project.raw_transcript,
      niche: project.niche,
      audience: project.audience,
      goals: project.goals,
      status: project.status,
      createdAt: project.created_at,
    };

    const mappedPosts = (posts || []).map((p) => ({
      id: p.id,
      projectId: p.project_id,
      userId: p.user_id,
      content: p.content,
      hook: p.hook,
      body: p.content?.split("\n\n").slice(1).join("\n\n") || "",
      postType: p.post_type,
      viralityScore: p.virality_score,
      authorityScore: p.authority_score,
      commentPotential: p.comment_potential,
      readabilityScore: p.readability_score,
      imagePrompt: p.image_prompt,
      status: p.status,
      scheduledDate: p.scheduled_date,
      createdAt: p.created_at,
    }));

    return Response.json({ project: mappedProject, posts: mappedPosts });
  } catch (error) {
    console.error("Project get error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const body = await req.json() as {
      title?: string;
      audience?: string;
      niche?: string;
      goals?: string;
      posts?: Array<{ hook: string; body: string; imagePrompt: string; viralityScore?: number; authorityScore?: number; commentPotential?: number; readabilityScore?: number; status?: string }>;
    };

    const supabase = getSupabaseServer(req);

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.userId)
      .single();

    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

    const projectUpdates: Record<string, string> = {};
    if (body.title !== undefined) projectUpdates.title = body.title;
    if (body.audience !== undefined) projectUpdates.audience = body.audience;
    if (body.niche !== undefined) projectUpdates.niche = body.niche;
    if (body.goals !== undefined) projectUpdates.goals = body.goals;

    if (Object.keys(projectUpdates).length > 0) {
      await supabase.from("projects").update(projectUpdates).eq("id", projectId).eq("user_id", user.userId);
    }

    if (body.posts) {
      await supabase
        .from("posts")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", user.userId);

      if (body.posts.length > 0) {
        const rows = body.posts.map((post) => ({
          project_id: projectId,
          user_id: user.userId,
          content: post.hook + "\n\n" + post.body,
          hook: post.hook,
          post_type: "story",
          virality_score: post.viralityScore ?? 0,
          authority_score: post.authorityScore ?? 0,
          comment_potential: post.commentPotential ?? 0,
          readability_score: post.readabilityScore ?? 0,
          image_prompt: post.imagePrompt,
          status: post.status || "draft",
        }));

        await supabase.from("posts").insert(rows);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Project PATCH error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const supabase = getSupabaseServer(req);

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.userId)
      .single();

    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

    await supabase.from("posts").delete().eq("project_id", projectId).eq("user_id", user.userId);
    await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user.userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Project DELETE error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
