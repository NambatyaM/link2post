// NOTE: For new code, use @/services/ai which provides task-based routing.
// This file is kept for backwards compatibility with existing API routes.

export interface ProviderModel {
  id: string;
  label: string;
}

export interface Provider {
  id: string;
  label: string;
  tagline: string;
  baseUrl: string;
  envKey: string;
  models: ProviderModel[];
}

const PROVIDER_COOLDOWN_MS = 60_000;
const providerFailures: Map<string, number> = (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).__providerFailures as Map<string, number>) || new Map();
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).__providerFailures = providerFailures;
}

export function recordProviderFailure(providerId: string): void {
  providerFailures.set(providerId, Date.now() + PROVIDER_COOLDOWN_MS);
}

export function clearProviderCooldown(providerId: string): void {
  providerFailures.delete(providerId);
}

function isProviderCoolingDown(providerId: string): boolean {
  const cooldownUntil = providerFailures.get(providerId);
  if (!cooldownUntil) return false;
  if (Date.now() >= cooldownUntil) {
    providerFailures.delete(providerId);
    return false;
  }
  return true;
}

export const FETCH_TIMEOUT_MS = 12_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export const PROVIDERS: Provider[] = [
  {
    id: "groq",
    label: "Groq",
    tagline: "Fastest",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    envKey: "GROQ_API_KEY",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
      { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
      { id: "qwen/qwen3-32b", label: "Qwen3 32B" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    tagline: "Longest context",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    envKey: "GEMINI_API_KEY",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    tagline: "Most models",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    envKey: "OPENROUTER_API_KEY",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" },
      { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super (Free)" },
      { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (Free)" },
      { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder (Free)" },
    ],
  },
  {
    id: "cerebras",
    label: "Cerebras",
    tagline: "Highest volume",
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    envKey: "CEREBRAS_API_KEY",
    models: [
      { id: "gpt-oss-120b", label: "GPT OSS 120B" },
      { id: "gemma-4-31b", label: "Gemma 4 31B" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    tagline: "Best quality",
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    envKey: "MISTRAL_API_KEY",
    models: [
      { id: "mistral-small-latest", label: "Mistral Small" },
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "open-mixtral-8x22b", label: "Mixtral 8x22B" },
    ],
  },
  {
    id: "freetheai",
    label: "FreeTheAI",
    tagline: "Multi-model",
    baseUrl: "https://api.freetheai.xyz/v1/chat/completions",
    envKey: "FREETHEAI_KEY",
    models: [
      { id: "bbl/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "opc/nemotron-3-ultra-free", label: "Nemotron 3 Ultra" },
      { id: "bbl/gpt-5.5-mini", label: "GPT-5.5 Mini" },
      { id: "opc/deepseek-v4-flash-free", label: "DeepSeek V4" },
    ],
  },
  {
    id: "sambanova",
    label: "SambaNova",
    tagline: "Fast + free",
    baseUrl: "https://api.sambanova.ai/v1/chat/completions",
    envKey: "SAMBANOVA_API_KEY",
    models: [
      { id: "Meta-Llama-3.3-70B-Instruct", label: "Llama 3.3 70B" },
      { id: "DeepSeek-V3-0324", label: "DeepSeek V3" },
    ],
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    tagline: "Enterprise",
    baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    envKey: "NVIDIA_API_KEY",
    models: [
      { id: "nvidia/llama-3.3-nemotron-super-49b-v1", label: "Nemotron Super 49B" },
      { id: "nvidia/llama-3.1-8b-instruct", label: "Llama 3.1 8B" },
    ],
  },
];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getProviderApiKey(provider: Provider): string {
  return process.env[provider.envKey] || "";
}

export function getActiveProviders(): { provider: Provider; apiKey: string; models: ProviderModel[] }[] {
  return PROVIDERS
    .map((provider) => ({
      provider,
      apiKey: getProviderApiKey(provider),
      models: provider.models,
    }))
    .filter((entry) => entry.apiKey.length > 0);
}

export interface ModelAttempt {
  provider: { baseUrl: string; label: string; id: string };
  model: string;
  apiKey: string;
}

export function buildAttempts(providerId?: string, modelId?: string): ModelAttempt[] {
  const selectedAttempts: ModelAttempt[] = [];
  const fallbackAttempts: ModelAttempt[] = [];

  if (providerId) {
    const resolved = resolveProviderAndModel(providerId, modelId);
    if (resolved && !isProviderCoolingDown(providerId)) {
      const primary = { provider: { baseUrl: resolved.provider.baseUrl, label: resolved.provider.label, id: resolved.provider.id }, model: resolved.model, apiKey: resolved.apiKey };
      selectedAttempts.push(primary);
      for (const m of resolved.provider.models) {
        if (m.id !== resolved.model && !isProviderCoolingDown(providerId)) {
          selectedAttempts.push({ provider: primary.provider, model: m.id, apiKey: resolved.apiKey });
        }
      }
    }
  }

  for (const provider of PROVIDERS) {
    if (provider.id === providerId) continue;
    const apiKey = getProviderApiKey(provider);
    if (!apiKey) continue;
    if (isProviderCoolingDown(provider.id)) continue;
    const base = { baseUrl: provider.baseUrl, label: provider.label, id: provider.id };
    for (const m of provider.models) {
      fallbackAttempts.push({ provider: base, model: m.id, apiKey });
    }
  }

  return [...selectedAttempts, ...fallbackAttempts];
}

export function getDefaultProvider(): { provider: Provider; modelId: string } | null {
  for (const provider of PROVIDERS) {
    const key = getProviderApiKey(provider);
    if (key) {
      return { provider, modelId: provider.models[0].id };
    }
  }
  return null;
}

export function resolveProviderAndModel(
  providerId?: string,
  modelId?: string,
): { provider: Provider; model: string; apiKey: string } | null {
  if (providerId) {
    const provider = getProvider(providerId);
    if (!provider) return null;
    const apiKey = getProviderApiKey(provider);
    if (!apiKey) return null;
    const model = modelId || provider.models[0].id;
    return { provider, model, apiKey };
  }

  const fallback = getDefaultProvider();
  if (!fallback) return null;
  const apiKey = getProviderApiKey(fallback.provider);
  return {
    provider: fallback.provider,
    model: modelId || fallback.modelId,
    apiKey,
  };
}
