import type { TaskType, RouteResult, CompletionRequest, ChatMessage } from "./types";
import { isValidJson, isRateLimited } from "./utils";
import { callProvider as geminiCall } from "./providers/gemini";
import { callProvider as groqCall, callProviderWithModel as groqCallWithModel } from "./providers/groq";
import { callProvider as openrouterCall, callProviderWithModel as openrouterCallWithModel } from "./providers/openrouter";
import { callProvider as cerebrasCall } from "./providers/cerebras";
import { callProvider as mistralCall } from "./providers/mistral";

interface RouteEntry {
  provider: string;
  model: string;
  call: (req: CompletionRequest) => Promise<{ content: string; latencyMs: number }>;
}

function checkApiKey(envVar: string): boolean {
  return !!process.env[envVar];
}

function buildRouteTable(): Record<TaskType, RouteEntry[]> {
  return {
    transcript_processing: [
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("OPENROUTER_API_KEY")
        ? [{ provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") }]
        : []),
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
      ...(checkApiKey("CEREBRAS_API_KEY")
        ? [{ provider: "cerebras", model: "llama-3.3-70b", call: cerebrasCall }]
        : []),
    ],
    brand_voice_learning: [
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("OPENROUTER_API_KEY")
        ? [{ provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") }]
        : []),
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
    ],
    post_generation: [
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("OPENROUTER_API_KEY")
        ? [{ provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") }]
        : []),
      ...(checkApiKey("CEREBRAS_API_KEY")
        ? [{ provider: "cerebras", model: "llama-3.3-70b", call: cerebrasCall }]
        : []),
    ],
    article_generation: [
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("OPENROUTER_API_KEY")
        ? [
            { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
            { provider: "openrouter", model: "meta-llama/llama-3.1-70b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "meta-llama/llama-3.1-70b-instruct") },
          ]
        : []),
    ],
    carousel_generation: [
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
      ...(checkApiKey("MISTRAL_API_KEY")
        ? [{ provider: "mistral", model: "mistral-small-latest", call: mistralCall }]
        : []),
    ],
    rewrite_edit: [
      ...(checkApiKey("GROQ_API_KEY")
        ? [
            { provider: "groq", model: "mixtral-8x7b-32768", call: (req: CompletionRequest) => groqCallWithModel(req, "mixtral-8x7b-32768") },
            { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
          ]
        : []),
      ...(checkApiKey("MISTRAL_API_KEY")
        ? [{ provider: "mistral", model: "mistral-small-latest", call: mistralCall }]
        : []),
    ],
    hook_generation: [
      ...(checkApiKey("GROQ_API_KEY")
        ? [
            { provider: "groq", model: "mixtral-8x7b-32768", call: (req: CompletionRequest) => groqCallWithModel(req, "mixtral-8x7b-32768") },
            { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
          ]
        : []),
      ...(checkApiKey("MISTRAL_API_KEY")
        ? [{ provider: "mistral", model: "mistral-small-latest", call: mistralCall }]
        : []),
    ],
    content_calendar: [
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("OPENROUTER_API_KEY")
        ? [{ provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") }]
        : []),
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
    ],
  };
}

function shouldExpectJson(taskType: TaskType): boolean {
  switch (taskType) {
    case "transcript_processing":
    case "brand_voice_learning":
    case "content_calendar":
      return true;
    case "post_generation":
    case "article_generation":
    case "carousel_generation":
      return true;
    case "rewrite_edit":
    case "hook_generation":
      return true;
    default:
      return false;
  }
}

export function getRouteForTask(taskType: TaskType): RouteEntry[] {
  const table = buildRouteTable();
  return table[taskType] || [];
}

export async function routeTask(
  taskType: TaskType,
  prompt: string,
  systemPrompt?: string,
): Promise<RouteResult> {
  const routes = getRouteForTask(taskType);
  if (routes.length === 0) {
    throw new Error(`No providers configured for task type: ${taskType}`);
  }

  const expectJson = shouldExpectJson(taskType);
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const request: CompletionRequest = {
    messages,
    temperature: 0.7,
    maxTokens: 4096,
    expectJson,
  };

  const errors: Array<{ provider: string; model: string; error: unknown }> = [];

  for (const route of routes) {
    try {
      console.log(
        `[model-router] Trying ${route.provider}/${route.model} for ${taskType}`,
      );

      const result = await route.call(request);

      if (!result.content || result.content.trim().length === 0) {
        console.warn(
          `[model-router] ${route.provider}/${route.model} returned empty content`,
        );
        errors.push({
          provider: route.provider,
          model: route.model,
          error: new Error("Empty content"),
        });
        continue;
      }

      if (expectJson && !isValidJson(result.content)) {
        console.warn(
          `[model-router] ${route.provider}/${route.model} returned invalid JSON`,
        );
        errors.push({
          provider: route.provider,
          model: route.model,
          error: new Error("Invalid JSON response"),
        });
        continue;
      }

      console.log(
        `[model-router] Success: ${route.provider}/${route.model} in ${result.latencyMs}ms`,
      );

      return {
        content: result.content,
        provider: route.provider,
        model: route.model,
        latencyMs: result.latencyMs,
      };
    } catch (err) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : undefined;

      console.warn(
        `[model-router] ${route.provider}/${route.model} failed: ${err instanceof Error ? err.message : String(err)}`,
      );

      if (statusCode && isRateLimited(statusCode)) {
        console.warn(
          `[model-router] ${route.provider} rate limited, skipping remaining ${route.provider} routes`,
        );
      }

      errors.push({
        provider: route.provider,
        model: route.model,
        error: err,
      });
    }
  }

  const errorSummary = errors
    .map((e) => `${e.provider}/${e.model}: ${e.error instanceof Error ? e.error.message : String(e.error)}`)
    .join("; ");

  throw new Error(
    `[model-router] All providers failed for ${taskType}: ${errorSummary}`,
  );
}
