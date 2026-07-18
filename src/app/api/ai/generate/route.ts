import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import { callOllama, getModelForTask, getFallbackModel } from "@/services/ai/providers/ollama";
import type { ChatMessage, TaskType } from "@/services/ai/types";

const VALID_TASKS: TaskType[] = [
  "transcript_processing",
  "brand_voice_learning",
  "post_generation",
  "article_generation",
  "carousel_generation",
  "rewrite_edit",
  "hook_generation",
  "content_calendar",
  "transcript_analysis",
  "posts_generation",
  "articles_calendar_generation",
];

interface GenerateRequest {
  task: TaskType;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  expectJson?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body: GenerateRequest = await req.json();

    if (!body.task || !VALID_TASKS.includes(body.task)) {
      return NextResponse.json({ error: "Invalid or missing task type" }, { status: 400 });
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Verify user has access
    const supabase = getSupabaseServer(req, token);
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.userId).single();
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const model = body.model || getModelForTask(body.task);
    const fallbackModel = getFallbackModel();
    const expectJson = body.expectJson ?? true;
    const temperature = body.temperature ?? 0.7;
    const maxTokens = body.maxTokens ?? 4096;
    const timeoutMs = 120_000;

    console.log(`[api/ai/generate] Task: ${body.task}, Model: ${model}, Fallback: ${fallbackModel}`);

    async function tryGenerate(useModel: string): Promise<{ content: string; model: string; latencyMs: number; promptTokens?: number; completionTokens?: number; fallback: boolean }> {
      try {
        const result = await callOllama(useModel, body.messages, {
          temperature,
          maxTokens,
          expectJson,
          timeoutMs,
        });

        return {
          content: result.content,
          model: useModel,
          latencyMs: result.latencyMs,
          fallback: false,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : "Generation failed";
        if (useModel !== fallbackModel && (error.includes("not found") || error.includes("404") || error.includes("model not found"))) {
          console.warn(`[api/ai/generate] Primary model ${useModel} failed: ${error}, trying fallback ${fallbackModel}`);
          const fallbackResult = await callOllama(fallbackModel, body.messages, {
            temperature,
            maxTokens,
            expectJson,
            timeoutMs,
          });
          return {
            content: fallbackResult.content,
            model: fallbackModel,
            latencyMs: fallbackResult.latencyMs,
            fallback: true,
          };
        }
        throw err;
      }
    }

    const result = await tryGenerate(model);

    return NextResponse.json({
      content: result.content,
      model: result.model,
      latencyMs: result.latencyMs,
      fallback: result.fallback,
    });
  } catch (err) {
    console.error("[api/ai/generate] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}