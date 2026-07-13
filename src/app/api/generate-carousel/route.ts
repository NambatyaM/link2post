import { NextRequest } from "next/server";
import { CAROUSEL_SYSTEM_PROMPT, buildCarouselPrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { resolveProviderAndModel } from "@/lib/providers";
import type { VideoInfo, CarouselSlide } from "@/lib/types";

function parseCarouselResponse(raw: string): CarouselSlide[] | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  function sanitize(slides: Record<string, unknown>[]): CarouselSlide[] | null {
    if (!Array.isArray(slides) || slides.length < 5) return null;
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

    if (!videoInfo?.transcript || videoInfo.transcript.length < 100) {
      return Response.json({ error: "Transcript is too short or missing." }, { status: 400 });
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
      return Response.json({ error: "Rate limit exceeded." }, { status: 429, headers: getRateLimitHeaders(rateResult) });
    }

    await recordGeneration({ userId, deviceId }).catch(() => {});

    const resolved = resolveProviderAndModel(providerId, modelId);
    if (!resolved) {
      return Response.json(
        { error: "No AI provider available. Please configure an API key." },
        { status: 503, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const { provider, model: defaultModel, apiKey } = resolved;
    const modelsToTry = [defaultModel, ...provider.models.filter((m) => m.id !== defaultModel).map((m) => m.id)];
    const userPrompt = buildCarouselPrompt(videoInfo);

    for (const mdl of modelsToTry) {
      try {
        const response = await fetch(provider.baseUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: mdl,
            messages: [
              { role: "system", content: CAROUSEL_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
            stream: false,
          }),
        });

        if (!response.ok) continue;
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== "string") continue;

        const slides = parseCarouselResponse(content);
        if (slides) {
          return Response.json({ slides }, { headers: getRateLimitHeaders(rateResult) });
        }
      } catch { continue; }
    }

    return Response.json(
      { error: "Carousel generation failed. Please try again." },
      { status: 500, headers: getRateLimitHeaders(rateResult) },
    );
  } catch (error) {
    console.error("Generate carousel error:", error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
