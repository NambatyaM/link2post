import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildPostsPrompt,
  buildArticlesCalendarPrompt,
  buildYouTubePrompt,
} from "@/lib/prompts";
import { routeTask } from "@/services/ai";
import { createThinkingFilter } from "@/lib/thinking-filter";
import type { VideoInfo } from "@/lib/types";

function parseJsonResponse<T>(raw: string): T | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try {
        return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface AnalysisResult {
  cleaned_transcript: string;
  voice_profile: Record<string, unknown>;
  ideas: Array<{
    title: string;
    insight: string;
    quote: string;
    viralityScore: number;
    authorityScore: number;
    commentPotential: number;
    suggestedType: string;
  }>;
}

interface PostsResult {
  posts: Array<{
    hook: string;
    body: string;
    imagePrompt: string;
    postType: string;
    viralityScore: number;
    authorityScore: number;
    commentPotential: number;
    readabilityScore: number;
  }>;
}

interface ArticlesCalendarResult {
  articles: Array<{
    title: string;
    body: string;
    imagePrompts: string[];
  }>;
  carousel: {
    title: string;
    slides: Array<{
      slideNumber: number;
      title: string;
      body: string;
      notes: string;
    }>;
  };
  calendar: Array<{
    day: string;
    date: string;
    type: string;
    title: string;
    contentIndex: number;
    recommendedTime: string;
    note: string;
  }>;
}

async function saveGeneratedContent(
  supabase: ReturnType<typeof getSupabaseServer>,
  projectId: string,
  userId: string,
  rawContent: string,
  status: "completed" | "failed",
) {
  try {
    await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId)
      .eq("user_id", userId);

    if (status === "completed" && rawContent) {
      let parsed: {
        posts?: Array<{
          hook: string;
          body: string;
          imagePrompt: string;
          viralityScore?: number;
          authorityScore?: number;
          commentPotential?: number;
          readabilityScore?: number;
        }>;
      } | null = null;

      let cleaned = rawContent.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          try {
            parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
          } catch {
            /* */
          }
        }
      }

      if (parsed?.posts) {
        const rows = parsed.posts.map((post) => ({
          project_id: projectId,
          user_id: userId,
          content: post.hook + "\n\n" + post.body,
          hook: post.hook,
          post_type: "story",
          virality_score: post.viralityScore ?? 0,
          authority_score: post.authorityScore ?? 0,
          comment_potential: post.commentPotential ?? 0,
          readability_score: post.readabilityScore ?? 0,
          image_prompt: post.imagePrompt,
          status: "draft",
        }));

        if (rows.length > 0) {
          await supabase.from("posts").insert(rows);
        }
      }
    }
  } catch (e) {
    console.error("saveGeneratedContent error:", e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { audience, voiceProfilePrompt } = (await req.json()) as {
      audience?: string;
      voiceProfilePrompt?: string;
    };

    const supabase = getSupabaseServer();

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, title, raw_transcript, status")
      .eq("id", projectId)
      .eq("user_id", user.userId)
      .single();

    if (fetchError || !project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status === "completed") {
      return Response.json({ error: "Project already completed" }, { status: 400 });
    }

    const videoInfo: VideoInfo = {
      title: project.title,
      description: "",
      transcript: project.raw_transcript,
      url: "",
      videoId: "",
    };

    const encoder = new TextEncoder();
    const filterThinking = createThinkingFilter();
    const allContent = { posts: [] as PostsResult["posts"], articles: [] as ArticlesCalendarResult["articles"] };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ═══════════════════════════════════════════════════════════════
          // CALL 1: Transcript Analysis (Gemini)
          // ═══════════════════════════════════════════════════════════════
          console.log("[pipeline] Call 1: Transcript analysis starting");
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "analysis", status: "started", message: "Analyzing transcript..." })}\n\n`));

          const analysisPrompt = buildAnalysisPrompt(videoInfo);
          const analysisResult = await routeTask("transcript_analysis", analysisPrompt, SYSTEM_PROMPT);

          const analysis = parseJsonResponse<AnalysisResult>(analysisResult.content);
          if (!analysis) {
            throw new Error("Failed to parse analysis response");
          }

          console.log(`[pipeline] Call 1 complete: ${analysisResult.provider}/${analysisResult.model} in ${analysisResult.latencyMs}ms, ${analysis.ideas.length} ideas extracted`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            step: "analysis",
            status: "completed",
            provider: analysisResult.provider,
            model: analysisResult.model,
            latencyMs: analysisResult.latencyMs,
            ideasCount: analysis.ideas.length,
            voiceProfile: analysis.voice_profile,
          })}\n\n`));

          // ═══════════════════════════════════════════════════════════════
          // CALLS 2 & 3: Posts + Articles/Calendar (PARALLEL)
          // ═══════════════════════════════════════════════════════════════
          console.log("[pipeline] Calls 2 & 3: Posts + Articles/Calendar (parallel)");
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "posts", status: "started", message: "Generating posts..." })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "articles", status: "started", message: "Generating articles & calendar..." })}\n\n`));

          const postsPrompt = buildPostsPrompt(analysis.voice_profile, analysis.ideas, 5);
          const articlesPrompt = buildArticlesCalendarPrompt(
            analysis.voice_profile,
            [], // Posts not generated yet
            analysis.ideas,
            2,
          );

          const [postsResult, articlesResult] = await Promise.all([
            routeTask("posts_generation", postsPrompt, SYSTEM_PROMPT).catch((e) => {
              console.error("[pipeline] Posts generation failed:", e);
              return null;
            }),
            routeTask("articles_calendar_generation", articlesPrompt, SYSTEM_PROMPT).catch((e) => {
              console.error("[pipeline] Articles/calendar generation failed:", e);
              return null;
            }),
          ]);

          // Process posts result
          if (postsResult) {
            const postsData = parseJsonResponse<PostsResult>(postsResult.content);
            if (postsData?.posts) {
              allContent.posts = postsData.posts;
              console.log(`[pipeline] Call 2 complete: ${postsResult.provider}/${postsResult.model} in ${postsResult.latencyMs}ms, ${postsData.posts.length} posts`);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                step: "posts",
                status: "completed",
                provider: postsResult.provider,
                model: postsResult.model,
                latencyMs: postsResult.latencyMs,
                posts: postsData.posts,
              })}\n\n`));
            }
          }

          // Process articles/calendar result
          if (articlesResult) {
            const articlesData = parseJsonResponse<ArticlesCalendarResult>(articlesResult.content);
            if (articlesData) {
              allContent.articles = articlesData.articles || [];
              console.log(`[pipeline] Call 3 complete: ${articlesResult.provider}/${articlesResult.model} in ${articlesResult.latencyMs}ms`);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                step: "articles",
                status: "completed",
                provider: articlesResult.provider,
                model: articlesResult.model,
                latencyMs: articlesResult.latencyMs,
                articles: articlesData.articles,
                carousel: articlesData.carousel,
                calendar: articlesData.calendar,
              })}\n\n`));
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // SAVE & COMPLETE
          // ═══════════════════════════════════════════════════════════════
          const combinedJson = JSON.stringify({
            posts: allContent.posts,
            articles: allContent.articles,
          });

          await saveGeneratedContent(supabase, projectId, user.userId, combinedJson, "completed");

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "complete", status: "completed" })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[pipeline] Error:", err);
          await saveGeneratedContent(supabase, projectId, user.userId, "", "failed");
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "error", status: "failed", error: err instanceof Error ? err.message : "Generation failed" })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Pipeline generate error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
