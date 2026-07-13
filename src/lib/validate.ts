import type { LinkedInResult, LinkedInPost } from "./types";

export interface ValidationError {
  type: "post" | "article" | "calendar";
  index: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

const GENERIC_CTA_PATTERNS = [
  /^(thoughts\??|agree\??|what do you think\??|right\??|yes\??|no\??)$/i,
  /^(do you agree\??|share your thoughts|drop a comment|let me know)/i,
  /^(what are your thoughts\??|agree or disagree\??)/i,
];

const ENGAGEMENT_BAIT_PATTERNS = [
  /comment\s+(yes|agree|no)/i,
  /tag\s+someone/i,
  /repost\s+if/i,
  /share\s+this\s+if/i,
  /like\s+if/i,
  /follow\s+for\s+more/i,
];

const HOOK_QUALITY_INDICATORS = [
  /\d/, // contains a number
  /\?/, // contains a question
  /wrong|myth|actually|nobody tells you|unpopular|stop|mistake|secret|truth|real|actually/i,
];

function countHashtags(text: string): number {
  const matches = text.match(/#\w+/g);
  return matches ? matches.length : 0;
}

function isInlineHashtag(text: string): boolean {
  const lines = text.split("\n");
  const lastLine = lines[lines.length - 1].trim();
  // Check if hashtags are stacked at the bottom (more than 2 on last line)
  const lastLineHashtags = lastLine.match(/#\w+/g);
  if (lastLineHashtags && lastLineHashtags.length > 2) return false;
  return true;
}

function hasExternalLinks(text: string): boolean {
  return /https?:\/\//.test(text);
}

function hasEngagementBait(text: string): boolean {
  return ENGAGEMENT_BAIT_PATTERNS.some((p) => p.test(text));
}

function hasGenericCTA(body: string): boolean {
  const lines = body.split("\n").filter((l) => l.trim());
  const lastLine = lines[lines.length - 1]?.trim() || "";
  return GENERIC_CTA_PATTERNS.some((p) => p.test(lastLine));
}

function hasHookQuality(hook: string): boolean {
  const first40 = hook.slice(0, 40);
  return HOOK_QUALITY_INDICATORS.some((p) => p.test(first40));
}

function checkParagraphLength(body: string): string | null {
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim());
  for (let i = 0; i < paragraphs.length; i++) {
    const sentences = paragraphs[i]
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    if (sentences.length > 2) {
      return `Paragraph ${i + 1} has ${sentences.length} sentences (max 2).`;
    }
  }
  return null;
}

function validatePost(post: LinkedInPost, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const fullText = `${post.hook}\n\n${post.body}`;

  // Character count (1,000-1,300)
  if (fullText.length < 1000) {
    errors.push({
      type: "post",
      index,
      field: "length",
      message: `Post is ${fullText.length} characters (minimum 1,000).`,
    });
  }
  if (fullText.length > 1300) {
    errors.push({
      type: "post",
      index,
      field: "length",
      message: `Post is ${fullText.length} characters (maximum 1,300).`,
    });
  }

  // Hashtag count (0-2, inline)
  const hashtagCount = countHashtags(fullText);
  if (hashtagCount > 2) {
    errors.push({
      type: "post",
      index,
      field: "hashtags",
      message: `Post has ${hashtagCount} hashtags (maximum 2).`,
    });
  }
  if (hashtagCount > 0 && !isInlineHashtag(fullText)) {
    errors.push({
      type: "post",
      index,
      field: "hashtags",
      message: "Hashtags are stacked at the bottom. Place them inline.",
    });
  }

  // External links
  if (hasExternalLinks(post.body)) {
    errors.push({
      type: "post",
      index,
      field: "links",
      message: "Post contains external links (not allowed).",
    });
  }

  // Hook quality
  if (!hasHookQuality(post.hook)) {
    errors.push({
      type: "post",
      index,
      field: "hook",
      message: "Hook doesn't contain a number, question, or contrarian framing in the first 40 characters.",
    });
  }

  // Generic CTA
  if (hasGenericCTA(post.body)) {
    errors.push({
      type: "post",
      index,
      field: "cta",
      message: "Post ends with a generic CTA (e.g. 'Thoughts?', 'Agree?'). End on the point or a specific question.",
    });
  }

  // Engagement bait
  if (hasEngagementBait(post.body)) {
    errors.push({
      type: "post",
      index,
      field: "engagement_bait",
      message: "Post contains engagement-bait phrases.",
    });
  }

  // Paragraph length
  const paraError = checkParagraphLength(post.body);
  if (paraError) {
    errors.push({
      type: "post",
      index,
      field: "paragraphs",
      message: paraError,
    });
  }

  // Image prompt quality
  if (!post.imagePrompt || post.imagePrompt.length < 30) {
    errors.push({
      type: "post",
      index,
      field: "imagePrompt",
      message: "Image prompt is too short or missing. It should be specific and visual.",
    });
  }

  const genericPrompts = [
    /professional.*image/i,
    /business.*stock/i,
    /corporate.*photo/i,
    /a person.*working/i,
    /team.*collaboration/i,
  ];
  if (genericPrompts.some((p) => p.test(post.imagePrompt))) {
    errors.push({
      type: "post",
      index,
      field: "imagePrompt",
      message: "Image prompt is too generic. Tie it to the specific content of the post.",
    });
  }

  return errors;
}

function validateArticle(article: { title: string; body: string; imagePrompts: string[] }, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Word count (800-1,500)
  const wordCount = article.body.split(/\s+/).length;
  if (wordCount < 800) {
    errors.push({
      type: "article",
      index,
      field: "length",
      message: `Article is ${wordCount} words (minimum 800).`,
    });
  }
  if (wordCount > 1500) {
    errors.push({
      type: "article",
      index,
      field: "length",
      message: `Article is ${wordCount} words (maximum 1,500).`,
    });
  }

  // Image prompt count (3-4)
  if (article.imagePrompts.length < 3) {
    errors.push({
      type: "article",
      index,
      field: "imagePrompts",
      message: `Article has ${article.imagePrompts.length} image prompts (minimum 3).`,
    });
  }
  if (article.imagePrompts.length > 4) {
    errors.push({
      type: "article",
      index,
      field: "imagePrompts",
      message: `Article has ${article.imagePrompts.length} image prompts (maximum 4).`,
    });
  }

  // Check for [IMAGE PROMPT N] markers in body
  const markerCount = (article.body.match(/\[IMAGE PROMPT \d+\]/g) || []).length;
  if (markerCount < 3) {
    errors.push({
      type: "article",
      index,
      field: "markers",
      message: `Article body has ${markerCount} [IMAGE PROMPT N] markers (need at least 3).`,
    });
  }

  // External links
  if (hasExternalLinks(article.body)) {
    errors.push({
      type: "article",
      index,
      field: "links",
      message: "Article contains external links (not allowed unless explicitly requested).",
    });
  }

  // Image prompt quality
  for (let i = 0; i < article.imagePrompts.length; i++) {
    const prompt = article.imagePrompts[i];
    if (!prompt || prompt.length < 30) {
      errors.push({
        type: "article",
        index,
        field: `imagePrompts[${i}]`,
        message: `Image prompt ${i + 1} is too short or missing.`,
      });
    }
  }

  return errors;
}

export function validateLinkedInResult(result: LinkedInResult): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validate posts
  if (!result.posts || result.posts.length === 0) {
    errors.push({ type: "post", index: -1, field: "posts", message: "No posts generated." });
  } else {
    for (let i = 0; i < result.posts.length; i++) {
      errors.push(...validatePost(result.posts[i], i));
    }
  }

  // Validate articles
  if (!result.articles || result.articles.length === 0) {
    warnings.push("No articles generated. Consider adding 1-2 articles.");
  } else {
    for (let i = 0; i < result.articles.length; i++) {
      errors.push(...validateArticle(result.articles[i], i));
    }
  }

  // Validate calendar
  if (!result.calendar || result.calendar.length === 0) {
    warnings.push("No calendar generated.");
  } else {
    // Check no two pieces < 24 hours apart
    const sorted = [...result.calendar].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const diffHours = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        errors.push({
          type: "calendar",
          index: i,
          field: "spacing",
          message: `"${sorted[i - 1].title}" and "${sorted[i].title}" are less than 24 hours apart.`,
        });
      }
    }

    // Check Wednesday has strongest piece
    const wednesday = result.calendar.find((c) => c.day === "Wednesday");
    if (wednesday && wednesday.type !== "article" && result.articles && result.articles.length > 0) {
      warnings.push("Wednesday doesn't have the article. Consider moving the strongest piece to Wednesday.");
    }

    // Check Friday only has lighter posts
    const friday = result.calendar.find((c) => c.day === "Friday");
    if (friday && friday.type === "article") {
      errors.push({
        type: "calendar",
        index: result.calendar.indexOf(friday),
        field: "friday",
        message: "Friday should not have an article. Schedule lighter content only.",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
