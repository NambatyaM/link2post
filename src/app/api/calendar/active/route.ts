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

    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (videoError || !video) {
      return Response.json({ video: null, items: [] });
    }

    const { data: items, error: itemsError } = await supabase
      .from("calendar_items")
      .select("*")
      .eq("video_id", video.id)
      .order("content_index", { ascending: true });

    if (itemsError) {
      return Response.json({ video, items: [] });
    }

    return Response.json({ video, items: items || [] });
  } catch (error) {
    console.error("Calendar active error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
