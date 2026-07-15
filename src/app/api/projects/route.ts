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

    const { data, error } = await supabase
      .from("projects")
      .select("id, title, status, niche, audience, created_at")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Projects list error:", error);
      return Response.json({ error: "Failed to fetch projects" }, { status: 500 });
    }

    return Response.json({ projects: data });
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

    const { title, transcript, niche, audience } = await req.json() as {
      title?: string;
      transcript?: string;
      niche?: string;
      audience?: string;
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
        status: "processing",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Project create error:", error);
      return Response.json({ error: "Failed to create project" }, { status: 500 });
    }

    return Response.json({ project_id: data.id, status: "processing" }, { status: 201 });
  } catch (error) {
    console.error("Project create error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
