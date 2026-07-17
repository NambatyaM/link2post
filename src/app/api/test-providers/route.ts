import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getProviderBaseUrl, getProviderApiKey, getProviderHeaders } from "@/services/ai/providers/shared";

const TEST_TIMEOUT_MS = 15_000;

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { provider: requestedProvider } = (await req.json()) as { provider?: string };

    const tryProviders = [
      { id: "gemini", envKey: "GEMINI_API_KEY", model: "gemini-2.0-flash" },
      { id: "groq", envKey: "GROQ_API_KEY", model: "llama-3.3-70b-versatile" },
      { id: "openrouter", envKey: "OPENROUTER_API_KEY", model: "qwen/qwen-2.5-72b-instruct" },
      { id: "cerebras", envKey: "CEREBRAS_API_KEY", model: "llama-3.3-70b" },
      { id: "mistral", envKey: "MISTRAL_API_KEY", model: "mistral-small-latest" },
      { id: "tokengo", envKey: "THORBASE_API_KEY", model: "deepseek-v4-flash" },
    ];

    const providers = requestedProvider
      ? tryProviders.filter((p) => p.id === requestedProvider)
      : tryProviders;

    const results: Array<{ provider: string; model: string; status: string; latencyMs?: number; error?: string; content?: string }> = [];

    for (const p of providers) {
      const apiKey = getProviderApiKey(p.id);
      if (!apiKey) {
        results.push({ provider: p.id, model: p.model, status: "no_key" });
        continue;
      }

      const baseUrl = getProviderBaseUrl(p.id);
      const start = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

      try {
        console.log(`[diagnostic] Testing ${p.id}/${p.model}`);
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: getProviderHeaders(p.id, apiKey),
          body: JSON.stringify({
            model: p.model,
            messages: [{ role: "user", content: "Say exactly: OK" }],
            temperature: 0,
            max_tokens: 20,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);
        const latencyMs = Date.now() - start;

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          results.push({ provider: p.id, model: p.model, status: `HTTP_${response.status}`, latencyMs, error: errText.slice(0, 200) });
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        results.push({ provider: p.id, model: p.model, status: "ok", latencyMs, content: content.slice(0, 100) });
      } catch (err) {
        clearTimeout(timer);
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ provider: p.id, model: p.model, status: "error", latencyMs: Date.now() - start, error: msg });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
