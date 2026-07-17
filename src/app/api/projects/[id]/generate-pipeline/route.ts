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

const CALL_TIMEOUT_MS = 25_000;

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

async function saveGeneratedContent(
  supabase: ReturnType<typeof getSupabaseServer>,
  projectId: string,
  userId: string,
  rawContent: string,
  status: "completed" | "failed",
) {
  try {
    await supabase.from("projects").update({ status }).eq("id", projectId).eq("user_id", userId);
    if (status === "completed" && rawContent) {
      let parsed: { posts?: Array<{ hook: string; body: string; imagePrompt: string; viralityScore?: number; authorityScore?: number; commentPotential?: number; readabilityScore?: number }> } | null = null;
      try { parsed = JSON.parse(rawContent); } catch {
        const s = rawContent.indexOf("{");
        const e = rawContent.lastIndexOf("}");
        if (s !== -1 && e > s) try { parsed = JSON.parse(rawContent.slice(s, e + 1)); } catch { /* */ }
      }
      if (parsed?.posts) {
        const rows = parsed.posts.map((p) => ({
          project_id: projectId, user_id: userId,
          content: p.hook + "\n\n" + p.body, hook: p.hook, post_type: "story",
          virality_score: p.viralityScore ?? 0, authority_score: p.authorityScore ?? 0,
          comment_potential: p.commentPotential ?? 0, readability_score: p.readabilityScore ?? 0,
          image_prompt: p.imagePrompt, status: "draft",
        }));
        if (rows.length > 0) await supabase.from("posts").insert(rows);
      }
    }
  } catch (e) { console.error("saveGeneratedContent error:", e); }
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
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { audience } = (await req.json()) as { audience?: string };

    const supabase = getSupabaseServer();
    const { data: project, error: fetchError } = await supabase
      .from("projects").select("id, title, raw_transcript, status")
      .eq("id", projectId).eq("user_id", user.userId).single();

    if (fetchError || !project) return Response.json({ error: "Project not found" }, { status: 404 });
    if (project.status === "completed") return Response.json({ error: "Already completed" }, { status: 400 });

    const providers = getAvailableProviders();
    if (providers.length === 0) {
      return Response.json({ error: "No AI providers configured. Add GEMINI_API_KEY or GROQ_API_KEY to Vercel env vars." }, { status: 503 });
    }

    const videoInfo: VideoInfo = { title: project.title, description: "", transcript: project.raw_transcript, url: "", videoId: "" };
    const encoder = new TextEncoder();
    const allContent = { posts: [] as PostsResult["posts"], articles: [] as ArticlesCalendarResult["articles"] };

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // ═══════════════════════════════════════════════════════════════
          // CALL 1: Analysis
          // ═══════════════════════════════════════════════════════════════
          console.log("[pipeline] Call 1: Analysis starting");
          send({ step: "analysis", status: "started", message: "Analyzing transcript..." });

          const analysisPrompt = buildAnalysisPrompt(videoInfo);
          const analysisResult = await callAI("analysis", providers, [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: analysisPrompt },
          ], 6000);

          const analysis = parseJsonResponse<AnalysisResult>(analysisResult.content);
          if (!analysis || !analysis.ideas) throw new Error("Failed to parse analysis — no ideas found");

          console.log(`[pipeline] Call 1 done: ${analysisResult.provider}/${analysisResult.model} in ${analysisResult.latencyMs}ms, ${analysis.ideas.length} ideas`);
          send({
            step: "analysis", status: "completed",
            provider: analysisResult.provider, model: analysisResult.model, latencyMs: analysisResult.latencyMs,
            ideasCount: analysis.ideas.length, voiceProfile: analysis.voice_profile,
          });

          // ═══════════════════════════════════════════════════════════════
          // CALLS 2 & 3: Posts + Articles/Calendar (PARALLEL)
          // ═══════════════════════════════════════════════════════════════
          console.log("[pipeline] Calls 2 & 3: Parallel");
          send({ step: "posts", status: "started", message: "Generating posts..." });
          send({ step: "articles", status: "started", message: "Generating articles & calendar..." });

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
              send({
                step: "posts", status: "completed",
                provider: postsResult.provider, model: postsResult.model, latencyMs: postsResult.latencyMs,
                posts: postsData.posts,
              });
            }
          }

          if (articlesResult) {
            const articlesData = parseJsonResponse<ArticlesCalendarResult>(articlesResult.content);
            if (articlesData) {
              allContent.articles = articlesData.articles || [];
              console.log(`[pipeline] Call 3 done: ${articlesResult.provider}/${articlesResult.model} in ${articlesResult.latencyMs}ms`);
              send({
                step: "articles", status: "completed",
                provider: articlesResult.provider, model: articlesResult.model, latencyMs: articlesResult.latencyMs,
                articles: articlesData.articles, carousel: articlesData.carousel, calendar: articlesData.calendar,
              });
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // SAVE & COMPLETE
          // ═══════════════════════════════════════════════════════════════
          await saveGeneratedContent(supabase, projectId, user.userId, JSON.stringify({ posts: allContent.posts, articles: allContent.articles }), "completed");

          send({ step: "complete", status: "completed" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[pipeline] Fatal:", err);
          await saveGeneratedContent(supabase, projectId, user.userId, "", "failed");
          send({ step: "error", status: "failed", error: err instanceof Error ? err.message : "Generation failed" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("Pipeline error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
