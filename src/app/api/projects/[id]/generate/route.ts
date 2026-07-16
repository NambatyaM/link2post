import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import { SYSTEM_PROMPT, buildYouTubePrompt } from "@/lib/prompts";
import { recordProviderFailure, clearProviderCooldown } from "@/lib/providers";
import { createThinkingFilter } from "@/lib/thinking-filter";
import { getRouteForTask } from "@/services/ai";
import { getProviderBaseUrl, getProviderApiKey, getProviderHeaders, parseSSEChunk } from "@/services/ai/providers/shared";
import type { VideoInfo } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { niche: _niche, audience, voiceProfilePrompt } = await req.json() as {
      niche?: string;
      audience?: string;
      voiceProfilePrompt?: string;
    };

    const supabase = getSupabaseServer();

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, title, raw_transcript, status")
      .eq("id", projectId)
      .eq("user_id", user.userId)
      .single();

    if (fetchError || !project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status === "completed") {
      return Response.json({ error: "Project already completed" }, { status: 400 });
    }

    const videoInfo: VideoInfo = {
      title: project.title,
      description: "",
      transcript: project.raw_transcript,
      url: "",
      videoId: "",
    };

    const routes = getRouteForTask("content_calendar");

    if (routes.length === 0) {
      return Response.json({ error: "No AI providers available" }, { status: 503 });
    }

    const encoder = new TextEncoder();
    let firstChunk = true;
    let accumulatedContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        for (const route of routes) {
          try {
            const userPrompt = buildYouTubePrompt(videoInfo, "UTC", audience, voiceProfilePrompt);
            const baseUrl = getProviderBaseUrl(route.provider);
            const apiKey = getProviderApiKey(route.provider);
            if (!apiKey) continue;

            const response = await fetch(baseUrl, {
              method: "POST",
              headers: getProviderHeaders(route.provider, apiKey),
              body: JSON.stringify({
                model: route.model,
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 4000,
                stream: true,
              }),
            });

            if (!response.ok || !response.body) {
              recordProviderFailure(route.provider);
              continue;
            }

            clearProviderCooldown(route.provider);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const filterThinking = createThinkingFilter();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                const result = parseSSEChunk(line);
                if (result.done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  await saveGeneratedContent(supabase, projectId, user.userId, accumulatedContent, "completed");
                  return;
                }
                if (result.content) {
                  const filtered = filterThinking(result.content);
                  if (filtered.length > 0) {
                    accumulatedContent += filtered;
                    if (firstChunk) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ model: route.model, provider: route.provider })}\n\n`),
                      );
                      firstChunk = false;
                    }
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: filtered })}\n\n`),
                    );
                  }
                }
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            await saveGeneratedContent(supabase, projectId, user.userId, accumulatedContent, "completed");
            return;
          } catch {
            continue;
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        await saveGeneratedContent(supabase, projectId, user.userId, accumulatedContent, accumulatedContent ? "completed" : "failed");
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Project generate error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function saveGeneratedContent(
  supabase: ReturnType<typeof getSupabaseServer>,
  projectId: string,
  userId: string,
  rawContent: string,
  status: "completed" | "failed",
) {
  try {
    await supabase
      .from("projects")
      .update({ status })
      .eq("id", projectId)
      .eq("user_id", userId);

    if (status === "completed" && rawContent) {
      let parsed: { posts?: Array<{ hook: string; body: string; imagePrompt: string; viralityScore?: number; authorityScore?: number; commentPotential?: number; readabilityScore?: number }>; articles?: Array<{ title: string; body: string; imagePrompts: string[] }> } | null = null;

      let cleaned = rawContent.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      try { parsed = JSON.parse(cleaned); } catch {
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          try { parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)); } catch { /* */ }
        }
      }

      if (parsed?.posts) {
        const rows = parsed.posts.map((post) => ({
          project_id: projectId,
          user_id: userId,
          content: post.hook + "\n\n" + post.body,
          hook: post.hook,
          post_type: "story",
          virality_score: post.viralityScore ?? 0,
          authority_score: post.authorityScore ?? 0,
          comment_potential: post.commentPotential ?? 0,
          readability_score: post.readabilityScore ?? 0,
          image_prompt: post.imagePrompt,
          status: "draft",
        }));

        if (rows.length > 0) {
          await supabase.from("posts").insert(rows);
        }
      }
    }
  } catch (e) {
    console.error("saveGeneratedContent error:", e);
  }
}
