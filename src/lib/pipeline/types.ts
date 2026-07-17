export interface AnalysisResult {
  cleaned_transcript: string;
  voice_profile: Record<string, unknown>;
  ideas: Array<{
    title: string; insight: string; quote: string;
    viralityScore: number; authorityScore: number; commentPotential: number; suggestedType: string;
  }>;
}

export interface PostsResult {
  posts: Array<{
    hook: string; body: string; imagePrompt: string; postType: string;
    viralityScore: number; authorityScore: number; commentPotential: number; readabilityScore: number;
  }>;
}

export interface ArticlesCalendarResult {
  articles: Array<{ title: string; body: string; imagePrompts: string[] }>;
  carousel: { title: string; slides: Array<{ slideNumber: number; title: string; body: string; notes: string }> };
  calendar: Array<{ day: string; date: string; type: string; title: string; contentIndex: number; recommendedTime: string; note: string }>;
}

export type CallAIResult = { content: string; provider: string; model: string; latencyMs: number };

export interface PostRow {
  hook: string; body: string; imagePrompt: string;
  viralityScore?: number; authorityScore?: number; commentPotential?: number; readabilityScore?: number;
}
