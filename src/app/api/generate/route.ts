import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, PROMPTS, buildYouTubePrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { validateLinkedInResult, type ValidationError } from "@/lib/validate";
import { recordProviderFailure, clearProviderCooldown } from "@/lib/providers";
import { generateFullLinkedInResponse } from "@/lib/local-generator";
import { createThinkingFilter } from "@/lib/thinking-filter";
import { recordGenerationEvent } from "@/lib/analytics";
import { getRouteForTask, routeTask } from "@/services/ai";
import { getProviderBaseUrl, getProviderApiKey, getProviderHeaders, parseSSEChunk } from "@/services/ai/providers/shared";
import type { VideoInfo, LinkedInResult, ContentType } from "@/lib/types";
import type { TaskType } from "@/services/ai/types";

async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  videoInfo: VideoInfo,
  taskType: TaskType = "post_generation",
  providerId?: string,
  modelId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  // Use AI Router for provider selection with failover
  const routes = getRouteForTask(taskType);

  if (routes.length === 0) {
    const local = generateFullLinkedInResponse(videoInfo);
    return mockStream(encoder, JSON.stringify(local));
  }

  // If specific provider requested, try it first then fall back to router
  const orderedRoutes = [...routes];
  if (providerId && modelId) {
    const idx = orderedRoutes.findIndex(
      (r) => r.provider === providerId && r.model === modelId,
    );
    if (idx > 0) {
      const [moved] = orderedRoutes.splice(idx, 1);
      orderedRoutes.unshift(moved);
    }
  }

  for (const route of orderedRoutes) {
    try {
      // Build the request body using the provider's expected format
      const baseUrl = getProviderBaseUrl(route.provider);
      const apiKey = getProviderApiKey(route.provider);
      if (!apiKey) continue;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(baseUrl, {
              signal: controller.signal,
              method: "POST",
              headers: getProviderHeaders(route.provider, apiKey),
        body: JSON.stringify({
          model: route.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 8000,
          stream: true,
        }),
      });
      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        console.error(`[ai-router] Stream: ${route.provider}/${route.model} failed: status=${response.status}`);
        recordProviderFailure(route.provider);
        continue;
      }

      clearProviderCooldown(route.provider);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;
      const filterThinking = createThinkingFilter();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                const result = parseSSEChunk(line);
                if (result.done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }
                if (result.content) {
                  const filtered = filterThinking(result.content);
                  if (filtered.length > 0) {
                    if (firstChunk) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ model: route.model, provider: route.provider })}\n\n`),
                      );
                      firstChunk = false;
                    }
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: filtered })}\n\n`),
                    );
                  }
                }
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error(`[ai-router] Stream error for ${route.provider}/${route.model}:`, e);
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });

      return stream;
    } catch {
      continue;
    }
  }

  const local = generateFullLinkedInResponse(videoInfo);
  return mockStream(encoder, JSON.stringify(local));
}

function mockStream(
  encoder: TextEncoder,
  content: string,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

function parseAIResponse(raw: string): LinkedInResult | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try { return JSON.parse(cleaned) as LinkedInResult; } catch { /* */ }
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try { return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as LinkedInResult; } catch { /* */ }
  }
  return null;
}

function buildValidationFeedbackPrompt(
  originalPrompt: string,
  errors: ValidationError[],
): string {
  const errorList = errors
    .map((e) => `- [${e.type} ${e.index >= 0 ? `#${e.index + 1}` : ""}] ${e.field}: ${e.message}`)
    .join("\n");

  return `${originalPrompt}

---VALIDATION ERRORS TO FIX---

The previous response had these issues. Regenerate the COMPLETE response fixing ALL of these:

${errorList}

CRITICAL FIXES:
- Posts MUST be 1,000-1,300 characters (count carefully, not words)
- Posts MUST hook with a number, question, or contrarian word in the first 40 characters
- Posts MUST NOT end with generic CTAs like "Thoughts?" or "Agree?"
- Articles MUST be 800-1,500 words with [IMAGE PROMPT N] markers at section breaks
- All image prompts must be specific and visual, not generic

Return the complete corrected JSON response now.`;
}

export async function POST(req: NextRequest) {
  try {
    const { videoInfo, timezone, audience, provider: providerId, model: modelId, stream: wantStream, contentType } = await req.json() as {
      videoInfo: VideoInfo;
      timezone: string;
      audience?: string;
      provider?: string;
      model?: string;
      stream?: boolean;
      contentType?: ContentType;
    };

    if (!videoInfo?.transcript || videoInfo.transcript.length < 100) {
      return Response.json(
        { error: "Video transcript is too short or missing." },
        { status: 400 },
      );
    }

    let userId: string | undefined;
    let plan: "anonymous" | "free" | "starter" | "pro" = "anonymous";

    const token = extractBearerToken(req);
    const deviceId = req.headers.get("x-device-id") || undefined;

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        userId = user.userId;
        plan = "free";
      }
    }

    const rateResult = await checkRateLimit({ userId, deviceId, plan });

    if (!rateResult.allowed) {
      return Response.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    await recordGeneration({ userId, deviceId }).catch(() => {});

    const genStart = Date.now();

    // --- Plain text dispatch for carousel and script ---
    if (contentType === "carousel" || contentType === "script") {
      const prompt = PROMPTS[contentType].replace("{transcript}", videoInfo.transcript);
      const taskType: TaskType = contentType === "carousel" ? "carousel_generation" : "post_generation";

      try {
        const result = await routeTask(taskType, prompt, SYSTEM_PROMPT);
        const durationMs = Date.now() - genStart;
        recordGenerationEvent({
          userId, deviceId, generationType: contentType,
          providerId: result.provider, modelId: result.model, success: true, durationMs,
        }).catch(() => {});

        return Response.json({ output: result.content }, { headers: getRateLimitHeaders(rateResult) });
      } catch {
        const durationMs = Date.now() - genStart;
        recordGenerationEvent({
          userId, deviceId, generationType: contentType,
          providerId: "none", modelId: "none", success: false, durationMs,
        }).catch(() => {});

        return Response.json(
          { error: "Generation failed. Please try again." },
          { status: 500 },
        );
      }
    }

    // --- Existing JSON flow for post / article (or no contentType) ---

    if (wantStream === false) {
      const { result, validation } = await generateAndValidate(videoInfo, timezone, audience);
      const durationMs = Date.now() - genStart;
      recordGenerationEvent({
        userId, deviceId, generationType: "calendar",
        providerId, modelId, success: true, durationMs,
      }).catch(() => {});
      const responseHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(rateResult),
      };
      return Response.json({ result, validation }, { status: 200, headers: responseHeaders });
    }

    const userPrompt = buildYouTubePrompt(videoInfo, timezone, audience);
    const stream = await streamCompletion(SYSTEM_PROMPT, userPrompt, videoInfo, "content_calendar", providerId, modelId);
    const durationMs = Date.now() - genStart;
    recordGenerationEvent({
      userId, deviceId, generationType: "calendar",
      providerId, modelId, success: true, durationMs,
    }).catch(() => {});

    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...getRateLimitHeaders(rateResult),
    };

    return new Response(stream, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error("Generate error:", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function generateAndValidate(
  videoInfo: VideoInfo,
  timezone: string,
  audience?: string,
): Promise<{ result: LinkedInResult; validation: ReturnType<typeof validateLinkedInResult> }> {
  const userPrompt = buildYouTubePrompt(videoInfo, timezone, audience);

  try {
    const routeResult = await routeTask("content_calendar", userPrompt, SYSTEM_PROMPT);
    console.log(`generateAndValidate: Success via ${routeResult.provider}/${routeResult.model} in ${routeResult.latencyMs}ms`);

    const result = parseAIResponse(routeResult.content);
    if (!result) {
      console.error("generateAndValidate: Failed to parse AI response");
      const localResult = generateFullLinkedInResponse(videoInfo);
      return { result: localResult, validation: validateLinkedInResult(localResult) };
    }

    const validation = validateLinkedInResult(result);
    return { result, validation };
  } catch (e) {
    console.error("generateAndValidate: AI Router failed, falling back to local generator:", e);
    const localResult = generateFullLinkedInResponse(videoInfo);
    return { result: localResult, validation: validateLinkedInResult(localResult) };
  }
}
