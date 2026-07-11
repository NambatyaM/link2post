import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";

describe("prompts", () => {
  it("SYSTEM_PROMPT contains all 8 platform outputs", () => {
    const platforms = [
      "twitter_thread",
      "linkedin_story",
      "linkedin_listicle",
      "instagram_caption",
      "tiktok_script",
      "reddit",
      "email_digest",
      "email_deep_dive",
      "youtube_community",
      "content_calendar",
      "hashtags",
    ];
    for (const p of platforms) {
      expect(SYSTEM_PROMPT).toContain(p);
    }
  });

  it("buildUserPrompt includes content, focus, and tone", () => {
    const result = buildUserPrompt("Some blog content", "marketing", "casual");
    expect(result).toContain("Some blog content");
    expect(result).toContain("FOCUS ANGLE: marketing");
    expect(result).toContain("TONE: casual");
  });

  it("buildUserPrompt omits focus and tone when empty", () => {
    const result = buildUserPrompt("Some content", "", "");
    expect(result).toContain("Some content");
    expect(result).not.toContain("FOCUS ANGLE:");
    expect(result).not.toContain("TONE:");
  });
});
