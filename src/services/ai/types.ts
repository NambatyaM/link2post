export type TaskType =
  | "transcript_processing"
  | "brand_voice_learning"
  | "post_generation"
  | "article_generation"
  | "carousel_generation"
  | "rewrite_edit"
  | "hook_generation"
  | "content_calendar"
  | "transcript_analysis"
  | "posts_generation"
  | "articles_calendar_generation";

export interface ProviderConfig {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}

export interface RouteResult {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface ProviderError extends Error {
  provider: string;
  statusCode?: number;
  retryable: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  expectJson?: boolean;
}
