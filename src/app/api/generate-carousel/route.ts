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
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length >= 5) {
      return parsed.slides as CarouselSlide[];
    }
  } catch { /* */ }
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length >= 5) {
        return parsed.slides as CarouselSlide[];
      }
    } catch { /* */ }
  }
  return null;
}

function generateMockCarousel(): CarouselSlide[] {
  return [
    { slideNumber: 1, title: "Stop Posting at the Wrong Time", body: "The data reveals a completely different optimal schedule for LinkedIn.", notes: "Bold title, dark background" },
    { slideNumber: 2, title: "The 10 AM Rule", body: "Professionals clear their inbox by 9:30. They take their first scroll break at 10 AM.", notes: "Clock visual" },
    { slideNumber: 3, title: "Wednesday Wins", body: "Wednesday at 4 PM outperforms every other time slot. The end-of-day scroll is real.", notes: "Calendar highlight" },
    { slideNumber: 4, title: "Character Count Matters", body: "1,000-1,300 characters is the sweet spot. Not words. Characters.", notes: "Number emphasis" },
    { slideNumber: 5, title: "Completion Rate > Word Count", body: "100% of 800 chars beats 30% of 3,000 chars. The algorithm rewards finishers.", notes: "Comparison visual" },
    { slideNumber: 6, title: "The Hook Contract", body: "Your first line is a promise. Either deliver on it or lose trust.", notes: "Magnifying glass" },
    { slideNumber: 7, title: "Specificity Wins", body: "'We fired our top performer. Revenue went up 40%.' beats 'Leadership is hard.'", notes: "Before/after" },
    { slideNumber: 8, title: "The 3-Post Framework", body: "Tuesday: insight. Wednesday: strongest piece. Thursday: takeaway. Done.", notes: "Framework visual" },
    { slideNumber: 9, title: "Consistency Compounds", body: "One viral post won't build your presence. 3 posts per week for 6 months will.", notes: "Growth curve" },
    { slideNumber: 10, title: "Save This for Later", body: "Follow for more data-backed content strategies. Share with someone who needs this.", notes: "CTA slide, bold" },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { videoInfo, provider: providerId, model: modelId } = await req.json() as {
      videoInfo: VideoInfo;
      provider?: string;
      model?: string;
    };

    if (!videoInfo?.transcript || videoInfo.transcript.length < 100) {
      return Response.json({ error: "Video transcript is too short or missing." }, { status: 400 });
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
      return Response.json({ slides: generateMockCarousel() }, { headers: getRateLimitHeaders(rateResult) });
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

    return Response.json({ slides: generateMockCarousel() }, { headers: getRateLimitHeaders(rateResult) });
  } catch (error) {
    console.error("Generate carousel error:", error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
