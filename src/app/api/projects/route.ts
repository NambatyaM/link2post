import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const includePosts = url.searchParams.get("include") === "posts";

    const supabase = getSupabaseServer(req, token);

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, user_id, title, raw_transcript, status, niche, audience, goals, created_at")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false });

    if (projectsError) {
      console.error("Projects list error:", projectsError);
      return Response.json({ error: "Failed to fetch projects" }, { status: 500 });
    }

    const projectIds = (projects || []).map((p) => p.id);

    let postCounts: Record<string, { total: number; draft: number; scheduled: number; published: number }> = {};
    if (projectIds.length > 0) {
      const { data: counts } = await supabase
        .from("posts")
        .select("project_id, status")
        .in("project_id", projectIds);

      if (counts) {
        for (const row of counts) {
          if (!postCounts[row.project_id]) {
            postCounts[row.project_id] = { total: 0, draft: 0, scheduled: 0, published: 0 };
          }
          postCounts[row.project_id].total++;
          if (row.status === "draft") postCounts[row.project_id].draft++;
          else if (row.status === "scheduled") postCounts[row.project_id].scheduled++;
          else if (row.status === "published") postCounts[row.project_id].published++;
        }
      }
    }

    const mapped = (projects || []).map((p) => ({
      id: p.id,
      userId: p.user_id,
      title: p.title,
      rawTranscript: p.raw_transcript,
      niche: p.niche,
      audience: p.audience,
      goals: p.goals,
      status: p.status,
      createdAt: p.created_at,
      postCount: postCounts[p.id]?.total || 0,
      draftCount: postCounts[p.id]?.draft || 0,
      scheduledCount: postCounts[p.id]?.scheduled || 0,
      publishedCount: postCounts[p.id]?.published || 0,
    }));

    let posts: Array<Record<string, unknown>> | null = null;
    if (includePosts && projectIds.length > 0) {
      const { data: allPosts } = await supabase
        .from("posts")
        .select("id, project_id, content, hook, post_type, virality_score, authority_score, comment_potential, readability_score, image_prompt, status, scheduled_date, published_at, created_at, updated_at, voice_consistency_score")
        .in("project_id", projectIds)
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false });

      if (allPosts) {
        const titleMap: Record<string, string> = {};
        for (const p of projects || []) {
          titleMap[p.id] = p.title;
        }
        posts = allPosts.map((p) => ({
          id: p.id,
          projectId: p.project_id,
          projectTitle: titleMap[p.project_id] || "Unknown",
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
      }
    }

    return Response.json({ projects: mapped, posts });
  } catch (error) {
    console.error("Projects list error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { title, transcript, niche, audience, goals } = await req.json() as {
      title?: string;
      transcript?: string;
      niche?: string;
      audience?: string;
      goals?: string;
    };

    if (!title || !transcript) {
      return Response.json({ error: "title and transcript are required" }, { status: 400 });
    }

    const supabase = getSupabaseServer(req, token);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.userId,
        title,
        raw_transcript: transcript,
        niche: niche || null,
        audience: audience || null,
        goals: goals || null,
        status: "processing",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Project create error:", error);
      return Response.json({ error: "Failed to create project" }, { status: 500 });
    }

    return Response.json({ project: { id: data.id }, status: "processing" }, { status: 201 });
  } catch (error) {
    console.error("Project create error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
