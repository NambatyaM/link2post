import { getApiKey } from "../utils";
import type { CompletionRequest, ProviderError } from "../types";

const TIMEOUT_MS = 30_000;

export class GeminiProviderError extends Error implements ProviderError {
  provider = "gemini";
  statusCode?: number;
  retryable: boolean;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "GeminiProviderError";
    this.statusCode = statusCode;
    this.retryable = statusCode === 429 || !statusCode || statusCode >= 500;
  }
}

export async function callProvider(
  request: CompletionRequest,
): Promise<{ content: string; latencyMs: number }> {
  const apiKey = process.env["GOOGLE_AI_STUDIO_API_KEY"] || getApiKey("GEMINI_API_KEY");
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
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
      throw new GeminiProviderError(
        `Gemini API error: ${response.status} ${response.statusText}${errBody ? " - " + errBody.slice(0, 200) : ""}`,
        response.status,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new GeminiProviderError("Gemini returned empty content");
    }

    return { content, latencyMs: Date.now() - start };
  } catch (err) {
    if (err instanceof GeminiProviderError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new GeminiProviderError("Gemini request timed out", 408);
    }
    throw new GeminiProviderError(
      `Gemini network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
