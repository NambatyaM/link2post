export function getProviderBaseUrl(provider: string): string {
  const urls: Record<string, string> = {
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    cerebras: "https://api.cerebras.ai/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
    tokengo: "https://api.tokengo.com/v1/chat/completions",
  };
  return urls[provider] || "";
}

export function getProviderApiKey(provider: string): string | undefined {
  const keys: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY,
    groq: process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    tokengo: process.env.THORBASE_API_KEY,
  };
  return keys[provider];
}

export function getProviderHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://link2post.app";
    headers["X-Title"] = "Link2Post";
  }
  return headers;
}

export function parseSSEChunk(line: string): { done: boolean; content: string | null; model?: string } {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("data: ")) {
    return { done: false, content: null };
  }
  const data = trimmed.slice(6);
  if (data === "[DONE]") {
    return { done: true, content: null };
  }
  try {
    const parsed = JSON.parse(data);
    const content = parsed.choices?.[0]?.delta?.content;
    if (typeof content === "string" && content.length > 0) {
      return { done: false, content };
    }
    return { done: false, content: null };
  } catch {
    return { done: false, content: null };
  }
}
