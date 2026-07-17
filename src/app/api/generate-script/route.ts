import { NextRequest } from "next/server";
import { VIDEO_SCRIPT_SYSTEM_PROMPT, buildVideoScriptPrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { buildAttempts, fetchWithTimeout, recordProviderFailure, clearProviderCooldown } from "@/lib/providers";
import { generateLocalVideoScript } from "@/lib/local-generator";
import { recordGenerationEvent } from "@/lib/analytics";
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
    const userPrompt = buildVideoScriptPrompt(videoInfo);

    if (attempts.length === 0) {
      const local = generateLocalVideoScript(videoInfo);
      recordGenerationEvent({
        userId, deviceId, generationType: "script",
        providerId: "local", modelId: "local", success: true, durationMs: 0,
      }).catch(() => {});
      return Response.json({ script: local }, { headers: getRateLimitHeaders(rateResult) });
    }

    for (const attempt of attempts) {
      try {
        const response = await fetchWithTimeout(attempt.provider.baseUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${attempt.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: attempt.model,
            messages: [
              { role: "system", content: VIDEO_SCRIPT_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 16000,
            stream: false,
          }),
        });

        if (!response.ok) {
          console.error(`Script: ${attempt.model} (${attempt.provider.label}) failed: ${response.status}`);
          recordProviderFailure(attempt.provider.id);
          continue;
        }
        clearProviderCooldown(attempt.provider.id);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== "string" || content.trim().length === 0) continue;

        const script = parseScriptResponse(content);
        if (script) {
          const durationMs = Date.now() - genStart;
          recordGenerationEvent({
            userId, deviceId, generationType: "script",
            providerId: attempt.provider.id, modelId: attempt.model, success: true, durationMs,
          }).catch(() => {});
          return Response.json({ script }, { headers: getRateLimitHeaders(rateResult) });
        }
      } catch { continue; }
    }

    const fallback = generateLocalVideoScript(videoInfo);
    const durationMs = Date.now() - genStart;
    recordGenerationEvent({
      userId, deviceId, generationType: "script",
      providerId: "local", modelId: "local", success: true, durationMs,
    }).catch(() => {});
    return Response.json({ script: fallback }, { headers: getRateLimitHeaders(rateResult) });
  } catch (error) {
    console.error("Generate script error:", error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
