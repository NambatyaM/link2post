import { RepurposeResult, PLATFORMS } from "@/lib/types";

describe("types", () => {
  it("PLATFORMS has all 9 entries", () => {
    expect(PLATFORMS).toHaveLength(9);
  });

  it("each platform has required fields", () => {
    for (const p of PLATFORMS) {
      expect(p.id).toBeDefined();
      expect(p.label).toBeDefined();
      expect(p.icon).toBeDefined();
      expect(p.color).toBeDefined();
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("RepurposeResult interface matches expected shape", () => {
    const mock: RepurposeResult = {
      twitter_thread: ["tweet1", "tweet2"],
      linkedin_story: "story",
      linkedin_listicle: "listicle",
      instagram_caption: "caption",
      instagram_carousel_titles: ["Slide 1"],
      tiktok_script: "script",
      reddit: { title: "title", body: "body", subreddits: ["sub1"] },
      email_digest: "digest",
      email_deep_dive: "deep dive",
      youtube_community: "community",
      content_calendar: [{ day: "Monday", platform: "Twitter", post: "post" }],
      hashtags: { twitter: ["#tag"], linkedin: ["#tag"], instagram: ["#tag"] },
    };
    expect(mock.twitter_thread).toHaveLength(2);
    expect(mock.reddit.subreddits).toHaveLength(1);
  });
});
