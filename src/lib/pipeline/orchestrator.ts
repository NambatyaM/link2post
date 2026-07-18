import { getProviderBaseUrl, getProviderApiKey, getProviderHeaders } from "@/services/ai/providers/shared";
import type { CallAIResult } from "./types";

export const CALL_TIMEOUT_MS = 8_000;

export function getAvailableProviders(): Array<{ id: string; model: string }> {
  const providers: Array<{ id: string; model: string }> = [];
  const tryProviders = [
    { id: "groq", model: "llama-3.3-70b-versatile", envKey: "GROQ_API_KEY" },
    { id: "gemini", model: "gemini-2.0-flash", envKey: "GEMINI_API_KEY" },
    { id: "openrouter", model: "qwen/qwen-2.5-72b-instruct", envKey: "OPENROUTER_API_KEY" },
    { id: "cerebras", model: "llama-3.3-70b", envKey: "CEREBRAS_API_KEY" },
    { id: "mistral", model: "mistral-small-latest", envKey: "MISTRAL_API_KEY" },
    { id: "tokengo", model: "deepseek-v4-flash", envKey: "THORBASE_API_KEY" },
  ];
  for (const p of tryProviders) {
    if (process.env[p.envKey]) providers.push({ id: p.id, model: p.model });
  }
  return providers;
}

export async function callAI(
  taskLabel: string,
  providers: Array<{ id: string; model: string }>,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Promise<CallAIResult> {
  const errors: string[] = [];

  for (const provider of providers) {
    const baseUrl = getProviderBaseUrl(provider.id);
    const apiKey = getProviderApiKey(provider.id);
    if (!apiKey) {
      errors.push(`${provider.id}: no API key`);
      continue;
    }

    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

    try {
      console.log(`[pipeline:${taskLabel}] Trying ${provider.id}/${provider.model}`);
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: getProviderHeaders(provider.id, apiKey),
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        errors.push(`${provider.id}: HTTP ${response.status} ${errText.slice(0, 100)}`);
        console.warn(`[pipeline:${taskLabel}] ${provider.id} HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - start;

      if (!content.trim()) {
        errors.push(`${provider.id}: empty content`);
        continue;
      }

      console.log(`[pipeline:${taskLabel}] Success: ${provider.id}/${provider.model} in ${latencyMs}ms`);
      return { content, provider: provider.id, model: provider.model, latencyMs };
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.id}: ${msg}`);
      console.warn(`[pipeline:${taskLabel}] ${provider.id} failed: ${msg}`);
    }
  }

  throw new Error(`[pipeline:${taskLabel}] All providers failed: ${errors.join("; ")}`);
}
