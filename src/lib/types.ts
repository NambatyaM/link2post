export interface LinkedInPost {
  hook: string;
  body: string;
  imagePrompt: string;
  viralityScore?: number;
  authorityScore?: number;
  commentPotential?: number;
  readabilityScore?: number;
}

export interface LinkedInArticle {
  title: string;
  body: string;
  imagePrompts: string[];
}

export interface CalendarEntry {
  day: string;
  date: string;
  type: "post" | "article";
  title: string;
  contentIndex: number;
  recommendedTime: string;
  note: string;
  itemId?: string;
  feedback?: "up" | "down" | null;
}

export interface LinkedInResult {
  posts: LinkedInPost[];
  articles: LinkedInArticle[];
  calendar: CalendarEntry[];
}

export interface VideoInfo {
  title: string;
  description: string;
  transcript: string;
  url: string;
  videoId: string;
}

export type ContentType = "post" | "article" | "carousel" | "script";

export type PostStatus = "draft" | "approved" | "archived";

export type ProjectStatus = "processing" | "completed" | "failed";

export type SubscriptionTier = "free" | "pro" | "business";

export interface VoiceProfile {
  tone: string[];
  avgSentenceLength: "short" | "medium" | "long";
  formattingStyle: string[];
  vocabularyTraits: string[];
  commonPhrases: string[];
  favoriteEmojis: string[];
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  rawTranscript: string;
  status: ProjectStatus;
  createdAt: string;
}

export interface Post {
  id: string;
  projectId: string;
  content: string;
  postType: "story" | "educational" | "listicle" | "framework" | "case_study";
  viralityScore: number;
  imagePrompt: string;
  status: PostStatus;
  scheduledDate: string | null;
}

export interface VideoScriptSection {
  label: string;
  timestamp: string;
  duration: string;
  script: string;
  visual: string;
  caption: string;
}

export interface VideoScript {
  sections: VideoScriptSection[];
  totalDuration: string;
  platformNotes: string;
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  body: string;
  notes: string;
}

export interface PostingTimeSlot {
  day: string;
  window: string;
  bestFor: string;
  note: string;
}

export const POSTING_SCHEDULE: PostingTimeSlot[] = [
  { day: "Monday", window: "10:00-11:00 AM", bestFor: "Broad Appeal / Motivation / Story", note: "Start the week with inspiration" },
  { day: "Tuesday", window: "10:00-11:00 AM", bestFor: "Educational / Framework", note: "Mid-morning engagement peak" },
  { day: "Wednesday", window: "10:00 AM-12:00 PM", bestFor: "Case Study / Data / Contrarian", note: "Highest consistent performer" },
  { day: "Thursday", window: "10:00 AM-1:00 PM", bestFor: "Listicle / Resource", note: "Strong mid-morning window" },
  { day: "Friday", window: "11:00 AM", bestFor: "Personal / Reflection / Soft CTA", note: "Engagement drops after midday" },
];

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "GMT / London" },
  { value: "Europe/Berlin", label: "CET / Berlin" },
  { value: "Asia/Dubai", label: "GST / Dubai" },
  { value: "Asia/Kolkata", label: "IST / India" },
  { value: "Asia/Singapore", label: "SGT / Singapore" },
  { value: "Asia/Tokyo", label: "JST / Tokyo" },
  { value: "Africa/Nairobi", label: "EAT / Nairobi" },
  { value: "Africa/Lagos", label: "WAT / Lagos" },
  { value: "America/Sao_Paulo", label: "BRT / Sao Paulo" },
  { value: "Australia/Sydney", label: "AEST / Sydney" },
];

export const NICHE_OPTIONS = [
  "SaaS / Tech",
  "Coaching / Consulting",
  "Marketing / Agency",
  "Startup / Founder",
  "Finance / Investing",
  "Health / Wellness",
  "Education / Creator",
  "Real Estate",
  "E-commerce / DTC",
  "AI / Machine Learning",
  "Leadership / Management",
  "Sales / B2B",
  "Design / Creative",
  "Other",
];
