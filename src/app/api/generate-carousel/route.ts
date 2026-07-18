import { NextRequest } from "next/server";
import { CAROUSEL_SYSTEM_PROMPT, buildCarouselPrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { buildAttempts, fetchWithTimeout, recordProviderFailure, clearProviderCooldown } from "@/lib/providers";
import { generateLocalCarousel } from "@/lib/local-generator";
import { recordGenerationEvent } from "@/lib/analytics";
import type { VideoInfo, CarouselSlide } from "@/lib/types";

function parseCarouselResponse(raw: string): CarouselSlide[] | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  function sanitize(slides: Record<string, unknown>[]): CarouselSlide[] | null {
    if (!Array.isArray(slides) || slides.length < 3) return null;
    return slides.map((s: Record<string, unknown>, i: number) => ({
      slideNumber: (s.slideNumber as number) || i + 1,
      title: String(s.title || "").slice(0, 100),
      body: String(s.body || "").slice(0, 500),
      notes: String(s.notes || ""),
    }));
  }

  try {
    const parsed = JSON.parse(cleaned);
    const result = sanitize(parsed.slides);
    if (result) return result;
  } catch { /* */ }

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      const result = sanitize(parsed.slides);
      if (result) return result;
    } catch { /* */ }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { videoInfo, provider: providerId, model: modelId } = await req.json() as {
      videoInfo: VideoInfo;
      provider?: string;
      model?: string;
    };

    if (!videoInfo?.transcript || videoInfo.transcript.trim().length === 0) {
      return Response.json({ error: "Transcript is missing." }, { status: 400 });
    }

    let userId: string | undefined;

    const token = extractBearerToken(req);
    const deviceId = req.headers.get("x-device-id") || undefined;

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        userId = user.userId;
      }
    }

    const rateResult = await checkRateLimit({ userId, deviceId });
    if (!rateResult.allowed) {
      return Response.json({ error: "Rate limit exceeded." }, { status: 429, headers: getRateLimitHeaders(rateResult) });
    }

    await recordGeneration({ userId, deviceId }).catch(() => {});
    const genStart = Date.now();

    const attempts = buildAttempts(providerId, modelId);
    const userPrompt = buildCarouselPrompt(videoInfo);

    if (attempts.length === 0) {
      const local = generateLocalCarousel(videoInfo);
      recordGenerationEvent({
        userId, deviceId, generationType: "carousel",
        providerId: "local", modelId: "local", success: true, durationMs: 0,
      }).catch(() => {});
      return Response.json(
        { slides: local },
        { status: 200, headers: getRateLimitHeaders(rateResult) },
      );
    }

    for (const attempt of attempts) {
      try {
        const response = await fetchWithTimeout(attempt.provider.baseUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${attempt.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: attempt.model,
            messages: [
              { role: "system", content: CAROUSEL_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 16000,
            stream: false,
          }),
        });

        if (!response.ok) {
          console.error(`Carousel: ${attempt.model} (${attempt.provider.label}) failed: ${response.status}`);
          recordProviderFailure(attempt.provider.id);
          continue;
        }
        clearProviderCooldown(attempt.provider.id);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== "string" || content.trim().length === 0) continue;

        const slides = parseCarouselResponse(content);
        if (slides) {
          const durationMs = Date.now() - genStart;
          recordGenerationEvent({
            userId, deviceId, generationType: "carousel",
            providerId: attempt.provider.id, modelId: attempt.model, success: true, durationMs,
          }).catch(() => {});
          return Response.json({ slides }, { headers: getRateLimitHeaders(rateResult) });
        }
      } catch { continue; }
    }

    const fallback = generateLocalCarousel(videoInfo);
    const durationMs = Date.now() - genStart;
    recordGenerationEvent({
      userId, deviceId, generationType: "carousel",
      providerId: "local", modelId: "local", success: true, durationMs,
    }).catch(() => {});
    return Response.json(
      { slides: fallback },
      { status: 200, headers: getRateLimitHeaders(rateResult) },
    );
  } catch (error) {
    console.error("Generate carousel error:", error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
