import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { unauthorized } from "@/lib/with-auth";
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

const AI_TIMEOUT = 5_000;

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let projectId = "";
  let userId = "";
  try {
    const token = extractBearerToken(req);
    if (!token) return unauthorized();
    const user = await verifyToken(token);
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

    const supabase = getSupabaseServer(req, token);
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

    const videoInfo: VideoInfo = { title: project.title, description: "", transcript: project.raw_transcript, url: "", videoId: "" };
    const allContent = { posts: [] as PostsResult["posts"], articles: [] as ArticlesCalendarResult["articles"] };
    const providers = getAvailableProviders();
    const systemPrompt = voiceProfilePrompt
      ? `${voiceProfilePrompt}\n\n---\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT;

    let analysis: AnalysisResult | null = null;

    if (providers.length > 0) {
      try {
        const analysisPrompt = buildAnalysisPrompt(videoInfo);
        const analysisResult = await callAI("analysis", providers, [
          { role: "system", content: systemPrompt },
          { role: "user", content: analysisPrompt },
        ], AI_TIMEOUT);
        analysis = parseJsonResponse<AnalysisResult>(analysisResult.content);

        if (analysis && analysis.ideas.length > 0) {
          const postsPrompt = buildPostsPrompt(analysis.voice_profile, analysis.ideas, 5);
          const postsResult = await callAI("posts", providers, [
            { role: "system", content: systemPrompt },
            { role: "user", content: postsPrompt },
          ], AI_TIMEOUT).catch(() => null);

          if (postsResult) {
            const postsData = parseJsonResponse<PostsResult>(postsResult.content);
            if (postsData && postsData.posts.length > 0) {
              allContent.posts = postsData.posts;
            }
          }
        }
      } catch { /* fall through to local generator */ }
    }

    if (allContent.posts.length === 0) {
      console.log("[pipeline] AI failed or not configured — using local generator");
      const localResult = generateFullLinkedInResponse(videoInfo);
      allContent.posts = localResult.posts.map((p) => ({
        hook: p.hook, body: p.body, imagePrompt: p.imagePrompt,
        postType: "story" as const, viralityScore: 70, authorityScore: 65,
        commentPotential: 60, readabilityScore: 70,
      }));
      allContent.articles = localResult.articles.map((a) => ({
        title: a.title, body: a.body, imagePrompts: a.imagePrompts,
      }));
    } else if (analysis) {
      const articlesPrompt = buildArticlesCalendarPrompt(analysis.voice_profile, allContent.posts, analysis.ideas, 2);
      const articlesResult = await callAI("articles", providers, [
        { role: "system", content: systemPrompt },
        { role: "user", content: articlesPrompt },
      ], AI_TIMEOUT).catch(() => null);
      if (articlesResult) {
        const articlesData = parseJsonResponse<ArticlesCalendarResult>(articlesResult.content);
        if (articlesData?.articles) {
          allContent.articles = articlesData.articles;
        }
      }
    }

    console.log(`[pipeline] Generated: ${allContent.posts.length} posts, ${allContent.articles.length} articles`);

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
