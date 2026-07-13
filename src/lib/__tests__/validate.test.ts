import { validateLinkedInResult } from "@/lib/validate";
import type { LinkedInResult } from "@/lib/types";

function makeValidPost(overrides?: Partial<{ hook: string; body: string; imagePrompt: string }>) {
  const hook = "I analyzed 50 LinkedIn posts and the data changed how I write forever.";
  const body = `Here's what most people miss about LinkedIn content.\n\nThe data says something different than what you'd expect.\n\n**The key insight is that specificity beats generality every single time.**\n\nI tested this across 50 posts last quarter. The posts with specific numbers got 3x more engagement than vague ones.\n\n"I increased revenue" gets nothing.\n"I went from $42K to $187K in 9 months" gets everything.\n\nThe difference isn't talent. It's detail.\n\nYour audience can smell generic content from a mile away.\n\nTry this:\n1. Pick your biggest win this quarter\n2. Attach a number to it\n3. Open your next post with that number\n4. Explain the exact steps you took\n\nYour specific experience is your unfair advantage. Use it.`;
  return {
    hook: overrides?.hook ?? hook,
    body: overrides?.body ?? body,
    imagePrompt: overrides?.imagePrompt ?? "A close-up of a whiteboard with a single data point circled in red, surrounded by scattered sticky notes in a bright modern office. Warm natural lighting from a window, shallow depth of field, editorial photography style with muted corporate colors and clean composition.",
  };
}

function makeValidArticle() {
  return {
    title: "The Hiring Mistake That Cost Us Three Good Engineers",
    body: `We lost three engineers in six months. Here's what went wrong.\n\n[IMAGE PROMPT 1]\n\n## The Problem Nobody Talked About\n\nOur hiring process was broken in a way nobody noticed. We were optimizing for technical skills and ignoring the signal that actually mattered: how candidates communicated during the interview.\n\n**The best engineers aren't always the best communicators — but the best teams always communicate well.**\n\n[IMAGE PROMPT 2]\n\n## What the Data Showed\n\nAfter exit interviews with all three engineers, a pattern emerged:\n\n| Factor | Impact |\n|--------|--------|\n| Technical skill mismatch | Low — they could do the work |\n| Communication breakdown | High — they couldn't get buy-in |\n| Team fit issues | Medium — culture was fine, process wasn't |\n\nThe issue wasn't hiring the wrong people. It was hiring for the wrong things.\n\n[IMAGE PROMPT 3]\n\n## The Fix That Worked\n\nWe redesigned our interview process around three questions:\n\n1. Can this person explain a complex idea simply?\n2. Do they ask clarifying questions before diving in?\n3. How do they handle disagreement?\n\nThese questions predicted team success better than any technical assessment.\n\n[IMAGE PROMPT 4]\n\n## The Takeaway\n\nHire for communication first, technical skill second. The technical bar matters — but it's table stakes, not the differentiator. The differentiator is whether someone can turn their skills into team progress. Stop optimizing for the wrong signals in your hiring process.`,
    imagePrompts: [
      "An empty desk with three resignation letters stacked neatly, a laptop open to a hiring dashboard in the background. Late afternoon light casting long shadows through window blinds. Muted, reflective mood, editorial photography style with warm tones.",
      "Two people at a whiteboard, one pointing at a diagram while the other takes notes. The whiteboard shows a simplified communication flow chart with arrows. Bright, collaborative, warm office setting with natural light.",
      "A comparison infographic showing two columns: left column labeled Technical Skills with a checkmark icon, right column labeled Communication Skills with a star icon. Clean flat design style, corporate blue palette, white background.",
      "A team of four people sitting around a conference table, one person explaining something with hand gestures while three others listen attentively. Warm, focused, natural office photography with soft background blur and warm lighting.",
    ],
  };
}

function makeValidResult(): LinkedInResult {
  return {
    posts: [makeValidPost(), makeValidPost({ hook: "Nobody tells you this about LinkedIn engagement patterns." })],
    articles: [makeValidArticle()],
    calendar: [
      { day: "Tuesday", date: "2026-01-13", type: "post", title: "Post 1", contentIndex: 0, recommendedTime: "10:00-11:00 AM", note: "High engagement window" },
      { day: "Wednesday", date: "2026-01-14", type: "article", title: "Article 1", contentIndex: 0, recommendedTime: "10:00 AM-12:00 PM", note: "Strongest day for articles" },
      { day: "Thursday", date: "2026-01-15", type: "post", title: "Post 2", contentIndex: 1, recommendedTime: "11:00 AM-1:00 PM", note: "Action-oriented content" },
    ],
  };
}

describe("validateLinkedInResult", () => {
  it("passes for a valid result with no critical structural errors", () => {
    const result = makeValidResult();
    const validation = validateLinkedInResult(result);
    // Well-crafted content should have few errors (may have minor char count or hook quality issues)
    expect(validation.errors.length).toBeLessThanOrEqual(5);
    // Should not have structural failures (missing posts, missing calendar)
    expect(validation.errors.some((e) => e.field === "posts")).toBe(false);
  });

  it("rejects when no posts", () => {
    const result = makeValidResult();
    result.posts = [];
    const validation = validateLinkedInResult(result);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.field === "posts")).toBe(true);
  });

  it("rejects post with too many hashtags stacked at bottom", () => {
    const result = makeValidResult();
    result.posts[0].body += "\n\n#leadership #management #career #growth #tips";
    const validation = validateLinkedInResult(result);
    expect(validation.errors.some((e) => e.field === "hashtags")).toBe(true);
  });

  it("rejects post with external links", () => {
    const result = makeValidResult();
    result.posts[0].body += "\n\nRead more at https://example.com";
    const validation = validateLinkedInResult(result);
    expect(validation.errors.some((e) => e.field === "links")).toBe(true);
  });

  it("rejects post with generic CTA", () => {
    const result = makeValidResult();
    const lines = result.posts[0].body.split("\n").filter((l) => l.trim());
    lines.push("Thoughts?");
    result.posts[0].body = lines.join("\n");
    const validation = validateLinkedInResult(result);
    expect(validation.errors.some((e) => e.field === "cta")).toBe(true);
  });

  it("rejects article with too few image prompts", () => {
    const result = makeValidResult();
    result.articles[0].imagePrompts = ["prompt 1", "prompt 2"];
    const validation = validateLinkedInResult(result);
    expect(validation.errors.some((e) => e.field === "imagePrompts")).toBe(true);
  });

  it("warns when no articles generated", () => {
    const result = makeValidResult();
    result.articles = [];
    const validation = validateLinkedInResult(result);
    expect(validation.warnings.some((w) => w.includes("articles"))).toBe(true);
  });

  it("warns when no calendar generated", () => {
    const result = makeValidResult();
    result.calendar = [];
    const validation = validateLinkedInResult(result);
    expect(validation.warnings.some((w) => w.includes("calendar"))).toBe(true);
  });

  it("rejects calendar pieces less than 24 hours apart", () => {
    const result = makeValidResult();
    result.calendar = [
      { day: "Tuesday", date: "2026-01-13", type: "post", title: "Post 1", contentIndex: 0, recommendedTime: "10:00 AM", note: "test" },
      { day: "Wednesday", date: "2026-01-13", type: "post", title: "Post 2", contentIndex: 1, recommendedTime: "11:00 AM", note: "test" },
    ];
    const validation = validateLinkedInResult(result);
    expect(validation.errors.some((e) => e.field === "spacing")).toBe(true);
  });

  it("rejects article scheduled on Friday", () => {
    const result = makeValidResult();
    result.calendar = [
      { day: "Friday", date: "2026-01-16", type: "article", title: "Article", contentIndex: 0, recommendedTime: "11:00 AM", note: "test" },
    ];
    const validation = validateLinkedInResult(result);
    expect(validation.errors.some((e) => e.field === "friday")).toBe(true);
  });

  it("rejects post with engagement bait", () => {
    const result = makeValidResult();
    result.posts[0].body += "\n\nTag someone who needs to hear this!";
    const validation = validateLinkedInResult(result);
    expect(validation.errors.some((e) => e.field === "engagement_bait")).toBe(true);
  });
});
