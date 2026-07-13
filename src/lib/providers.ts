export interface ProviderModel {
  id: string;
  label: string;
}

export interface Provider {
  id: string;
  label: string;
  baseUrl: string;
  envKey: string;
  models: ProviderModel[];
}

export const PROVIDERS: Provider[] = [
  {
    id: "freetheai",
    label: "FreeTheAI",
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
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    envKey: "GROQ_API_KEY",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Fast)" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    envKey: "GEMINI_API_KEY",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    envKey: "OPENROUTER_API_KEY",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" },
      { id: "deepseek/deepseek-r1:free", label: "DeepSeek R1 (Free)" },
      { id: "mistralai/mistral-small-3.1-24b-instruct:free", label: "Mistral Small 3.1 (Free)" },
      { id: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B (Free)" },
    ],
  },
  {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    envKey: "CEREBRAS_API_KEY",
    models: [
      { id: "llama-3.3-70b", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b", label: "Llama 3.1 8B (Fast)" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    envKey: "MISTRAL_API_KEY",
    models: [
      { id: "mistral-small-latest", label: "Mistral Small" },
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "open-mixtral-8x22b", label: "Mixtral 8x22B" },
    ],
  },
  {
    id: "sambanova",
    label: "SambaNova",
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
