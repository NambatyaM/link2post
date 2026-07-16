import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, buildRegeneratePrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { buildAttempts, fetchWithTimeout, recordProviderFailure, clearProviderCooldown } from "@/lib/providers";
import { createThinkingFilter } from "@/lib/thinking-filter";
import { recordGenerationEvent } from "@/lib/analytics";

async function streamCompletion(
  prompt: string,
  providerId?: string,
  modelId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const attempts = buildAttempts(providerId, modelId);

  if (attempts.length === 0) {
    return mockStream(encoder, `Mock regenerated content for: ${prompt.slice(0, 100)}`);
  }

  for (const attempt of attempts) {
    try {
      const response = await fetchWithTimeout(attempt.provider.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${attempt.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 16000,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        console.error(`Regenerate stream: ${attempt.model} (${attempt.provider.label}) failed: ${response.status}`);
        recordProviderFailure(attempt.provider.id);
        continue;
      }

      clearProviderCooldown(attempt.provider.id);

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
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === "string" && content.length > 0) {
                    const filtered = filterThinking(content);
                    if (filtered.length > 0) {
                      if (firstChunk) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: attempt.model, provider: attempt.provider.label })}\n\n`));
                        firstChunk = false;
                      }
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: filtered })}\n\n`));
                    }
                  }
                } catch { /* skip */ }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });
      return stream;
    } catch { continue; }
  }

  return mockStream(encoder, "Regenerated content (all models failed, using mock)");
}

async function generateComplete(
  prompt: string,
  providerId?: string,
  modelId?: string,
): Promise<string | null> {
  const attempts = buildAttempts(providerId, modelId);

  for (const attempt of attempts) {
    try {
      const response = await fetchWithTimeout(attempt.provider.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${attempt.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 16000,
          stream: false,
        }),
      });

      if (!response.ok) {
        console.error(`Regenerate complete: ${attempt.model} (${attempt.provider.label}) failed: ${response.status}`);
        recordProviderFailure(attempt.provider.id);
        continue;
      }
      clearProviderCooldown(attempt.provider.id);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim().length > 0) return content;
    } catch { continue; }
  }
  return null;
}

function mockStream(encoder: TextEncoder, content: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { type, sourceContent, videoTitle, provider: providerId, model: modelId, stream: wantStream } = await req.json() as {
      type: string;
      sourceContent: string;
      videoTitle: string;
      provider?: string;
      model?: string;
      stream?: boolean;
    };

    if (!type || !sourceContent || !videoTitle) {
      return Response.json({ error: "Missing type, sourceContent, or videoTitle." }, { status: 400 });
    }

    if (type !== "post" && type !== "article") {
      return Response.json({ error: "Type must be 'post' or 'article'." }, { status: 400 });
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

    const prompt = buildRegeneratePrompt(type, sourceContent, videoTitle);

    if (wantStream === false) {
      const content = await generateComplete(prompt, providerId, modelId);
      const durationMs = Date.now() - genStart;
      recordGenerationEvent({
        userId, deviceId, generationType: "regenerate",
        providerId, modelId, success: !!content, durationMs,
      }).catch(() => {});
      if (!content) {
        return Response.json({ content: `Regenerated content for: ${sourceContent.slice(0, 100)}` }, {
          status: 200,
          headers: getRateLimitHeaders(rateResult),
        });
      }
      return Response.json({ content }, {
        status: 200,
        headers: getRateLimitHeaders(rateResult),
      });
    }

    const stream = await streamCompletion(prompt, providerId, modelId);
    const durationMs = Date.now() - genStart;
    recordGenerationEvent({
      userId, deviceId, generationType: "regenerate",
      providerId, modelId, success: true, durationMs,
    }).catch(() => {});

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        ...getRateLimitHeaders(rateResult),
      },
    });
  } catch (error) {
    console.error("Regenerate error:", error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
