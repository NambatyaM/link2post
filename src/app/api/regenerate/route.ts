import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, buildRegeneratePrompt } from "@/lib/prompts";
import { MODELS } from "@/lib/constants";

async function streamCompletion(
  prompt: string,
  modelId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.FREETHEAI_KEY || "";
  const encoder = new TextEncoder();

  if (!apiKey) {
    return mockStream(encoder, `Mock regenerated content for: ${prompt.slice(0, 100)}`);
  }

  const modelsToTry = modelId
    ? [modelId, ...MODELS.filter((m) => m.id !== modelId).map((m) => m.id)]
    : MODELS.map((m) => m.id);

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.freetheai.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) continue;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === "string" && content.length > 0) {
                    if (firstChunk) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model })}\n\n`));
                      firstChunk = false;
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch { /* skip */ }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });
      return stream;
    } catch { continue; }
  }

  return mockStream(encoder, "Regenerated content (all models failed, using mock)");
}

function mockStream(encoder: TextEncoder, content: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { type, sourceContent, videoTitle } = await req.json();

    if (!type || !sourceContent || !videoTitle) {
      return Response.json({ error: "Missing type, sourceContent, or videoTitle." }, { status: 400 });
    }

    if (type !== "post" && type !== "article") {
      return Response.json({ error: "Type must be 'post' or 'article'." }, { status: 400 });
    }

    const prompt = buildRegeneratePrompt(type, sourceContent, videoTitle);
    const stream = await streamCompletion(prompt);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Regenerate error:", error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
