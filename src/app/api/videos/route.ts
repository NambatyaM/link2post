import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServer(req);

    const { data: videos, error } = await supabase
      .from("videos")
      .select(`
        id, title, url, video_id, created_at,
        calendar_items!calendar_items_video_id_fkey ( id )
      `)
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Videos list error:", error);
      return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
    }

    const result = (videos || []).map((v) => ({
      id: v.id,
      title: v.title,
      url: v.url,
      videoId: v.video_id,
      createdAt: v.created_at,
      itemCount: Array.isArray(v.calendar_items) ? v.calendar_items.length : 0,
    }));

    return Response.json({ videos: result });
  } catch (error) {
    console.error("Videos list error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
