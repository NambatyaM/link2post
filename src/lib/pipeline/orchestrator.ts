import { getProviderBaseUrl, getProviderApiKey, getProviderHeaders } from "@/services/ai/providers/shared";
import type { CallAIResult } from "./types";

export const CALL_TIMEOUT_MS = 8_000;

export function getAvailableProviders(): Array<{ id: string; model: string }> {
  const providers: Array<{ id: string; model: string }> = [];
  const tryProviders = [
    { id: "groq", model: "llama-3.3-70b-versatile", envKey: "GROQ_API_KEY" },
    { id: "gemini", model: "gemini-2.0-flash", envKey: "GEMINI_API_KEY" },
    { id: "openrouter", model: "qwen/qwen-2.5-72b-instruct", envKey: "OPENROUTER_API_KEY" },
    { id: "cerebras", model: "gpt-oss-120b", envKey: "CEREBRAS_API_KEY" },
    { id: "mistral", model: "mistral-small-latest", envKey: "MISTRAL_API_KEY" },
    { id: "tokengo", model: "deepseek-v4-flash", envKey: "THORBASE_API_KEY" },
  ];
  for (const p of tryProviders) {
    if (process.env[p.envKey]) providers.push({ id: p.id, model: p.model });
  }
  return providers;
}

const JSON_MODE_PROVIDERS = new Set(["groq", "gemini", "mistral"]);

async function tryProvider(
  provider: { id: string; model: string },
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<CallAIResult> {
  const baseUrl = getProviderBaseUrl(provider.id);
  const apiKey = getProviderApiKey(provider.id);
  if (!apiKey) throw new Error("no API key");

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  const body: Record<string, unknown> = {
    model: provider.model,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
  };
  if (JSON_MODE_PROVIDERS.has(provider.id)) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: getProviderHeaders(provider.id, apiKey),
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  clearTimeout(timer);

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${errText.slice(0, 100)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const latencyMs = Date.now() - start;

  if (!content.trim()) throw new Error("empty content");

  return { content, provider: provider.id, model: provider.model, latencyMs };
}

export async function callAI(
  taskLabel: string,
  providers: Array<{ id: string; model: string }>,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<CallAIResult> {
  const errors: string[] = [];

  console.log(`[pipeline:${taskLabel}] Trying ${providers.length} providers in parallel: ${providers.map(p => p.id).join(", ")}`);

  const raceMap = new Map(
    providers.map((p) => [
      p.id,
      tryProvider(p, messages, maxTokens)
        .then((r) => ({ ok: true as const, result: r, provider: p }))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          return { ok: false as const, provider: p, msg };
        }),
    ]),
  );

  while (raceMap.size > 0) {
    const winner = await Promise.race([...raceMap.values()]);
    raceMap.delete(winner.provider.id);

    if (winner.ok) {
      console.log(`[pipeline:${taskLabel}] Success: ${winner.provider.id}/${winner.result.model} in ${winner.result.latencyMs}ms`);
      return winner.result;
    }

    errors.push(`${winner.provider.id}: ${winner.msg}`);
    console.warn(`[pipeline:${taskLabel}] ${winner.provider.id} failed: ${winner.msg}`);
  }

  throw new Error(`[pipeline:${taskLabel}] All providers failed: ${errors.join("; ")}`);
}
