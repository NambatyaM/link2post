import { NextRequest } from "next/server";
import { getProviderBaseUrl, getProviderApiKey, getProviderHeaders } from "@/services/ai/providers/shared";

const HEALTH_TIMEOUT_MS = 10_000;
const HEALTH_PROMPT = "Say exactly one word: ok";

interface ModelHealth {
  provider: string;
  model: string;
  status: "ok" | "fail" | "skip";
  latencyMs?: number;
  error?: string;
}

const MODELS_TO_TEST = [
  { provider: "gemini", model: "gemini-2.0-flash" },
  { provider: "groq", model: "llama-3.3-70b-versatile" },
  { provider: "groq", model: "mixtral-8x7b-32768" },
  { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct" },
  { provider: "openrouter", model: "meta-llama/llama-3.1-70b-instruct" },
  { provider: "cerebras", model: "gpt-oss-120b" },
  { provider: "mistral", model: "mistral-small-latest" },
];

export async function GET(_req: NextRequest) {
  const results: ModelHealth[] = [];

  for (const { provider, model } of MODELS_TO_TEST) {
    const apiKey = getProviderApiKey(provider);
    if (!apiKey) {
      results.push({ provider, model, status: "skip", error: "no API key" });
      continue;
    }

    const baseUrl = getProviderBaseUrl(provider);
    if (!baseUrl) {
      results.push({ provider, model, status: "skip", error: "no base URL" });
      continue;
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: getProviderHeaders(provider, apiKey),
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: HEALTH_PROMPT }],
          max_tokens: 10,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const status = response.status;
        const error = status === 429 ? `rate limited (${status})` : `HTTP ${status}`;
        results.push({ provider, model, status: "fail", latencyMs, error });
        console.error(`[health] ${provider}/${model} FAILED: ${error} (${latencyMs}ms)`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        results.push({ provider, model, status: "fail", latencyMs, error: "empty response" });
        console.error(`[health] ${provider}/${model} FAILED: empty response (${latencyMs}ms)`);
        continue;
      }

      results.push({ provider, model, status: "ok", latencyMs });
      console.log(`[health] ${provider}/${model} OK (${latencyMs}ms)`);
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const error = err instanceof Error ? err.message : "unknown error";
      results.push({ provider, model, status: "fail", latencyMs, error });
      console.error(`[health] ${provider}/${model} FAILED: ${error} (${latencyMs}ms)`);
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

  return Response.json({ summary, results }, { status: hasFailures ? 207 : 200 });
}
