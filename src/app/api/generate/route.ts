import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, buildYouTubePrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { validateLinkedInResult, type ValidationError } from "@/lib/validate";
import { PROVIDERS, buildAttempts, fetchWithTimeout, recordProviderFailure, clearProviderCooldown } from "@/lib/providers";
import { generateFullLinkedInResponse } from "@/lib/local-generator";
import { createThinkingFilter } from "@/lib/thinking-filter";
import { recordGenerationEvent } from "@/lib/analytics";
import type { VideoInfo, LinkedInResult } from "@/lib/types";

async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  videoInfo: VideoInfo,
  providerId?: string,
  modelId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const attempts = buildAttempts(providerId, modelId);

  if (attempts.length === 0) {
    const local = generateFullLinkedInResponse(videoInfo);
    return mockStream(encoder, JSON.stringify(local));
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
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        console.error(`Stream: Model ${attempt.model} (${attempt.provider.label}) failed: status=${response.status}`);
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
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ model: attempt.model, provider: attempt.provider.label })}\n\n`),
                        );
                        firstChunk = false;
                      }
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content: filtered })}\n\n`),
                      );
                    }
                  }
                } catch { /* skip malformed */ }
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error(`Stream error for model ${attempt.model}:`, e);
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
    const { videoInfo, timezone, audience, provider: providerId, model: modelId, stream: wantStream } = await req.json() as {
      videoInfo: VideoInfo;
      timezone: string;
      audience?: string;
      provider?: string;
      model?: string;
      stream?: boolean;
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

    if (wantStream === false) {
      const { result, validation } = await generateAndValidate(videoInfo, timezone, audience, providerId, modelId);
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
    const stream = await streamCompletion(SYSTEM_PROMPT, userPrompt, videoInfo, providerId, modelId);
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
  providerId?: string,
  modelId?: string,
): Promise<{ result: LinkedInResult; validation: ReturnType<typeof validateLinkedInResult> }> {
  const attempts = buildAttempts(providerId, modelId);
  const userPrompt = buildYouTubePrompt(videoInfo, timezone, audience);

  if (attempts.length === 0) {
    console.error("generateAndValidate: No providers available, using local generator");
    const localResult = generateFullLinkedInResponse(videoInfo);
    return { result: localResult, validation: validateLinkedInResult(localResult) };
  }

  console.log(`generateAndValidate: ${attempts.length} models to try, starting with ${attempts[0].model} (${attempts[0].provider.label})`);

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
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: false,
        }),
      });

      if (!response.ok) {
        console.error(`Model ${attempt.model} (${attempt.provider.label}) returned status ${response.status}`);
        recordProviderFailure(attempt.provider.id);
        continue;
      }

      clearProviderCooldown(attempt.provider.id);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        console.error(`Model ${attempt.model} returned no content string`);
        continue;
      }

      const result = parseAIResponse(content);
      if (!result) {
        console.error(`Model ${attempt.model} response failed JSON parsing, preview:`, content.substring(0, 300));
        continue;
      }

      const validation = validateLinkedInResult(result);

      if (!validation.valid) {
        const retryPrompt = buildValidationFeedbackPrompt(userPrompt, validation.errors);
        const retryResponse = await fetchWithTimeout(attempt.provider.baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${attempt.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: attempt.model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: retryPrompt },
            ],
            temperature: 0.7,
          max_tokens: 4000,
            stream: false,
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryContent = retryData.choices?.[0]?.message?.content;
          if (typeof retryContent === "string") {
            const retryResult = parseAIResponse(retryContent);
            if (retryResult) {
              return { result: retryResult, validation: validateLinkedInResult(retryResult) };
            }
          }
        }
      }

      return { result, validation };
    } catch (e) {
      console.error(`Error with model ${attempt.model}:`, e);
      continue;
    }
  }

  const fallback = generateFullLinkedInResponse(videoInfo);
  return { result: fallback, validation: validateLinkedInResult(fallback) };
}
