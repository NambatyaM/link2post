import { NextRequest } from "next/server";
import { authenticateRequest, unauthorized } from "@/lib/with-auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildPostsPrompt,
  buildArticlesCalendarPrompt,
} from "@/lib/prompts";
import type { VideoInfo } from "@/lib/types";
import { generateFullLinkedInResponse } from "@/lib/local-generator";
import { getAvailableProviders, callAI } from "@/lib/pipeline/orchestrator";
import { parseJsonResponse } from "@/lib/pipeline/parsers";
import { savePosts } from "@/lib/pipeline/saver";
import { GeneratePipelineParamsSchema, GeneratePipelineBodySchema } from "@/lib/pipeline/validation";
import type { AnalysisResult, PostsResult, ArticlesCalendarResult } from "@/lib/pipeline/types";

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let projectId = "";
  let userId = "";
  try {
    const user = await authenticateRequest(req);
    if (!user) return unauthorized();
    userId = user.userId;

    const rawParams = await params;
    const parsedParams = GeneratePipelineParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return Response.json({ error: "Invalid project ID", detail: parsedParams.error.flatten() }, { status: 400 });
    }
    projectId = parsedParams.data.id;

    const rawBody = await req.json();
    const parsedBody = GeneratePipelineBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return Response.json({ error: "Invalid request body", detail: parsedBody.error.flatten() }, { status: 400 });
    }
    const { voiceProfilePrompt } = parsedBody.data;

    const supabase = getSupabaseServer(req);
    const { data: project, error: fetchError } = await supabase
      .from("projects").select("id, title, raw_transcript, status")
      .eq("id", projectId).eq("user_id", userId).single();

    if (fetchError || !project) return Response.json({ error: "Project not found" }, { status: 404 });

    const { count: postCount } = await supabase
      .from("posts").select("id", { count: "exact", head: true })
      .eq("project_id", projectId).eq("user_id", userId);

    if (project.status === "completed" && (postCount ?? 0) > 0) {
      return Response.json({ error: "Already completed" }, { status: 400 });
    }

    if ((postCount ?? 0) > 0) {
      await supabase.from("posts").delete().eq("project_id", projectId).eq("user_id", userId);
    }

    await supabase.from("projects").update({ status: "processing" }).eq("id", projectId).eq("user_id", userId);

    const providers = getAvailableProviders();
    if (providers.length === 0) {
      return Response.json({ error: "No AI providers configured. Add GEMINI_API_KEY or GROQ_API_KEY to Vercel env vars." }, { status: 503 });
    }

    console.log(`[pipeline] Starting for project ${projectId}, providers: ${providers.map((p) => p.id).join(", ")}`);

    const videoInfo: VideoInfo = { title: project.title, description: "", transcript: project.raw_transcript, url: "", videoId: "" };
    const allContent = { posts: [] as PostsResult["posts"], articles: [] as ArticlesCalendarResult["articles"] };

    const systemPrompt = voiceProfilePrompt
      ? `${voiceProfilePrompt}\n\n---\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT;

    // ═══════════════════════════════════════════════════════════════
    // CALL 1: Analysis (with local fallback on total AI failure)
    // ═══════════════════════════════════════════════════════════════
    console.log("[pipeline] Call 1: Analysis starting");
    const analysisPrompt = buildAnalysisPrompt(videoInfo);
    let analysisResult: { content: string; provider: string; model: string; latencyMs: number };
    let analysis: AnalysisResult | null;
    let usedLocalFallback = false;

    try {
      analysisResult = await callAI("analysis", providers, [
        { role: "system", content: systemPrompt },
        { role: "user", content: analysisPrompt },
      ], 6000);

      analysis = parseJsonResponse<AnalysisResult>(analysisResult.content);
      if (!analysis || !analysis.ideas) {
        throw new Error("Failed to parse analysis response");
      }
      console.log(`[pipeline] Call 1 done: ${analysisResult.provider}/${analysisResult.model} in ${analysisResult.latencyMs}ms, ${analysis.ideas.length} ideas`);
    } catch (analysisError) {
      console.warn("[pipeline] All AI providers failed for analysis, falling back to local generator:", analysisError);
      const localResult = generateFullLinkedInResponse(videoInfo);
      analysis = {
        cleaned_transcript: videoInfo.transcript,
        voice_profile: {},
        ideas: localResult.posts.map((p, i) => ({
          title: p.hook.slice(0, 60),
          insight: p.body.slice(0, 200),
          quote: "",
          viralityScore: 70 + (i * 3) % 20,
          authorityScore: 65 + (i * 5) % 25,
          commentPotential: 60 + (i * 4) % 25,
          suggestedType: "story" as const,
        })),
      };
      analysisResult = { content: "", provider: "local", model: "fallback", latencyMs: 0 };
      usedLocalFallback = true;
      allContent.posts = localResult.posts.map((p) => ({
        hook: p.hook,
        body: p.body,
        imagePrompt: p.imagePrompt,
        postType: "story",
        viralityScore: 70,
        authorityScore: 65,
        commentPotential: 60,
        readabilityScore: 70,
      }));
      allContent.articles = localResult.articles.map((a) => ({
        title: a.title,
        body: a.body,
        imagePrompts: a.imagePrompts,
      }));
    }

    // ═══════════════════════════════════════════════════════════════
    // CALLS 2 & 3: Posts + Articles/Calendar (PARALLEL, skip if local fallback already provided content)
    // ═══════════════════════════════════════════════════════════════
    console.log("[pipeline] Calls 2 & 3: Parallel");

    if (usedLocalFallback) {
      console.log("[pipeline] Skipping AI Calls 2 & 3 — using local fallback content");
    } else {
      const postsPrompt = buildPostsPrompt(analysis.voice_profile, analysis.ideas, 5);
      const articlesPrompt = buildArticlesCalendarPrompt(analysis.voice_profile, [], analysis.ideas, 2);

      const postsMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: postsPrompt },
      ];
      const articlesMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: articlesPrompt },
      ];

      const [postsResult, articlesResult] = await Promise.all([
        callAI("posts", providers, postsMessages, 6000).catch((e) => { console.error("[pipeline] Posts failed:", e.message); return null; }),
        callAI("articles", providers, articlesMessages, 8000).catch((e) => { console.error("[pipeline] Articles failed:", e.message); return null; }),
      ]);

      if (postsResult) {
        const postsData = parseJsonResponse<PostsResult>(postsResult.content);
        if (postsData?.posts) {
          allContent.posts = postsData.posts;
          console.log(`[pipeline] Call 2 done: ${postsResult.provider}/${postsResult.model} in ${postsResult.latencyMs}ms, ${postsData.posts.length} posts`);
        }
      }

      if (articlesResult) {
        const articlesData = parseJsonResponse<ArticlesCalendarResult>(articlesResult.content);
        if (articlesData) {
          allContent.articles = articlesData.articles || [];
          console.log(`[pipeline] Call 3 done: ${articlesResult.provider}/${articlesResult.model} in ${articlesResult.latencyMs}ms`);
        }
      }

      // Fallback: if posts are empty but we have analysis data, supplement with local generator
      if (allContent.posts.length === 0) {
        console.warn("[pipeline] No posts from AI, using local generator fallback");
        const localResult = generateFullLinkedInResponse(videoInfo);
        allContent.posts = localResult.posts.map((p) => ({
          hook: p.hook, body: p.body, imagePrompt: p.imagePrompt,
          postType: "story", viralityScore: 70, authorityScore: 65,
          commentPotential: 60, readabilityScore: 70,
        }));
        if (allContent.articles.length === 0) {
          allContent.articles = localResult.articles.map((a) => ({
            title: a.title, body: a.body, imagePrompts: a.imagePrompts,
          }));
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SAVE & COMPLETE
    // ═══════════════════════════════════════════════════════════════
    try {
      await savePosts(supabase, projectId, userId, allContent.posts);
    } catch (saveError) {
      const msg = saveError instanceof Error ? saveError.message : "Failed to save posts";
      console.error("[pipeline] Save failed:", msg);
      await supabase.from("projects").update({ status: "failed" }).eq("id", projectId).eq("user_id", userId);
      return Response.json({ error: msg }, { status: 500 });
    }

    await supabase.from("projects").update({ status: "completed" }).eq("id", projectId).eq("user_id", userId);

    console.log(`[pipeline] Complete: ${allContent.posts.length} posts, ${allContent.articles.length} articles`);

    return Response.json({
      success: true,
      posts: allContent.posts,
      articles: allContent.articles,
    });
  } catch (error) {
    console.error("[pipeline] Fatal:", error);
    try {
      const supabase = getSupabaseServer(req);
      await supabase.from("projects").update({ status: "failed" }).eq("id", projectId).eq("user_id", userId);
    } catch { /* */ }
    return Response.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 });
  }
}
