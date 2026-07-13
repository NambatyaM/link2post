import { LinkedInResult, POSTING_SCHEDULE, TIMEZONE_OPTIONS } from "@/lib/types";

describe("types", () => {
  it("POSTING_SCHEDULE has 4 days", () => {
    expect(POSTING_SCHEDULE).toHaveLength(4);
  });

  it("each posting slot has required fields", () => {
    for (const slot of POSTING_SCHEDULE) {
      expect(slot.day).toBeDefined();
      expect(slot.window).toBeDefined();
      expect(slot.bestFor).toBeDefined();
      expect(slot.note).toBeDefined();
    }
  });

  it("TIMEZONE_OPTIONS has entries", () => {
    expect(TIMEZONE_OPTIONS.length).toBeGreaterThan(10);
  });

  it("LinkedInResult interface matches expected shape", () => {
    const mock: LinkedInResult = {
      posts: [
        { hook: "Hook line", body: "Post body text", imagePrompt: "Image of a cat" },
      ],
      articles: [
        { title: "Article Title", body: "Article body", imagePrompts: ["Prompt 1", "Prompt 2"] },
      ],
      calendar: [
        { day: "Tuesday", date: "2026-01-13", type: "post", title: "Post title", contentIndex: 0, recommendedTime: "10:00 AM", note: "High engagement" },
      ],
    };
    expect(mock.posts).toHaveLength(1);
    expect(mock.posts[0].hook).toBe("Hook line");
    expect(mock.articles).toHaveLength(1);
    expect(mock.articles[0].imagePrompts).toHaveLength(2);
    expect(mock.calendar).toHaveLength(1);
    expect(mock.calendar[0].type).toBe("post");
  });
});
