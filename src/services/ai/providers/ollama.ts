import type { ChatMessage, CompletionRequest, RouteResult } from "../types";

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_BASE_URL = "http://localhost:11434";

function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
}

function buildUrl(endpoint: string): string {
  const base = getOllamaBaseUrl().replace(/\/+$/, "");
  return `${base}${endpoint}`;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    num_ctx?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
  };
  format?: "json" | string;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export async function listModels(): Promise<OllamaModel[]> {
  const url = buildUrl("/api/tags");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Ollama list models failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function checkModelExists(modelName: string): Promise<boolean> {
  try {
    const models = await listModels();
    return models.some((m) => m.name === modelName || m.model === modelName);
  } catch {
    return false;
  }
}

export async function checkHealth(): Promise<{ running: boolean; models: OllamaModel[]; error?: string }> {
  try {
    const models = await listModels();
    return { running: true, models };
  } catch (err) {
    return {
      running: false,
      models: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function mapMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

async function callOllamaChat(
  request: OllamaChatRequest,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<OllamaChatResponse> {
  const url = buildUrl("/api/chat");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timeout or cancelled");
    }
    throw err;
  }
}

export async function callOllamaChatStream(
  request: OllamaChatRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<{ content: string; latencyMs: number; promptTokens?: number; completionTokens?: number }> {
  const url = buildUrl("/api/chat");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  const start = Date.now();
  let fullContent = "";
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const chunk: OllamaStreamChunk = JSON.parse(trimmed);
          if (chunk.message?.content) {
            fullContent += chunk.message.content;
            onChunk(chunk.message.content);
          }
          if (chunk.prompt_eval_count) promptTokens = chunk.prompt_eval_count;
          if (chunk.eval_count) completionTokens = chunk.eval_count;
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }

    const latencyMs = Date.now() - start;
    return { content: fullContent, latencyMs, promptTokens, completionTokens };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timeout or cancelled");
    }
    throw err;
  }
}

export async function callOllama(
  model: string,
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    expectJson?: boolean;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<RouteResult> {
  const request: OllamaChatRequest = {
    model,
    messages: mapMessages(messages),
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens,
      num_ctx: 4096,
    },
  };

  if (options.expectJson) {
    request.format = "json";
  }

  const start = Date.now();
  const response = await callOllamaChat(request, options.signal, options.timeoutMs);
  const latencyMs = Date.now() - start;

  const content = response.message?.content || "";
  if (!content.trim()) {
    throw new Error("Empty response from Ollama");
  }

  return {
    content,
    provider: "ollama",
    model,
    latencyMs,
  };
}

export async function callOllamaWithStream(
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  options: {
    temperature?: number;
    maxTokens?: number;
    expectJson?: boolean;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<RouteResult & { promptTokens?: number; completionTokens?: number }> {
  const request: OllamaChatRequest = {
    model,
    messages: mapMessages(messages),
    stream: true,
    options: {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens,
      num_ctx: 4096,
    },
  };

  if (options.expectJson) {
    request.format = "json";
  }

  const start = Date.now();
  const result = await callOllamaChatStream(request, onChunk, options.signal, options.timeoutMs);
  const latencyMs = Date.now() - start;

  return {
    content: result.content,
    provider: "ollama",
    model,
    latencyMs,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

export const OLLAMA_MODELS = {
  analysis: "qwen3:8b",
  writing: "gemma3:4b",
  fast: "llama3.1:8b",
} as const;

export type OllamaModelType = keyof typeof OLLAMA_MODELS;

export function getModelForTask(taskType: string): string {
  const analysisTasks = ["transcript_processing", "brand_voice_learning", "transcript_analysis"];
  const writingTasks = ["post_generation", "article_generation", "carousel_generation", "posts_generation", "articles_calendar_generation"];
  const fastTasks = ["rewrite_edit", "hook_generation", "content_calendar"];

  if (analysisTasks.includes(taskType)) return OLLAMA_MODELS.analysis;
  if (writingTasks.includes(taskType)) return OLLAMA_MODELS.writing;
  if (fastTasks.includes(taskType)) return OLLAMA_MODELS.fast;
  return OLLAMA_MODELS.writing;
}

export function getFallbackModel(): string {
  return OLLAMA_MODELS.fast;
}