import type { TaskType, RouteResult, CompletionRequest, ChatMessage } from "./types";
import { isValidJson, isRateLimited } from "./utils";
import { callProvider as geminiCall } from "./providers/gemini";
import { callProvider as groqCall, callProviderWithModel as groqCallWithModel } from "./providers/groq";
import { callProvider as openrouterCall, callProviderWithModel as openrouterCallWithModel } from "./providers/openrouter";
import { callProvider as cerebrasCall } from "./providers/cerebras";
import { callProvider as mistralCall } from "./providers/mistral";
import { callProvider as tokengoCall, callProviderWithModel as tokengoCallWithModel } from "./providers/tokengo";
import { callOllama, getModelForTask, getFallbackModel, OLLAMA_MODELS } from "./providers/ollama";

interface RouteEntry {
  provider: string;
  model: string;
  call: (req: CompletionRequest) => Promise<{ content: string; latencyMs: number }>;
}

function checkApiKey(envVar: string): boolean {
  return !!process.env[envVar];
}

function ollamaAvailable(): boolean {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    return !!baseUrl;
  } catch {
    return false;
  }
}

function buildRouteTable(): Record<TaskType, RouteEntry[]> {
  const ollamaEnabled = ollamaAvailable();
  const table: Record<TaskType, RouteEntry[]> = {
    transcript_processing: [],
    brand_voice_learning: [],
    post_generation: [],
    article_generation: [],
    carousel_generation: [],
    rewrite_edit: [],
    hook_generation: [],
    content_calendar: [],
    transcript_analysis: [],
    posts_generation: [],
    articles_calendar_generation: [],
  };

  if (ollamaEnabled) {
    const analysisModel = OLLAMA_MODELS.analysis;
    const writingModel = OLLAMA_MODELS.writing;
    const fastModel = OLLAMA_MODELS.fast;

    table.transcript_processing.push(
      { provider: "ollama", model: analysisModel, call: (req) => callOllama(analysisModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.brand_voice_learning.push(
      { provider: "ollama", model: analysisModel, call: (req) => callOllama(analysisModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.post_generation.push(
      { provider: "ollama", model: writingModel, call: (req) => callOllama(writingModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.article_generation.push(
      { provider: "ollama", model: writingModel, call: (req) => callOllama(writingModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.carousel_generation.push(
      { provider: "ollama", model: writingModel, call: (req) => callOllama(writingModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.rewrite_edit.push(
      { provider: "ollama", model: fastModel, call: (req) => callOllama(fastModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.hook_generation.push(
      { provider: "ollama", model: fastModel, call: (req) => callOllama(fastModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.content_calendar.push(
      { provider: "ollama", model: analysisModel, call: (req) => callOllama(analysisModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.transcript_analysis.push(
      { provider: "ollama", model: analysisModel, call: (req) => callOllama(analysisModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.posts_generation.push(
      { provider: "ollama", model: writingModel, call: (req) => callOllama(writingModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
    table.articles_calendar_generation.push(
      { provider: "ollama", model: writingModel, call: (req) => callOllama(writingModel, req.messages, { expectJson: req.expectJson, maxTokens: req.maxTokens, temperature: req.temperature, signal: req.signal }) },
    );
  }

  if (checkApiKey("GEMINI_API_KEY") || checkApiKey("GOOGLE_AI_STUDIO_API_KEY")) {
    table.transcript_processing.push(
      { provider: "gemini", model: "gemini-2.0-flash", call: geminiCall },
    );
    table.brand_voice_learning.push(
      { provider: "gemini", model: "gemini-2.0-flash", call: geminiCall },
    );
    table.post_generation.push(
      { provider: "gemini", model: "gemini-2.0-flash", call: geminiCall },
    );
    table.article_generation.push(
      { provider: "gemini", model: "gemini-2.0-flash", call: geminiCall },
    );
    table.carousel_generation.push(
      { provider: "gemini", model: "gemini-2.0-flash", call: geminiCall },
    );
    table.content_calendar.push(
      { provider: "gemini", model: "gemini-2.0-flash", call: geminiCall },
    );
    table.transcript_analysis.push(
      { provider: "gemini", model: "gemini-2.0-flash", call: geminiCall },
    );
  }

  if (checkApiKey("OPENROUTER_API_KEY")) {
    table.transcript_processing.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
    table.brand_voice_learning.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
    table.post_generation.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
    table.article_generation.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
      { provider: "openrouter", model: "meta-llama/llama-3.1-70b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "meta-llama/llama-3.1-70b-instruct") },
    );
    table.carousel_generation.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
    table.content_calendar.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
    table.transcript_analysis.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
    table.posts_generation.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
    table.articles_calendar_generation.push(
      { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", call: (req: CompletionRequest) => openrouterCallWithModel(req, "qwen/qwen-2.5-72b-instruct") },
    );
  }

  if (checkApiKey("GROQ_API_KEY")) {
    table.transcript_processing.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.brand_voice_learning.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.post_generation.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.carousel_generation.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.rewrite_edit.push(
      { provider: "groq", model: "mixtral-8x7b-32768", call: (req: CompletionRequest) => groqCallWithModel(req, "mixtral-8x7b-32768") },
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.hook_generation.push(
      { provider: "groq", model: "mixtral-8x7b-32768", call: (req: CompletionRequest) => groqCallWithModel(req, "mixtral-8x7b-32768") },
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.content_calendar.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.transcript_analysis.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.posts_generation.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
    table.articles_calendar_generation.push(
      { provider: "groq", model: "llama-3.3-70b-versatile", call: (req: CompletionRequest) => groqCallWithModel(req, "llama-3.3-70b-versatile") },
    );
  }

  if (checkApiKey("CEREBRAS_API_KEY")) {
    table.post_generation.push(
      { provider: "cerebras", model: "gpt-oss-120b", call: cerebrasCall },
    );
    table.carousel_generation.push(
      { provider: "cerebras", model: "gpt-oss-120b", call: cerebrasCall },
    );
    table.posts_generation.push(
      { provider: "cerebras", model: "gpt-oss-120b", call: cerebrasCall },
    );
  }

  if (checkApiKey("MISTRAL_API_KEY")) {
    table.carousel_generation.push(
      { provider: "mistral", model: "mistral-small-latest", call: mistralCall },
    );
    table.rewrite_edit.push(
      { provider: "mistral", model: "mistral-small-latest", call: mistralCall },
    );
    table.hook_generation.push(
      { provider: "mistral", model: "mistral-small-latest", call: mistralCall },
    );
    table.posts_generation.push(
      { provider: "mistral", model: "mistral-small-latest", call: mistralCall },
    );
  }

  if (checkApiKey("THORBASE_API_KEY")) {
    table.transcript_processing.push(
      { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
    );
    table.brand_voice_learning.push(
      { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
    );
    table.post_generation.push(
      { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
      { provider: "tokengo", model: "deepseek-v4-pro", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-pro") },
    );
    table.carousel_generation.push(
      { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
    );
    table.content_calendar.push(
      { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
    );
    table.transcript_analysis.push(
      { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
    );
    table.posts_generation.push(
      { provider: "tokengo", model: "deepseek-v4-flash", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-flash") },
    );
    table.articles_calendar_generation.push(
      { provider: "tokengo", model: "deepseek-v4-pro", call: (req: CompletionRequest) => tokengoCallWithModel(req, "deepseek-v4-pro") },
    );
  }

  return table;
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

function getOllamaFallbackModel(taskType: TaskType): string {
  const analysisTasks: TaskType[] = ["transcript_processing", "brand_voice_learning", "transcript_analysis"];
  const writingTasks: TaskType[] = ["post_generation", "article_generation", "carousel_generation", "posts_generation", "articles_calendar_generation"];
  
  if (analysisTasks.includes(taskType)) return OLLAMA_MODELS.analysis;
  if (writingTasks.includes(taskType)) return OLLAMA_MODELS.writing;
  return OLLAMA_MODELS.fast;
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

  const raceAbort = new AbortController();

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
      const result = await route.call({ ...request, signal: raceAbort.signal });
      return validateResult(result, route);
    } catch (err) {
      const statusCode = err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
      console.warn(`[model-router] ${route.provider}/${route.model} failed: ${err instanceof Error ? err.message : String(err)}`);
      
      // If Ollama model is not found, try fallback model
      if (route.provider === "ollama" && err instanceof Error && (err.message.includes("not found") || err.message.includes("404") || err.message.includes("model not found"))) {
        const fallbackModel = getOllamaFallbackModel(taskType);
        if (fallbackModel !== route.model) {
          console.log(`[model-router] Ollama model ${route.model} not found, trying fallback: ${fallbackModel}`);
          try {
            const { callOllama } = await import("./providers/ollama");
            const fallbackResult = await callOllama(fallbackModel, messages, { expectJson, maxTokens, temperature: 0.7, signal: raceAbort.signal });
            return validateResult(fallbackResult, { ...route, model: fallbackModel });
          } catch (fallbackErr) {
            console.warn(`[model-router] Fallback model ${fallbackModel} also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
          }
        }
      }
      return null;
    }
  }

  const firstRoute = routes[0];
  const requestWithSignal = { ...request, signal: raceAbort.signal };

  // If first route is Ollama, try it first (no race) — it's the primary provider
  if (firstRoute.provider === "ollama") {
    console.log(`[model-router] Ollama is primary for ${taskType}, trying first...`);
    const ollamaResult = await tryRoute(firstRoute);
    if (ollamaResult) {
      raceAbort.abort();
      return ollamaResult;
    }
    console.log(`[model-router] Ollama failed for ${taskType}, falling back to cloud providers...`);
    // Fall through to try remaining cloud providers below
  }

  // For non-Ollama first routes, or after Ollama fails: try remaining routes
  for (const route of routes.slice(firstRoute.provider === "ollama" ? 1 : 0)) {
    const result = await tryRoute(route);
    if (result) return result;
  }

  throw new Error(`[model-router] All providers failed for ${taskType}`);
}
