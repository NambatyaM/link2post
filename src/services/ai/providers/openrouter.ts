import { getApiKey } from "../utils";
import type { CompletionRequest, ProviderError } from "../types";

const TIMEOUT_MS = 45_000;

export class OpenRouterProviderError extends Error implements ProviderError {
  provider = "openrouter";
  statusCode?: number;
  retryable: boolean;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "OpenRouterProviderError";
    this.statusCode = statusCode;
    this.retryable = statusCode === 429 || !statusCode || statusCode >= 500;
  }
}

export async function callProvider(
  request: CompletionRequest,
): Promise<{ content: string; latencyMs: number }> {
  const apiKey = getApiKey("OPENROUTER_API_KEY");
  const model = "qwen/qwen-2.5-72b-instruct";
  const url = "https://openrouter.ai/api/v1/chat/completions";

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://content-repurposer.app",
        "X-Title": "Content Repurposer",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        ...(request.expectJson && {
          response_format: { type: "json_object" },
        }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new OpenRouterProviderError(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new OpenRouterProviderError("OpenRouter returned empty content");
    }

    return { content, latencyMs: Date.now() - start };
  } catch (err) {
    if (err instanceof OpenRouterProviderError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new OpenRouterProviderError("OpenRouter request timed out", 408);
    }
    throw new OpenRouterProviderError(
      `OpenRouter network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function callProviderWithModel(
  request: CompletionRequest,
  modelOverride: string,
): Promise<{ content: string; latencyMs: number }> {
  const apiKey = getApiKey("OPENROUTER_API_KEY");
  const url = "https://openrouter.ai/api/v1/chat/completions";

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://content-repurposer.app",
        "X-Title": "Content Repurposer",
      },
      body: JSON.stringify({
        model: modelOverride,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        ...(request.expectJson && {
          response_format: { type: "json_object" },
        }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new OpenRouterProviderError(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new OpenRouterProviderError("OpenRouter returned empty content");
    }

    return { content, latencyMs: Date.now() - start };
  } catch (err) {
    if (err instanceof OpenRouterProviderError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new OpenRouterProviderError("OpenRouter request timed out", 408);
    }
    throw new OpenRouterProviderError(
      `OpenRouter network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
