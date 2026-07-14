// Test all AI providers and models
// Run: node test-all-models.mjs

import { readFileSync } from "fs";

function loadEnv() {
  const env = {};
  const lines = readFileSync(".env.local", "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
  return env;
}

const env = loadEnv();

const PROVIDERS = [
  {
    id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1/chat/completions", envKey: "GROQ_API_KEY",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "qwen/qwen3-32b"],
  },
  {
    id: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", envKey: "GEMINI_API_KEY",
    models: ["gemini-2.5-flash"],
  },
  {
    id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1/chat/completions", envKey: "OPENROUTER_API_KEY",
    models: ["meta-llama/llama-3.3-70b-instruct:free", "nvidia/nemotron-3-super-120b-a12b:free", "google/gemma-4-31b-it:free", "qwen/qwen3-coder:free"],
  },
  {
    id: "cerebras", label: "Cerebras", baseUrl: "https://api.cerebras.ai/v1/chat/completions", envKey: "CEREBRAS_API_KEY",
    models: ["gpt-oss-120b", "gemma-4-31b"],
  },
  {
    id: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1/chat/completions", envKey: "MISTRAL_API_KEY",
    models: ["mistral-small-latest", "mistral-large-latest", "open-mixtral-8x22b"],
  },
  {
    id: "freetheai", label: "FreeTheAI", baseUrl: "https://api.freetheai.xyz/v1/chat/completions", envKey: "FREETHEAI_KEY",
    models: ["bbl/gemini-3.5-flash", "opc/nemotron-3-ultra-free", "bbl/gpt-5.5-mini", "opc/deepseek-v4-flash-free"],
  },
  {
    id: "sambanova", label: "SambaNova", baseUrl: "https://api.sambanova.ai/v1/chat/completions", envKey: "SAMBANOVA_API_KEY",
    models: ["Meta-Llama-3.3-70B-Instruct", "DeepSeek-V3-0324"],
  },
  {
    id: "nvidia", label: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions", envKey: "NVIDIA_API_KEY",
    models: ["nvidia/llama-3.3-nemotron-super-49b-v1", "nvidia/llama-3.1-8b-instruct"],
  },
];

const TEST_PROMPT = "Say exactly: 'Hello from [model name]'. Nothing else.";
const TIMEOUT_MS = 30000;

async function testModel(provider, model, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: TEST_PROMPT }],
        temperature: 0,
        max_tokens: 4000,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { status: "FAIL", error: `HTTP ${response.status}: ${body.slice(0, 200)}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return { status: "FAIL", error: `No content in response: ${JSON.stringify(data).slice(0, 200)}` };
    }

    return { status: "PASS", content: content.trim().slice(0, 100) };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      return { status: "FAIL", error: `Timeout after ${TIMEOUT_MS}ms` };
    }
    return { status: "FAIL", error: err.message };
  }
}

async function main() {
  console.log("Testing all AI providers and models...\n");

  const results = [];
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const provider of PROVIDERS) {
    const apiKey = env[provider.envKey];
    if (!apiKey) {
      console.log(`\n[${provider.label}] SKIPPED — no API key (${provider.envKey})`);
      for (const model of provider.models) {
        results.push({ provider: provider.label, model, status: "SKIP", error: "No API key" });
        skipCount++;
      }
      continue;
    }

    for (const model of provider.models) {
      process.stdout.write(`  [${provider.label}] ${model} ... `);
      const result = await testModel(provider, model, apiKey);
      if (result.status === "PASS") {
        console.log(`✓ PASS — "${result.content}"`);
        passCount++;
      } else {
        console.log(`✗ FAIL — ${result.error}`);
        failCount++;
      }
      results.push({ provider: provider.label, model, ...result });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  console.log("=".repeat(60));

  if (failCount > 0) {
    console.log("\nFAILED MODELS:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`  ${r.provider} / ${r.model}: ${r.error}`);
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main();
