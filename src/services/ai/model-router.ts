import type { TaskType, RouteResult, CompletionRequest, ChatMessage } from "./types";
import { isValidJson, isRateLimited } from "./utils";
import { callProvider as geminiCall } from "./providers/gemini";
import { callProvider as groqCall, callProviderWithModel as groqCallWithModel } from "./providers/groq";
import { callProvider as openrouterCall, callProviderWithModel as openrouterCallWithModel } from "./providers/openrouter";
import { callProvider as cerebrasCall } from "./providers/cerebras";
import { callProvider as mistralCall } from "./providers/mistral";
import { callProvider as tokengoCall, callProviderWithModel as tokengoCallWithModel } from "./providers/tokengo";

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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [{ provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") }]
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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [{ provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") }]
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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [
            { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
            { provider: "tokengo", model: "deepseek-v4-pro", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-pro") },
          ]
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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [{ provider: "tokengo", model: "deepseek-v4-pro", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-pro") }]
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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [{ provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") }]
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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [{ provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") }]
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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [{ provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") }]
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
      ...(checkApiKey("THORBASE_API_KEY")
        ? [{ provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") }]
        : []),
    ],
    transcript_analysis: [
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
      ...(checkApiKey("OPENROUTER_API_KEY")
        ? [{ provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") }]
        : []),
    ],
    posts_generation: [
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("MISTRAL_API_KEY")
        ? [{ provider: "mistral", model: "mistral-small-latest", call: mistralCall }]
        : []),
    ],
    articles_calendar_generation: [
      ...(checkApiKey("GROQ_API_KEY")
        ? [{ provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") }]
        : []),
      ...(checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")
        ? [{ provider: "gemini", model: "gemini-2.0-flash", call: geminiCall }]
        : []),
      ...(checkApiKey("OPENROUTER_API_KEY")
        ? [{ provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") }]
        : []),
    ],
  };
}

function shouldExpectJson(taskType: TaskType): boolean {
  switch (taskType) {
    case "transcript_processing":
    case "brand_voice_learning":
    case "content_calendar":
    case "transcript_analysis":
    case "posts_generation":
    case "articles_calendar_generation":
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

function getMaxTokens(taskType: TaskType): number {
  switch (taskType) {
    case "content_calendar":
    case "articles_calendar_generation":
      return 10000;
    case "transcript_analysis":
      return 6000;
    case "posts_generation":
      return 6000;
    case "article_generation":
      return 8000;
    case "carousel_generation":
      return 4096;
    case "post_generation":
      return 4096;
    case "rewrite_edit":
    case "hook_generation":
      return 2048;
    default:
      return 4096;
  }
}

const FAST_RACE_MS = 10_000;

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
  const maxTokens = getMaxTokens(taskType);
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const request: CompletionRequest = {
    messages,
    temperature: 0.7,
    maxTokens,
    expectJson,
  };

  const groqRoutes = routes.filter((r) => r.provider === "groq");
  const fastFallback = groqRoutes.length > 0 ? groqRoutes[0] : null;

  function validateResult(result: { content: string; latencyMs: number }, route: RouteEntry): RouteResult | null {
    if (!result.content || result.content.trim().length === 0) {
      console.warn(`[model-router] ${route.provider}/${route.model} returned empty content`);
      return null;
    }
    if (expectJson && !isValidJson(result.content)) {
      console.warn(`[model-router] ${route.provider}/${route.model} returned invalid JSON`);
      return null;
    }
    console.log(`[model-router] Success: ${route.provider}/${route.model} in ${result.latencyMs}ms`);
    return {
      content: result.content,
      provider: route.provider,
      model: route.model,
      latencyMs: result.latencyMs,
    };
  }

  async function tryRoute(route: RouteEntry): Promise<RouteResult | null> {
    try {
      console.log(`[model-router] Trying ${route.provider}/${route.model} for ${taskType}`);
      const result = await route.call(request);
      return validateResult(result, route);
    } catch (err) {
      const statusCode = err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
      console.warn(`[model-router] ${route.provider}/${route.model} failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  const firstRoute = routes[0];
  const firstResultPromise = tryRoute(firstRoute);

  if (fastFallback && fastFallback !== firstRoute) {
    const raceResult = await Promise.race([
      firstResultPromise.then((r) => ({ route: firstRoute, result: r })),
      new Promise<{ route: RouteEntry; result: null }>((resolve) =>
        setTimeout(() => resolve({ route: fastFallback, result: null }), FAST_RACE_MS)
      ),
      fastFallback.call(request).then((r) => {
        const validated = validateResult(r, fastFallback);
        return { route: fastFallback, result: validated };
      }).catch(() => ({ route: fastFallback, result: null })),
    ]);

    if (raceResult.result) {
      console.log(`[model-router] Race winner: ${raceResult.route.provider}/${raceResult.route.model}`);
      return raceResult.result;
    }

    const firstResult = await firstResultPromise;
    if (firstResult) {
      console.log(`[model-router] First route completed: ${firstRoute.provider}/${firstRoute.model}`);
      return firstResult;
    }
  } else {
    const firstResult = await firstResultPromise;
    if (firstResult) return firstResult;
  }

  for (const route of routes.slice(1)) {
    const result = await tryRoute(route);
    if (result) return result;
  }

  throw new Error(`[model-router] All providers failed for ${taskType}`);
}
