import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { videoId } = await params;
    const supabase = getSupabaseServer(req);

    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .eq("user_id", user.userId)
      .single();

    if (videoError || !video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("calendar_items")
      .select("*")
      .eq("video_id", videoId)
      .order("content_index", { ascending: true });

    if (itemsError) {
      return Response.json({ video, items: [] });
    }

    return Response.json({ video, items: items || [] });
  } catch (error) {
    console.error("Calendar video error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
