import { NextRequest } from "next/server";
import { routeTask } from "@/services/ai";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

const VOICE_PROFILE_ANALYSIS_PROMPT = `You are an expert brand voice analyst. Analyze the following content and create a comprehensive Brand Voice Profile.

---CONTENT---
{content}

---CONTENT TYPE---
{contentType}

---INSTRUCTIONS---
Analyze the content deeply and produce a detailed brand voice profile. Be specific and actionable — don't give generic advice.

Return ONLY valid JSON with this exact structure:
{
  "tone": ["3-5 tone descriptors, e.g. conversational, provocative, warm, authoritative, witty"],
  "personality": "2-3 sentence summary of this person's writing personality and what makes their voice unique",
  "vocabulary": ["3-5 vocabulary characteristics, e.g. jargon-free, uses metaphors, data-driven language"],
  "sentenceLength": "short | medium | long | varied",
  "ctaStyle": "Description of how this person typically ends posts and calls readers to action",
  "storytellingStyle": "Description of how this person tells stories — first person, third person, anecdotes, data-backed, etc.",
  "contentPillars": ["3-5 main topics/themes this person consistently writes about"],
  "targetAudience": "Who this person writes for — be specific about role, industry, company size",
  "formattingStyle": ["3-5 formatting patterns, e.g. 1-2 sentences per paragraph, uses line breaks between thoughts, starts with a hook question"],
  "commonPhrases": ["3-5 phrases or sentence starters this person uses regularly"],
  "favoriteEmojis": ["emojis this person uses, if any. Empty array if none."]
}`;

export async function POST(req: NextRequest) {
  try {
    const { content, contentType } = (await req.json()) as {
      content?: string;
      contentType?: string;
    };

    if (!content || content.trim().length < 100) {
      return Response.json(
        { error: "Please provide at least 100 words of content for accurate voice analysis." },
        { status: 400 },
      );
    }

    let userId: string | undefined;
    const token = extractBearerToken(req);
    if (token) {
      const user = await verifyToken(token);
      if (user) userId = user.userId;
    }

    const prompt = VOICE_PROFILE_ANALYSIS_PROMPT
      .replace("{content}", content.slice(0, 15000))
      .replace("{contentType}", contentType || "general");

    const result = await routeTask("brand_voice_learning", prompt);

    let profile: Record<string, unknown> = {};
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        profile = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, return a basic profile
    }

    const voicePrompt = buildVoicePrompt(profile);

    const response = {
      tone: (profile.tone as string[]) || ["professional"],
      personality: (profile.personality as string) || "A professional content creator.",
      vocabulary: (profile.vocabulary as string[]) || [],
      sentenceLength: (profile.sentenceLength as string) || "medium",
      ctaStyle: (profile.ctaStyle as string) || "",
      storytellingStyle: (profile.storytellingStyle as string) || "",
      contentPillars: (profile.contentPillars as string[]) || [],
      targetAudience: (profile.targetAudience as string) || "",
      formattingStyle: (profile.formattingStyle as string[]) || [],
      commonPhrases: (profile.commonPhrases as string[]) || [],
      favoriteEmojis: (profile.favoriteEmojis as string[]) || [],
      voicePrompt,
    };

    const hasRealData = Array.isArray(profile.tone) && profile.tone.length > 0;

    if (userId && hasRealData) {
      try {
        const supabase = getSupabaseServer(req, token ?? undefined);
        const { data: existing } = await supabase
          .from("brand_voice_profiles")
          .select("content_sources")
          .eq("user_id", userId)
          .maybeSingle();

        const existingSources: string[] = (existing?.content_sources as string[]) || [];
        const mergedSources = existingSources.includes(contentType || "general")
          ? existingSources
          : [...existingSources, contentType || "general"];

        await supabase.from("brand_voice_profiles").upsert({
          user_id: userId,
          tone: response.tone,
          personality: response.personality,
          vocabulary: response.vocabulary,
          sentence_length: response.sentenceLength,
          cta_style: response.ctaStyle,
          storytelling_style: response.storytellingStyle,
          content_pillars: response.contentPillars,
          target_audience: response.targetAudience,
          formatting_style: response.formattingStyle,
          common_phrases: response.commonPhrases,
          favorite_emojis: response.favoriteEmojis,
          content_sources: mergedSources,
          post_count_analyzed: content.split(/\n\n+/).length,
          voice_prompt: voicePrompt,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      } catch (e) {
        console.error("Failed to save voice profile to DB:", e);
      }
    }

    return Response.json(response);
  } catch (err) {
    console.error("Brand voice creation error:", err);
    return Response.json(
      { error: "Failed to analyze voice profile. Please try again." },
      { status: 500 },
    );
  }
}

function buildVoicePrompt(profile: Record<string, unknown>): string {
  const tone = (profile.tone as string[])?.join(", ") || "professional";
  const personality = profile.personality || "";
  const vocabulary = (profile.vocabulary as string[])?.join(", ") || "";
  const sentenceLength = profile.sentenceLength || "medium";
  const ctaStyle = profile.ctaStyle || "";
  const storytellingStyle = profile.storytellingStyle || "";
  const contentPillars = (profile.contentPillars as string[])?.join(", ") || "";
  const targetAudience = profile.targetAudience || "";
  const formattingStyle = (profile.formattingStyle as string[])?.join("; ") || "";
  const commonPhrases = (profile.commonPhrases as string[])?.join(", ") || "";
  const favoriteEmojis = (profile.favoriteEmojis as string[])?.join(" ") || "";

  return `---AUTHOR BRAND VOICE PROFILE---
Tone: ${tone}
Personality: ${personality}
Vocabulary: ${vocabulary}
Sentence Length: ${sentenceLength}
CTA Style: ${ctaStyle}
Storytelling Style: ${storytellingStyle}
Content Pillars: ${contentPillars}
Target Audience: ${targetAudience}
Formatting: ${formattingStyle}
Common Phrases: ${commonPhrases}
Emojis: ${favoriteEmojis}
---END BRAND VOICE PROFILE---

CRITICAL: Match this author's voice EXACTLY when generating content. Mirror their tone, vocabulary, sentence rhythm, formatting patterns, CTA style, and storytelling approach. Never write in a generic corporate style. The content should be indistinguishable from something this author would write themselves.`;
}
