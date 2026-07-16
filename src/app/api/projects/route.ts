import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServer();

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

    let postCounts: Record<string, number> = {};
    if (projectIds.length > 0) {
      const { data: counts } = await supabase
        .from("posts")
        .select("project_id")
        .in("project_id", projectIds);

      if (counts) {
        for (const row of counts) {
          postCounts[row.project_id] = (postCounts[row.project_id] || 0) + 1;
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
      postCount: postCounts[p.id] || 0,
    }));

    return Response.json({ projects: mapped });
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

    const supabase = getSupabaseServer();

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
