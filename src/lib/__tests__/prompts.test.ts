import { SYSTEM_PROMPT, buildYouTubePrompt, buildRegeneratePrompt } from "@/lib/prompts";

describe("prompts", () => {
  it("SYSTEM_PROMPT contains all rule sections", () => {
    const sections = [
      "TRANSCRIPT INTAKE",
      "POST GENERATION RULES",
      "ARTICLE GENERATION RULES",
      "IMAGE PROMPT RULES",
      "CALENDAR ASSEMBLY RULES",
      "OUTPUT FORMAT",
    ];
    for (const s of sections) {
      expect(SYSTEM_PROMPT).toContain(s);
    }
  });

  it("SYSTEM_PROMPT contains post constraints", () => {
    expect(SYSTEM_PROMPT).toContain("1,000-1,300 characters");
    expect(SYSTEM_PROMPT).toContain("Hashtags: zero, or maximum 2");
    expect(SYSTEM_PROMPT).toContain("No external links");
    expect(SYSTEM_PROMPT).toContain("No engagement-bait");
    expect(SYSTEM_PROMPT).toContain("1-2 sentences per paragraph");
  });

  it("SYSTEM_PROMPT contains article constraints", () => {
    expect(SYSTEM_PROMPT).toContain("800-1,500 words");
    expect(SYSTEM_PROMPT).toContain("[IMAGE PROMPT N]");
    expect(SYSTEM_PROMPT).toContain("comparison table");
    expect(SYSTEM_PROMPT).toContain("3-5 sections");
  });

  it("SYSTEM_PROMPT contains calendar rules", () => {
    expect(SYSTEM_PROMPT).toContain("Wednesday");
    expect(SYSTEM_PROMPT).toContain("24 hours");
    expect(SYSTEM_PROMPT).toContain("recommended time window");
  });

  it("buildYouTubePrompt includes video info and timezone", () => {
    const result = buildYouTubePrompt(
      { title: "Test Video", description: "A test", transcript: "Hello world transcript", url: "https://youtube.com/watch?v=abc", videoId: "abc" },
      "America/New_York",
      "B2B founders",
    );
    expect(result).toContain("Test Video");
    expect(result).toContain("America/New_York");
    expect(result).toContain("B2B founders");
    expect(result).toContain("Hello world transcript");
    expect(result).toContain("STEP 0");
    expect(result).toContain("STEP 1");
    expect(result).toContain("STEP 2");
    expect(result).toContain("STEP 3");
  });

  it("buildYouTubePrompt works without audience", () => {
    const result = buildYouTubePrompt(
      { title: "Video", description: "Desc", transcript: "Transcript text here", url: "https://youtube.com/watch?v=x", videoId: "x" },
      "Europe/London",
    );
    expect(result).toContain("Video");
    expect(result).toContain("Europe/London");
    expect(result).not.toContain("TARGET AUDIENCE");
  });

  it("buildYouTubePrompt includes upcoming dates", () => {
    const result = buildYouTubePrompt(
      { title: "V", description: "D", transcript: "T", url: "u", videoId: "x" },
      "America/New_York",
    );
    expect(result).toContain("UPCOMING SCHEDULED DATES");
  });

  it("buildRegeneratePrompt for post includes rules", () => {
    const result = buildRegeneratePrompt("post", "Original post text", "My Video");
    expect(result).toContain("Original post text");
    expect(result).toContain("My Video");
    expect(result).toContain("1,000-1,300 characters");
    expect(result).toContain("No external links");
  });

  it("buildRegeneratePrompt for article includes rules", () => {
    const result = buildRegeneratePrompt("article", "Original article text", "My Video");
    expect(result).toContain("Original article text");
    expect(result).toContain("My Video");
    expect(result).toContain("800-1,500 words");
    expect(result).toContain("[IMAGE PROMPT N]");
  });
});
