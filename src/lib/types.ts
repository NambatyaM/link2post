export interface RepurposeResult {
  twitter_thread: string[];
  linkedin_story: string;
  linkedin_listicle: string;
  instagram_caption: string;
  instagram_carousel_titles: string[];
  tiktok_script: string;
  reddit: {
    title: string;
    body: string;
    subreddits: string[];
  };
  email_digest: string;
  email_deep_dive: string;
  youtube_community: string;
  content_calendar: {
    day: string;
    platform: string;
    post: string;
  }[];
  hashtags: {
    twitter: string[];
    linkedin: string[];
    instagram: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  result?: RepurposeResult;
  timestamp: Date;
}

export type Platform =
  | "twitter"
  | "linkedin_story"
  | "linkedin_listicle"
  | "instagram"
  | "tiktok"
  | "reddit"
  | "email"
  | "youtube"
  | "calendar";

export interface PlatformConfig {
  id: Platform;
  label: string;
  icon: string;
  color: string;
}

export const PLATFORMS: PlatformConfig[] = [
  { id: "twitter", label: "Twitter/X", icon: "𝕏", color: "#1da1f2" },
  { id: "linkedin_story", label: "LinkedIn Story", icon: "in", color: "#0a66c2" },
  { id: "linkedin_listicle", label: "LinkedIn List", icon: "in", color: "#0a66c2" },
  { id: "instagram", label: "Instagram", icon: "📷", color: "#e4405f" },
  { id: "tiktok", label: "TikTok Script", icon: "♪", color: "#ff0050" },
  { id: "reddit", label: "Reddit", icon: "r/", color: "#ff4500" },
  { id: "email", label: "Email", icon: "✉", color: "#10b981" },
  { id: "youtube", label: "YouTube", icon: "▶", color: "#ff0000" },
  { id: "calendar", label: "Calendar", icon: "📅", color: "#f59e0b" },
];
