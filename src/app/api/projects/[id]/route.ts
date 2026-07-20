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
    const supabase = getSupabaseServer(req, token);

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, title, raw_transcript, status, niche, audience, goals, carousel_slides, created_at")
      .eq("id", id)
      .eq("user_id", user.userId)
      .single();

    if (projectError || !project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, project_id, user_id, content, hook, post_type, virality_score, authority_score, comment_potential, readability_score, image_prompt, status, scheduled_date, published_at, created_at, updated_at, voice_consistency_score")
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
      carouselSlides: project.carousel_slides,
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
      publishedAt: p.published_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      voiceConsistency: p.voice_consistency_score,
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
      carousel_slides?: unknown;
      posts?: Array<{ id?: string; hook: string; body: string; imagePrompt: string; postType?: string; viralityScore?: number; authorityScore?: number; commentPotential?: number; readabilityScore?: number; status?: string; scheduledDate?: string | null; publishedAt?: string | null; voiceConsistency?: unknown }>;
    };

    const supabase = getSupabaseServer(req, token);

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.userId)
      .single();

    if (!project) return Response.json({ error: "Not found" }, { status: 404 });

    const projectUpdates: Record<string, unknown> = {};
    if (body.title !== undefined) projectUpdates.title = body.title;
    if (body.audience !== undefined) projectUpdates.audience = body.audience;
    if (body.niche !== undefined) projectUpdates.niche = body.niche;
    if (body.goals !== undefined) projectUpdates.goals = body.goals;
    if (body.carousel_slides !== undefined) projectUpdates.carousel_slides = body.carousel_slides;

    if (Object.keys(projectUpdates).length > 0) {
      await supabase.from("projects").update(projectUpdates).eq("id", projectId).eq("user_id", user.userId);
    }

    if (body.posts) {
      const existingIds = body.posts.filter((p) => p.id).map((p) => p.id!);

      const { data: existingPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.userId);

      const existingIdSet = new Set((existingPosts || []).map((p) => p.id));

      const idsToKeep = new Set(existingIds.filter((id) => existingIdSet.has(id)));

      for (const id of existingIdSet) {
        if (!idsToKeep.has(id)) {
          await supabase.from("posts").delete().eq("id", id);
        }
      }

      for (const post of body.posts) {
        if (post.id && idsToKeep.has(post.id)) {
          await supabase.from("posts").update({
            content: post.hook + "\n\n" + post.body,
            hook: post.hook,
            post_type: post.postType || "story",
            virality_score: post.viralityScore ?? 0,
            authority_score: post.authorityScore ?? 0,
            comment_potential: post.commentPotential ?? 0,
            readability_score: post.readabilityScore ?? 0,
            image_prompt: post.imagePrompt,
            status: post.status || "draft",
            scheduled_date: post.scheduledDate || null,
            published_at: post.publishedAt || null,
            voice_consistency_score: post.voiceConsistency || null,
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);
        } else {
          await supabase.from("posts").insert({
            project_id: projectId,
            user_id: user.userId,
            content: post.hook + "\n\n" + post.body,
            hook: post.hook,
            post_type: post.postType || "story",
            virality_score: post.viralityScore ?? 0,
            authority_score: post.authorityScore ?? 0,
            comment_potential: post.commentPotential ?? 0,
            readability_score: post.readabilityScore ?? 0,
            image_prompt: post.imagePrompt,
            status: post.status || "draft",
            scheduled_date: post.scheduledDate || null,
            published_at: post.publishedAt || null,
            voice_consistency_score: post.voiceConsistency || null,
          });
        }
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
    const supabase = getSupabaseServer(req, token);

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
