import { routeTask } from "@/services/ai";

export interface VoiceProfile {
  tone: string[];
  avg_sentence_length: string;
  formatting_style: string[];
  vocabulary_traits: string[];
  common_phrases: string[];
  favorite_emojis: string[];
  personality_summary: string;
}

const VOICE_ANALYSIS_PROMPT = `You are an expert voice and tone analyst for LinkedIn content creation.

Analyze the following sample posts and produce a detailed voice profile that captures the author's unique writing style.

---SAMPLE POSTS---
{sample_posts}

---INSTRUCTIONS---
Analyze the posts for:
1. **Tone**: Identify 3-5 tone descriptors (e.g., "conversational but authoritative", "witty", "blunt", "empathetic", "provocative").
2. **Average Sentence Length**: Classify as "short" (under 15 words avg), "medium" (15-25 words avg), or "long" (25+ words avg).
3. **Formatting Style**: Note patterns like paragraph length, use of line breaks, bold text usage, emoji usage, list usage, etc.
4. **Vocabulary Traits**: Identify distinctive vocabulary choices — formality level, industry jargon, signature phrases, preferred words.
5. **Common Phrases**: List any recurring phrases or patterns the author uses regularly.
6. **Favorite Emojis**: List emojis the author frequently uses (if any).
7. **Personality Summary**: Write a 2-3 sentence summary of this person's writing personality.

Return ONLY valid JSON with this structure:
{
  "tone": ["tone1", "tone2", "tone3"],
  "avg_sentence_length": "short | medium | long",
  "formatting_style": ["style1", "style2"],
  "vocabulary_traits": ["trait1", "trait2", "trait3"],
  "common_phrases": ["phrase1", "phrase2"],
  "favorite_emojis": ["emoji1", "emoji2"],
  "personality_summary": "A brief summary of the author's writing personality."
}`;

export async function extractVoiceProfile(posts: string[]): Promise<VoiceProfile> {
  const samplePosts = posts
    .map((post, i) => `--- POST ${i + 1} ---\n${post}`)
    .join("\n\n");

  const prompt = VOICE_ANALYSIS_PROMPT.replace("{sample_posts}", samplePosts);

  const result = await routeTask("brand_voice_learning", prompt);

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        tone: parsed.tone || [],
        avg_sentence_length: parsed.avg_sentence_length || "medium",
        formatting_style: parsed.formatting_style || [],
        vocabulary_traits: parsed.vocabulary_traits || [],
        common_phrases: parsed.common_phrases || [],
        favorite_emojis: parsed.favorite_emojis || [],
        personality_summary: parsed.personality_summary || "",
      };
    }
  } catch { /* fall through */ }

  return {
    tone: ["professional"],
    avg_sentence_length: "medium",
    formatting_style: ["standard"],
    vocabulary_traits: [],
    common_phrases: [],
    favorite_emojis: [],
    personality_summary: "Could not fully analyze voice profile. Defaulting to professional tone.",
  };
}

export function formatVoiceProfileForPrompt(profile: VoiceProfile): string {
  return `---AUTHOR VOICE PROFILE---
Tone: ${profile.tone.join(", ")}
Sentence Style: ${profile.avg_sentence_length}
Formatting: ${profile.formatting_style.join(", ")}
Vocabulary: ${profile.vocabulary_traits.join(", ")}
Common Phrases: ${profile.common_phrases.join(", ")}
Favorite Emojis: ${profile.favorite_emojis.join(", ")}
Personality: ${profile.personality_summary}
---END VOICE PROFILE---

IMPORTANT: Match this author's voice exactly when generating content. Use their tone, vocabulary, sentence rhythm, and formatting patterns. Do not write in a generic corporate style.`;
}
