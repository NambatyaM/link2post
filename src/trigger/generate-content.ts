import { task, metadata } from "@trigger.dev/sdk/v3";
import { getSupabaseServer } from "@/lib/supabase-server";
import { buildYouTubePrompt, SYSTEM_PROMPT } from "@/lib/prompts";
import { buildAttempts, fetchWithTimeout, recordProviderFailure, clearProviderCooldown } from "@/lib/providers";
import { validateLinkedInResult } from "@/lib/validate";
import type { VideoInfo, LinkedInResult, LinkedInPost } from "@/lib/types";

interface GenerateContentPayload {
  projectId: string;
  userId: string;
  niche?: string;
  audience?: string;
  voiceProfilePrompt?: string;
}

async function updateProgress(step: string, progress: number, message: string) {
  metadata.set("progress", { step, progress, message });
  await metadata.flush();
}

export const generateContentTask = task({
  id: "generate-content",
  maxDuration: 120,
  run: async (payload: GenerateContentPayload, { ctx: _ctx }) => {
    const { projectId, userId, niche: _niche, audience, voiceProfilePrompt } = payload;
    const supabase = getSupabaseServer();

    // Step 1: Fetch project from Supabase
    await updateProgress("fetch_project", 5, "Fetching project data");

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, title, raw_transcript, status")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !project) {
      throw new Error("Project not found");
    }

    if (project.status === "completed") {
      throw new Error("Project already completed");
    }

    const videoInfo: VideoInfo = {
      title: project.title,
      description: "",
      transcript: project.raw_transcript,
      url: "",
      videoId: "",
    };

    // Step 2: Build the prompt
    await updateProgress("build_prompt", 15, "Building AI prompt");

    const userPrompt = buildYouTubePrompt(videoInfo, "UTC", audience, voiceProfilePrompt);

    // Step 3: Call the AI provider
    await updateProgress("call_ai", 25, "Calling AI provider");

    const attempts = buildAttempts();
    if (attempts.length === 0) {
      throw new Error("No AI providers available");
    }

    let rawContent = "";

    for (const attempt of attempts) {
      try {
        const response = await fetchWithTimeout(attempt.provider.baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${attempt.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: attempt.model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 8000,
          }),
        });

        if (!response.ok) {
          recordProviderFailure(attempt.provider.id);
          continue;
        }

        clearProviderCooldown(attempt.provider.id);

        const result = await response.json();
        rawContent = result.choices?.[0]?.message?.content || "";

        if (rawContent) {
          await updateProgress("call_ai", 50, `Response received from ${attempt.provider.label}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!rawContent) {
      throw new Error("All AI providers failed");
    }

    // Step 4: Parse and validate the response
    await updateProgress("validate", 60, "Validating generated content");

    let cleaned = rawContent.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: LinkedInResult | null = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        try {
          parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
        } catch {
          throw new Error("Failed to parse AI response as JSON");
        }
      }
    }

    if (!parsed) {
      throw new Error("No valid JSON found in AI response");
    }

    const validation = validateLinkedInResult(parsed);
    await updateProgress("validate", 70, `Validation ${validation.valid ? "passed" : "completed with warnings"}`);

    // Step 5: Save posts to Supabase
    await updateProgress("save_posts", 80, "Saving posts to database");

    const rows = parsed.posts.map((post: LinkedInPost) => ({
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

    // Step 6: Update project status to completed
    await updateProgress("complete", 95, "Updating project status");

    await supabase
      .from("projects")
      .update({ status: "completed" })
      .eq("id", projectId)
      .eq("user_id", userId);

    await updateProgress("complete", 100, "Content generation complete");

    return {
      projectId,
      postsCount: parsed.posts.length,
      articlesCount: parsed.articles?.length ?? 0,
      validationErrors: validation.errors.length,
      validationWarnings: validation.warnings,
    };
  },
  onFailure: async (payload: GenerateContentPayload, error: unknown, { ctx: _ctx }) => {
    const { projectId, userId } = payload;
    try {
      const supabase = getSupabaseServer();
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", projectId)
        .eq("user_id", userId);
    } catch (e) {
      console.error("Failed to update project status on failure:", e);
    }
  },
});
