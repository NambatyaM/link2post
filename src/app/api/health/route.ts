import { NextRequest } from "next/server";
import { PROVIDERS, getProviderApiKey, fetchWithTimeout, recordProviderFailure, clearProviderCooldown } from "@/lib/providers";

const HEALTH_TIMEOUT_MS = 10_000;
const HEALTH_PROMPT = "Say exactly one word: ok";

interface ModelHealth {
  provider: string;
  model: string;
  status: "ok" | "fail" | "skip";
  latencyMs?: number;
  error?: string;
}

export async function GET(_req: NextRequest) {
  const results: ModelHealth[] = [];

  for (const provider of PROVIDERS) {
    const apiKey = getProviderApiKey(provider);
    if (!apiKey) {
      for (const model of provider.models) {
        results.push({ provider: provider.id, model: model.id, status: "skip", error: "no API key" });
      }
      continue;
    }

    for (const model of provider.models) {
      const start = Date.now();
      try {
        const response = await fetchWithTimeout(
          provider.baseUrl,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model.id,
              messages: [{ role: "user", content: HEALTH_PROMPT }],
              max_tokens: 10,
              stream: false,
            }),
          },
          HEALTH_TIMEOUT_MS,
        );

        const latencyMs = Date.now() - start;

        if (!response.ok) {
          const status = response.status;
          const isRateLimit = status === 429;
          const error = isRateLimit ? `rate limited (${status})` : `HTTP ${status}`;
          recordProviderFailure(provider.id);
          results.push({ provider: provider.id, model: model.id, status: "fail", latencyMs, error });
          console.error(`[health] ${provider.id}/${model.id} FAILED: ${error} (${latencyMs}ms)`);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== "string" || content.trim().length === 0) {
          recordProviderFailure(provider.id);
          results.push({ provider: provider.id, model: model.id, status: "fail", latencyMs, error: "empty response" });
          console.error(`[health] ${provider.id}/${model.id} FAILED: empty response (${latencyMs}ms)`);
          continue;
        }

        clearProviderCooldown(provider.id);
        results.push({ provider: provider.id, model: model.id, status: "ok", latencyMs });
      } catch (err: unknown) {
        const latencyMs = Date.now() - start;
        const error = err instanceof Error ? err.message : "unknown error";
        recordProviderFailure(provider.id);
        results.push({ provider: provider.id, model: model.id, status: "fail", latencyMs, error });
        console.error(`[health] ${provider.id}/${model.id} FAILED: ${error} (${latencyMs}ms)`);
      }
    }
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    fail: results.filter((r) => r.status === "fail").length,
    skip: results.filter((r) => r.status === "skip").length,
    checkedAt: new Date().toISOString(),
  };

  const hasFailures = summary.fail > 0;
  if (hasFailures) {
    console.warn(`[health] ${summary.fail}/${summary.total} models failing`, results.filter((r) => r.status === "fail"));
  }

  return Response.json({ summary, results }, { status: hasFailures ? 207 : 200 });
}
