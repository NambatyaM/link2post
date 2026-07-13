import { NextRequest } from "next/server";
import { VIDEO_SCRIPT_SYSTEM_PROMPT, buildVideoScriptPrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { resolveProviderAndModel } from "@/lib/providers";
import type { VideoInfo, VideoScript } from "@/lib/types";

function parseScriptResponse(raw: string): VideoScript | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length >= 3) {
      return parsed as VideoScript;
    }
  } catch { /* */ }
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length >= 3) {
        return parsed as VideoScript;
      }
    } catch { /* */ }
  }
  return null;
}

function generateMockScript(): VideoScript {
  return {
    sections: [
      { label: "Hook", timestamp: "0:00", duration: "3 sec", script: "Stop scrolling. This one insight changed how I think about content.", visual: "Face to camera, direct eye contact, slight lean forward", caption: "STOP SCROLLING" },
      { label: "Problem", timestamp: "0:03", duration: "7 sec", script: "Most people create content and wonder why nobody engages. The problem isn't your content — it's when and how you deliver it.", visual: "B-roll of someone scrolling LinkedIn, looking frustrated", caption: "The problem isn't your content" },
      { label: "Solution", timestamp: "0:10", duration: "35 sec", script: "Here's what actually works: post between 10 AM and noon on weekdays. Wednesday afternoon outperforms everything. Keep your posts between 1,000 and 1,300 characters — not words, characters. The data shows professionals clear their inbox by 9:30, take their first mental break around 10, and that's when they scroll. I changed my posting schedule and my reach went up 340% in 60 days.", visual: "Split screen: clock showing 10 AM, then engagement graph going up", caption: "10 AM - 12 PM = Peak engagement" },
      { label: "CTA", timestamp: "0:45", duration: "15 sec", script: "Try this for two weeks and tell me it doesn't work. Follow for more content strategies backed by data, not guesswork.", visual: "Point to follow button, then fade to profile", caption: "Follow for data-backed content tips" },
    ],
    totalDuration: "60 seconds",
    platformNotes: "Works for Reels, TikTok, YouTube Shorts",
  };
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
      return Response.json({ script: generateMockScript() }, { headers: getRateLimitHeaders(rateResult) });
    }

    const { provider, model: defaultModel, apiKey } = resolved;
    const modelsToTry = [defaultModel, ...provider.models.filter((m) => m.id !== defaultModel).map((m) => m.id)];
    const userPrompt = buildVideoScriptPrompt(videoInfo);

    for (const mdl of modelsToTry) {
      try {
        const response = await fetch(provider.baseUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: mdl,
            messages: [
              { role: "system", content: VIDEO_SCRIPT_SYSTEM_PROMPT },
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

        const script = parseScriptResponse(content);
        if (script) {
          return Response.json({ script }, { headers: getRateLimitHeaders(rateResult) });
        }
      } catch { continue; }
    }

    return Response.json({ script: generateMockScript() }, { headers: getRateLimitHeaders(rateResult) });
  } catch (error) {
    console.error("Generate script error:", error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
