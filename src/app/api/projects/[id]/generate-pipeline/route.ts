import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildPostsPrompt,
  buildArticlesCalendarPrompt,
} from "@/lib/prompts";
import { getProviderBaseUrl, getProviderApiKey, getProviderHeaders } from "@/services/ai/providers/shared";
import type { VideoInfo } from "@/lib/types";
import { generateFullLinkedInResponse } from "@/lib/local-generator";

export const maxDuration = 120;

const CALL_TIMEOUT_MS = 10_000;

function parseJsonResponse<T>(raw: string): T | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try { return JSON.parse(cleaned) as T; } catch {
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as T; } catch { return null; }
    }
    return null;
  }
}

function getAvailableProviders(): Array<{ id: string; model: string }> {
  const providers: Array<{ id: string; model: string }> = [];
  const tryProviders = [
    { id: "gemini", model: "gemini-2.0-flash", envKey: "GEMINI_API_KEY" },
    { id: "groq", model: "llama-3.3-70b-versatile", envKey: "GROQ_API_KEY" },
    { id: "openrouter", model: "qwen/qwen-2.5-72b-instruct", envKey: "OPENROUTER_API_KEY" },
    { id: "cerebras", model: "llama-3.3-70b", envKey: "CEREBRAS_API_KEY" },
    { id: "mistral", model: "mistral-small-latest", envKey: "MISTRAL_API_KEY" },
    { id: "tokengo", model: "deepseek-v4-flash", envKey: "THORBASE_API_KEY" },
  ];
  for (const p of tryProviders) {
    if (process.env[p.envKey]) providers.push({ id: p.id, model: p.model });
  }
  return providers;
}

async function callAI(
  taskLabel: string,
  providers: Array<{ id: string; model: string }>,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<{ content: string; provider: string; model: string; latencyMs: number }> {
  const errors: string[] = [];

  for (const provider of providers) {
    const baseUrl = getProviderBaseUrl(provider.id);
    const apiKey = getProviderApiKey(provider.id);
    if (!apiKey) {
      errors.push(`${provider.id}: no API key`);
      continue;
    }

    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

    try {
      console.log(`[pipeline:${taskLabel}] Trying ${provider.id}/${provider.model}`);
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: getProviderHeaders(provider.id, apiKey),
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        errors.push(`${provider.id}: HTTP ${response.status} ${errText.slice(0, 100)}`);
        console.warn(`[pipeline:${taskLabel}] ${provider.id} HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - start;

      if (!content.trim()) {
        errors.push(`${provider.id}: empty content`);
        continue;
      }

      console.log(`[pipeline:${taskLabel}] Success: ${provider.id}/${provider.model} in ${latencyMs}ms`);
      return { content, provider: provider.id, model: provider.model, latencyMs };
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.id}: ${msg}`);
      console.warn(`[pipeline:${taskLabel}] ${provider.id} failed: ${msg}`);
    }
  }

  throw new Error(`[pipeline:${taskLabel}] All providers failed: ${errors.join("; ")}`);
}

async function savePosts(
  supabase: ReturnType<typeof getSupabaseServer>,
  projectId: string,
  userId: string,
  posts: Array<{ hook: string; body: string; imagePrompt: string; viralityScore?: number; authorityScore?: number; commentPotential?: number; readabilityScore?: number }>,
) {
  if (posts.length === 0) return;
  const rows = posts.map((p) => ({
    project_id: projectId, user_id: userId,
    content: p.hook + "\n\n" + p.body, hook: p.hook, post_type: "story",
    virality_score: p.viralityScore ?? 0, authority_score: p.authorityScore ?? 0,
    comment_potential: p.commentPotential ?? 0, readability_score: p.readabilityScore ?? 0,
    image_prompt: p.imagePrompt, status: "draft",
  }));
  await supabase.from("posts").insert(rows);
}

interface AnalysisResult {
  cleaned_transcript: string;
  voice_profile: Record<string, unknown>;
  ideas: Array<{
    title: string; insight: string; quote: string;
    viralityScore: number; authorityScore: number; commentPotential: number; suggestedType: string;
  }>;
}

interface PostsResult {
  posts: Array<{
    hook: string; body: string; imagePrompt: string; postType: string;
    viralityScore: number; authorityScore: number; commentPotential: number; readabilityScore: number;
  }>;
}

interface ArticlesCalendarResult {
  articles: Array<{ title: string; body: string; imagePrompts: string[] }>;
  carousel: { title: string; slides: Array<{ slideNumber: number; title: string; body: string; notes: string }> };
  calendar: Array<{ day: string; date: string; type: string; title: string; contentIndex: number; recommendedTime: string; note: string }>;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let projectId = "";
  let userId = "";
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    userId = userId;

    projectId = (await params).id;
    const { audience } = (await req.json()) as { audience?: string };

    const supabase = getSupabaseServer();
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
        { role: "system", content: SYSTEM_PROMPT },
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
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: postsPrompt },
    ];
    const articlesMessages = [
      { role: "system", content: SYSTEM_PROMPT },
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
    }

    // ═══════════════════════════════════════════════════════════════
    // SAVE & COMPLETE
    // ═══════════════════════════════════════════════════════════════
    await savePosts(supabase, projectId, userId, allContent.posts);
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
      const supabase = getSupabaseServer();
      await supabase.from("projects").update({ status: "failed" }).eq("id", projectId).eq("user_id", userId);
    } catch { /* */ }
    return Response.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 });
  }
}
