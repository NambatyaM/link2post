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
import { savePosts, saveArticles } from "@/lib/pipeline/saver";
import type { AnalysisResult, PostsResult, ArticlesCalendarResult } from "@/lib/pipeline/types";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";

const AI_MAX_TOKENS = 12_000;

export const maxDuration = 120;

function event(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

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
    projectId = rawParams.id;

    const rawBody = await req.json();
    const { voiceProfilePrompt, variation } = rawBody;

    const rateResult = await checkRateLimit({ userId });
    if (!rateResult.allowed) {
      return Response.json(
        { error: "Free limit reached. Upgrade for unlimited generation.", limit: rateResult.limit, retryAfterMs: rateResult.retryAfterMs },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

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

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          try { controller.enqueue(new TextEncoder().encode(event(data))); } catch { /* fully */ }
        };

        try {
          const videoInfo: VideoInfo = { title: project.title, description: "", transcript: project.raw_transcript, url: "", videoId: "" };
          const allContent = { posts: [] as PostsResult["posts"], articles: [] as ArticlesCalendarResult["articles"] };
          const providers = getAvailableProviders();
          const variationDirective = variation
            ? `\n\n---VARIATION SEED: ${variation}---\nIMPORTANT: Generate completely fresh content. Take a different angle than usual. If the source has multiple insights, pick different ones than last time. Change the hook style, narrative structure, and post type mix. This is a regeneration — do NOT produce the same content as before.\n`
            : "";
          const systemPrompt = voiceProfilePrompt
            ? `${voiceProfilePrompt}\n\n---\n\n${SYSTEM_PROMPT}${variationDirective}`
            : `${SYSTEM_PROMPT}${variationDirective}`;

          send({ stage: "analysis", status: "started" });

          if (providers.length > 0) {
            const analysisPrompt = buildAnalysisPrompt(videoInfo);
            const analysisResult = await callAI("analysis", providers, [
              { role: "system", content: systemPrompt },
              { role: "user", content: analysisPrompt },
            ], AI_MAX_TOKENS);

            const analysis = parseJsonResponse<AnalysisResult>(analysisResult.content);
            send({ stage: "analysis", status: "complete", ideas: analysis?.ideas?.length || 0 });

            if (analysis && analysis.ideas.length > 0) {
              send({ stage: "posts", status: "started" });

              const postsPrompt = buildPostsPrompt(analysis.voice_profile, analysis.ideas, 5);
              const postsResult = await callAI("posts", providers, [
                { role: "system", content: systemPrompt },
                { role: "user", content: postsPrompt },
              ], AI_MAX_TOKENS).catch(() => null);

              if (postsResult) {
                const postsData = parseJsonResponse<PostsResult>(postsResult.content);
                if (postsData && postsData.posts.length > 0) {
                  const validPosts = postsData.posts.filter(p => p.body.length >= 800);
                  send({ stage: "posts", status: "complete", total: postsData.posts.length, valid: validPosts.length });
                  if (validPosts.length >= 3) {
                    allContent.posts = validPosts;
                  }
                }
              }
            }
          }

          if (allContent.posts.length === 0) {
            send({ stage: "posts", status: "fallback" });
            const localResult = generateFullLinkedInResponse(videoInfo);
            allContent.posts = localResult.posts.map((p) => ({
              hook: p.hook, body: p.body, imagePrompt: p.imagePrompt,
              postType: "story" as const, viralityScore: 70, authorityScore: 65,
              commentPotential: 60, readabilityScore: 70,
              voiceConsistency: { toneMatch: 7, vocabularyMatch: 7, formattingMatch: 7, storytellingMatch: 7, overall: 7 },
            }));
            allContent.articles = localResult.articles.map((a) => ({
              title: a.title, body: a.body, imagePrompts: a.imagePrompts,
            }));
          } else {
            send({ stage: "articles", status: "started" });
            const articlesPrompt = buildArticlesCalendarPrompt({}, allContent.posts, [], 2);
            const articlesResult = await callAI("articles", providers, [
              { role: "system", content: systemPrompt },
              { role: "user", content: articlesPrompt },
            ], AI_MAX_TOKENS).catch(() => null);
            if (articlesResult) {
              const articlesData = parseJsonResponse<ArticlesCalendarResult>(articlesResult.content);
              if (articlesData?.articles) {
                allContent.articles = articlesData.articles;
              }
            }
            send({ stage: "articles", status: "complete", count: allContent.articles.length });
          }

          send({ stage: "saving", status: "started" });

          try {
            await savePosts(supabase, projectId, userId, allContent.posts);
            await saveArticles(supabase, projectId, userId, allContent.articles, allContent.posts.length);
          } catch (saveError) {
            await supabase.from("projects").update({ status: "failed" }).eq("id", projectId).eq("user_id", userId);
            send({ stage: "error", message: saveError instanceof Error ? saveError.message : "Failed to save" });
            controller.close();
            return;
          }

          await supabase.from("projects").update({ status: "completed" }).eq("id", projectId).eq("user_id", userId);
          await recordGeneration({ userId });

          send({ stage: "done", posts: allContent.posts, articles: allContent.articles });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Generation failed";
          send({ stage: "error", message: msg });
          try {
            const supabase = getSupabaseServer(req);
            await supabase.from("projects").update({ status: "failed" }).eq("id", projectId).eq("user_id", userId);
          } catch { /* */ }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
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
