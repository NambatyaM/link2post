import { getApiKey } from "../utils";
import type { CompletionRequest, ProviderError } from "../types";

const TIMEOUT_MS = 30_000;
const BASE_URL = "https://api.tokengo.com/v1/chat/completions";

export class TokenGoProviderError extends Error implements ProviderError {
  provider = "tokengo";
  statusCode?: number;
  retryable: boolean;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "TokenGoProviderError";
    this.statusCode = statusCode;
    this.retryable = statusCode === 429 || !statusCode || statusCode >= 500;
  }
}

export async function callProvider(
  request: CompletionRequest,
): Promise<{ content: string; latencyMs: number }> {
  const apiKey = getApiKey("THORBASE_API_KEY");
  const model = "deepseek-v4-flash";
  return callWithModel(request, model, apiKey);
}

export async function callProviderWithModel(
  request: CompletionRequest,
  modelOverride: string,
): Promise<{ content: string; latencyMs: number }> {
  const apiKey = getApiKey("THORBASE_API_KEY");
  return callWithModel(request, modelOverride, apiKey);
}

async function callWithModel(
  request: CompletionRequest,
  model: string,
  apiKey: string,
): Promise<{ content: string; latencyMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => { clearTimeout(timer); controller.abort(); };
  request.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      const errBody = await response.text().catch(() => "");
      throw new TokenGoProviderError(
        `TokenGo API error: ${response.status} ${response.statusText}${errBody ? " - " + errBody.slice(0, 200) : ""}`,
        response.status,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new TokenGoProviderError("TokenGo returned empty content");
    }

    return { content, latencyMs: Date.now() - start };
  } catch (err) {
    if (err instanceof TokenGoProviderError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TokenGoProviderError("TokenGo request timed out", 408);
    }
    throw new TokenGoProviderError(
      `TokenGo network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener("abort", onAbort);
  }
}
