import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import { callOllamaWithStream, getModelForTask, getFallbackModel } from "@/services/ai/providers/ollama";
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

    // Verify user has access (optional: check project ownership)
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

    console.log(`[api/ai/stream] Task: ${body.task}, Model: ${model}, Fallback: ${fallbackModel}`);

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder();
    let fullContent = "";
    let usedFallback = false;
    let finalModel = model;
    let latencyMs = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const sendError = (error: string) => {
          sendEvent({ type: "error", error });
          controller.close();
        };

        const sendDone = (result: { content: string; model: string; latencyMs: number; fallback: boolean; promptTokens?: number; completionTokens?: number }) => {
          sendEvent({ type: "done", ...result });
          controller.close();
        };

        async function tryGenerate(useModel: string, isFallback: boolean) {
          try {
            const result = await callOllamaWithStream(
              useModel,
              body.messages,
              (chunk) => {
                fullContent += chunk;
                sendEvent({ type: "chunk", content: chunk });
              },
              {
                temperature,
                maxTokens,
                expectJson,
                timeoutMs,
              }
            );

            latencyMs = result.latencyMs;
            finalModel = useModel;
            usedFallback = isFallback;
            promptTokens = result.promptTokens || 0;
            completionTokens = result.completionTokens || 0;

            sendDone({
              content: result.content,
              model: finalModel,
              latencyMs,
              fallback: usedFallback,
              promptTokens,
              completionTokens,
            });
          } catch (err) {
            const error = err instanceof Error ? err.message : "Generation failed";
            if (!isFallback && useModel !== fallbackModel) {
              console.warn(`[api/ai/stream] Primary model ${useModel} failed: ${error}, trying fallback ${fallbackModel}`);
              sendEvent({ type: "fallback", from: useModel, to: fallbackModel, reason: error });
              await tryGenerate(fallbackModel, true);
            } else {
              console.error(`[api/ai/stream] Generation failed: ${error}`);
              sendError(error);
            }
          }
        }

        await tryGenerate(model, false);
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("[api/ai/stream] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}