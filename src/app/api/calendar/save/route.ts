import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { LinkedInResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { videoUrl, videoTitle, videoId, transcript, result } = await req.json() as {
      videoUrl: string;
      videoTitle: string;
      videoId: string;
      transcript: string;
      result: LinkedInResult;
    };

    const supabase = getSupabaseServer();

    const { data: video, error: videoError } = await supabase
      .from("videos")
      .insert({
        user_id: user.userId,
        url: videoUrl,
        title: videoTitle,
        video_id: videoId,
        transcript,
      })
      .select("id")
      .single();

    if (videoError || !video) {
      console.error("Save video error:", videoError);
      return Response.json({ error: "Failed to save video" }, { status: 500 });
    }

    const calendarItems = [
      ...result.posts.map((post, i) => {
        const calEntry = result.calendar.find((c) => c.type === "post" && c.contentIndex === i);
        return {
          video_id: video.id,
          user_id: user.userId,
          type: "post" as const,
          day: calEntry?.day || "",
          recommended_time: calEntry?.recommendedTime || "",
          title: null,
          body: post.body,
          hook: post.hook,
          image_prompt: post.imagePrompt,
          image_prompts: null,
          content_index: i,
        };
      }),
      ...result.articles.map((article, i) => {
        const calEntry = result.calendar.find((c) => c.type === "article" && c.contentIndex === i);
        return {
          video_id: video.id,
          user_id: user.userId,
          type: "article" as const,
          day: calEntry?.day || "",
          recommended_time: calEntry?.recommendedTime || "",
          title: article.title,
          body: article.body,
          hook: null,
          image_prompt: null,
          image_prompts: article.imagePrompts,
          content_index: i,
        };
      }),
    ];

    const { error: itemsError } = await supabase
      .from("calendar_items")
      .insert(calendarItems);

    if (itemsError) {
      console.error("Save calendar items error:", itemsError);
      return Response.json({ error: "Failed to save calendar items" }, { status: 500 });
    }

    const now = new Date();
    const weekYear = now.getFullYear();
    const oneJan = new Date(weekYear, 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    const calendarWeek = `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;

    await supabase.from("generation_events").insert({
      user_id: user.userId,
      video_url: videoUrl,
      calendar_week: calendarWeek,
    });

    return Response.json({ videoId: video.id, itemCount: calendarItems.length });
  } catch (error) {
    console.error("Calendar save error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
