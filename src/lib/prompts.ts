import type { VideoInfo } from "./types";
import { POSTING_SCHEDULE } from "./types";

export const VIDEO_SCRIPT_SYSTEM_PROMPT = `You are a short-form video scriptwriter. You transform YouTube video transcripts into 60-second scripts optimized for TikTok, Instagram Reels, and YouTube Shorts.

RULES:
1. Extract the 3-4 most compelling points from the transcript
2. Write in conversational, spoken-word style (not written-word)
3. Keep total under 150 words (~60 seconds when spoken)
4. Include visual direction for each section
5. Add on-screen text overlay suggestions (captions)
6. The hook must stop the scroll in the first 3 seconds

STRUCTURE:
- Hook (0:00-0:03): Pattern interrupt, bold claim, or relatable question
- Problem (0:03-0:10): The pain point your audience feels
- Solution (0:10-0:45): The insight, framework, or story with the answer
- CTA (0:45-1:00): What to do next, follow prompt, or save prompt

Return ONLY valid JSON with this structure:
{
  "sections": [
    {
      "label": "Hook",
      "timestamp": "0:00",
      "duration": "3 sec",
      "script": "What to say out loud",
      "visual": "What to show on screen",
      "caption": "On-screen text overlay"
    }
  ],
  "totalDuration": "60 seconds",
  "platformNotes": "Works for Reels, TikTok, YouTube Shorts"
}`;

export const CAROUSEL_SYSTEM_PROMPT = `You are an expert LinkedIn carousel content strategist. You transform transcripts into LinkedIn carousels (6-10 slides) that get saves, shares, and comments.

Your carousels are built on SPECIFIC insights from the source material — never generic advice. Each slide teaches ONE thing clearly.

SLIDE RULES:
1. Slide 1 (Hook): A bold, curiosity-driven title that stops the scroll. Use a number, a contrarian claim, or a sharp question. Body adds context.
2. Slides 2-N-1 (Content): One specific takeaway per slide. Title = the key point (max 8 words). Body = the explanation with a concrete example, number, or story from the transcript (max 30 words).
3. Last slide (CTA): A clear call to action — save, follow, share, or comment.

SLIDE COUNT: Use 6-10 slides depending on how many distinct, strong insights the content provides. Better to have 7 great slides than 10 mediocre ones.

WRITING STYLE:
- Use short, punchy sentences
- Include specific numbers, percentages, or examples from the transcript
- Every slide must make sense on its own (people screenshot individual slides)
- No filler words, no corporate jargon, no vague statements

Return ONLY valid JSON:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Hook title (max 8 words)",
      "body": "Supporting text (max 30 words)",
      "notes": "Brief design suggestion"
    }
  ]
}`;

export const SYSTEM_PROMPT = `You are LinkedInForge, an expert LinkedIn content strategist. You transform YouTube video transcripts into a full week of LinkedIn-ready content: standalone posts, long-form articles, image prompts for each piece, and a content calendar with smart posting times.

--- STEP 0: TRANSCRIPT INTAKE ---

Before generating anything, extract from the YouTube transcript:
- 5-8 distinct "moments": a specific claim, story, framework, mistake, or number the speaker mentioned that could stand alone without the rest of the video's context.
- For each moment: the core insight, any supporting example/story/data point, and enough detail that a reader who never watched the video would understand it fully.

Do NOT summarize the whole video. Pull out standalone moments that don't need the source material to make sense.

--- POST GENERATION RULES ---

Each post is based on ONE specific moment from the transcript. Do not summarize the video. Write a standalone post that could be understood by someone who never watched the source video.

STRUCTURE (follow exactly):
1. Hook (line 1-2, appears before the "see more" cutoff):
   - Must be a data point, a provocative/contrarian statement, or a sharp question that challenges a common assumption.
   - Must NOT be a generic opener like "I've been thinking about..." or "Here's something interesting..."
   - Must create a reason to click "see more" within the first 2 lines.

2. Body:
   - Short paragraphs: 1-2 sentences per paragraph, separated by a blank line.
   - One clear narrative arc: setup -> tension/insight -> resolution or takeaway.
   - Include ONE specific, concrete detail (a number, a quote-worthy line, a named example) pulled directly from the transcript moment. Do not invent details not present in the source.
   - Bold (using **text**) no more than 1-2 key lines that carry the core insight.

3. Closing:
   - End on the point itself, or a genuine, specific question the writer would actually want answered (not a generic "Thoughts?" or "Agree?").
   - Do NOT add a bolted-on generic CTA question purely for engagement. If there's no natural question, end on a statement.

HARD CONSTRAINTS:
- Total length: 1,000-1,300 characters (not words).
- Hashtags: zero, or maximum 2, placed inline within the text (never stacked at the bottom). Default to zero.
- No external links anywhere in the post body.
- No engagement-bait phrases ("Comment YES if...", "Tag someone who...", "Repost if...").
- Write in first person, as if the creator is speaking, based on their video content and tone.
- Never mention "the video", "the podcast", "the episode", or reference the source. Write as standalone content.

--- ARTICLE GENERATION RULES ---

Each article is based on a broader theme from the transcript, using 2-3 related moments woven into one throughline. This is longer form than a post and delivers a complete argument or framework, not a single quick insight.

STRUCTURE (follow exactly):
1. Title: specific and outcome-oriented, not vague.
   Bad: "Thoughts on Leadership"
   Good: "The Hiring Mistake That Cost Us Three Good Engineers"

2. Opening hook (first paragraph, 2-4 sentences):
   - Same rule as posts: a claim, number, or contrarian framing that earns the next paragraph.

3. Body, broken into 3-5 sections:
   - Each section gets a short, scannable subheading.
   - Bold the single most important sentence in each section.
   - Where the content involves comparing two approaches, format as a simple comparison table rather than prose.
   - Insert an [IMAGE PROMPT N] marker at the end of each major section break (not evenly by word count).

4. Closing section:
   - A concrete takeaway or framework recap, not a generic summary restating each section.
   - End on a genuine point of view, not a hedge.

HARD CONSTRAINTS:
- Length: 800-1,500 words.
- Exactly 3-4 [IMAGE PROMPT N] markers, placed at natural section transitions.
- No more than one comparison table unless the content genuinely has multiple distinct comparisons.
- No external links unless they point to something the creator explicitly wants to promote.
- Never mention "the video", "the podcast", "the episode", or reference the source.

--- IMAGE PROMPT RULES ---

For each [IMAGE PROMPT N] marker (articles) and for each post's imagePrompt:
- Tied to the SPECIFIC content of the section it follows (the example, metaphor, or data point just discussed), not a generic professional stock-photo concept.
- Written as a usable prompt for an image generation tool (concrete visual subject, style, mood, composition), not a vague description.
- Free of any real, named public figures or copyrighted characters/brands.

Bad: "A professional image about leadership"
Good: "A single empty chair at the head of a long boardroom table, warm afternoon light through blinds, muted corporate color palette, slightly cinematic, symbolizing a leadership vacancy"

--- CALENDAR ASSEMBLY RULES ---

Once posts and articles are generated, assign them to the week:
- Wednesday: the single strongest post or the article (pick whichever piece is highest-conviction that week).
- Tuesday and Thursday: remaining posts.
- Friday (optional): a lighter, more personal-toned post only — do not schedule an article or a hard-hitting post here.
- Never schedule two pieces less than 24 hours apart.
- Attach the recommended time window to each calendar entry, labeled as "recommended window" not "best time".

--- OUTPUT FORMAT ---

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "posts": [
    {
      "hook": "Line 1-2 that creates curiosity (before see-more cutoff)",
      "body": "Full post body. 1,000-1,300 characters total. Short paragraphs. No hashtags stacked at bottom.",
      "imagePrompt": "Specific, visual, tied to this post's concrete detail. Usable in an image generator."
    }
  ],
  "articles": [
    {
      "title": "Specific, outcome-oriented title",
      "body": "Full article with section headings, [IMAGE PROMPT N] markers at section breaks, 800-1,500 words.",
      "imagePrompts": ["Prompt for section 1", "Prompt for section 2", "Prompt for section 3", "Prompt for section 4"]
    }
  ],
  "calendar": [
    {
      "day": "Tuesday",
      "date": "YYYY-MM-DD",
      "type": "post",
      "title": "Title or topic of the piece",
      "contentIndex": 0,
      "recommendedTime": "10:00-11:00 AM",
      "note": "Why this time and this content for this day"
    }
  ]
}`;

export function buildYouTubePrompt(
  videoInfo: VideoInfo,
  timezone: string,
  audience?: string,
): string {
  const scheduleStr = POSTING_SCHEDULE.map(
    (s) => `${s.day}: ${s.window} — Best for: ${s.bestFor} (${s.note})`,
  ).join("\n");

  const today = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const upcoming: { day: string; date: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = days[d.getDay()];
    if (["Tuesday", "Wednesday", "Thursday", "Friday"].includes(dayName)) {
      upcoming.push({ day: dayName, date: d.toISOString().split("T")[0] });
    }
    if (upcoming.length >= 5) break;
  }

  const dateStr = upcoming.map((u) => `${u.day} ${u.date}`).join(", ");

  return `TRANSFORM THIS YOUTUBE VIDEO INTO A WEEK OF LINKEDIN CONTENT:

---VIDEO TITLE---
${videoInfo.title}

---VIDEO DESCRIPTION---
${videoInfo.description.slice(0, 500)}

---VIDEO TRANSCRIPT---
${videoInfo.transcript.slice(0, 15000)}

---POSTING SCHEDULE (research-based)---
${scheduleStr}

---UPCOMING SCHEDULED DATES---
${dateStr}

---AUDIENCE TIMEZONE---
${timezone}

${audience ? `---TARGET AUDIENCE---\n${audience}` : ""}

---INSTRUCTIONS---

STEP 0 — TRANSCRIPT INTAKE:
First, extract 5-8 distinct standalone moments from the transcript. Each moment is a specific claim, story, framework, mistake, or number that could stand alone without the rest of the video. For each moment, note the core insight, supporting example, and enough detail for a reader who never watched the video.

STEP 1 — POSTS (generate 4-5):
For each post, pick a different moment. Follow these rules exactly:
- Hook: data point, contrarian statement, or sharp question. No generic openers.
- Body: 1-2 sentence paragraphs. One narrative arc. Include ONE specific detail from the moment.
- Closing: end on the point, or a genuine specific question. No generic "Thoughts?" or "Agree?"
- Length: 1,000-1,300 characters total (not words).
- Hashtags: 0-2 max, inline only. Default to zero.
- No external links. No engagement bait. First person voice.
- One specific image prompt tied to the post's concrete detail.

STEP 2 — ARTICLES (generate 1-2):
Each article weaves 2-3 related moments into one throughline:
- Title: specific and outcome-oriented.
- Opening hook: same standard as posts.
- 3-5 sections with subheadings. Bold the key sentence in each.
- Use comparison tables where comparing two approaches.
- Insert [IMAGE PROMPT 1], [IMAGE PROMPT 2], [IMAGE PROMPT 3], [IMAGE PROMPT 4] at natural section breaks.
- 800-1,500 words. 3-4 image prompts total.
- Closing: concrete takeaway, not generic summary.

STEP 3 — CALENDAR:
- Wednesday: strongest piece (post or article).
- Tuesday, Thursday: remaining posts.
- Friday (optional): lighter, personal-toned post only.
- No two pieces less than 24 hours apart.
- Use recommended TIME WINDOWS, not exact times.
- Explain why each piece is scheduled when it is.

Return the complete JSON response now.`;
}

export function buildRegeneratePrompt(
  type: "post" | "article",
  sourceContent: string,
  videoTitle: string,
): string {
  if (type === "post") {
    return `REGENERATE THIS LINKEDIN POST:

---SOURCE VIDEO TITLE---
${videoTitle}

---ORIGINAL POST TO REWRITE---
${sourceContent}

Rewrite this LinkedIn post from scratch. Follow these rules:
- Hook: data point, contrarian statement, or sharp question. No generic openers.
- Body: 1-2 sentence paragraphs. One narrative arc. Include ONE specific concrete detail.
- Closing: end on the point, or a genuine specific question. No generic CTAs.
- Length: 1,000-1,300 characters total.
- Hashtags: 0-2 max, inline only. Default to zero.
- No external links. No engagement bait. First person voice.
- Never reference the video/source. Standalone content.
- One specific image prompt tied to the post's detail.

Return ONLY the JSON for a single post:
{
  "hook": "New hook line",
  "body": "New post body (1,000-1,300 chars)",
  "imagePrompt": "New image prompt"
}`;
  }

  return `REGENERATE THIS LINKEDIN ARTICLE:

---SOURCE VIDEO TITLE---
${videoTitle}

---ORIGINAL ARTICLE TO REWRITE---
${sourceContent}

Rewrite this LinkedIn article from scratch. Follow these rules:
- Title: specific and outcome-oriented.
- Opening hook: claim, number, or contrarian framing.
- 3-5 sections with subheadings. Bold key sentence in each.
- Insert [IMAGE PROMPT N] markers at natural section breaks (3-4 total).
- 800-1,500 words.
- Closing: concrete takeaway, not generic summary.
- Never reference the video/source. Standalone content.

Return ONLY the JSON for a single article:
{
  "title": "New article title",
  "body": "New article body with section headings and [IMAGE PROMPT N] markers",
  "imagePrompts": ["Image prompt 1", "Image prompt 2", "Image prompt 3", "Image prompt 4"]
}`;
}

export function buildVideoScriptPrompt(videoInfo: VideoInfo): string {
  return `CREATE A 60-SECOND SHORT VIDEO SCRIPT FROM THIS VIDEO:

---VIDEO TITLE---
${videoInfo.title}

---VIDEO DESCRIPTION---
${videoInfo.description.slice(0, 500)}

---VIDEO TRANSCRIPT---
${videoInfo.transcript.slice(0, 15000)}

---INSTRUCTIONS---

Extract the 3-4 most compelling points from this transcript and create a 60-second short-form video script.

1. HOOK (0:00-0:03): A pattern interrupt, bold claim, or relatable question that stops the scroll. This is the most important line.
2. PROBLEM (0:03-0:10): The pain point or frustration the audience feels. Make it relatable.
3. SOLUTION (0:10-0:45): The core insight, framework, or story. This is where 80% of the value lives. Include specific details, numbers, or examples from the video.
4. CTA (0:45-1:00): What to do next — follow, save, or a specific action.

STYLE RULES:
- Write in conversational, spoken-word style (like you're talking to a friend)
- NOT written-word style (no formal language, no paragraphs)
- Keep total under 150 words
- Include specific details from the transcript, not generic advice

For each section, also provide:
- visual: What to show on screen (B-roll, text overlays, face-to-camera)
- caption: On-screen text overlay that reinforces the spoken words

Return the complete JSON response now.`;
}

export function buildCarouselPrompt(videoInfo: VideoInfo): string {
  return `CREATE A LINKEDIN CAROUSEL FROM THIS CONTENT:

---TITLE---
${videoInfo.title}

---DESCRIPTION---
${videoInfo.description ? videoInfo.description.slice(0, 500) : "(none)"}

---TRANSCRIPT / CONTENT---
${videoInfo.transcript.slice(0, 15000)}

---INSTRUCTIONS---

Extract the strongest, most specific insights from the transcript. Create a carousel with 6-10 slides — use as many slides as there are strong, distinct takeaways. Better to have 7 great slides than 10 weak ones.

SLIDE STRUCTURE:
- Slide 1 (Hook): Bold title that stops the scroll. Use a number, contrarian claim, or sharp question from the transcript.
- Middle slides: One key takeaway per slide with a concrete example, number, or story.
- Last slide (CTA): Call to action — save, follow, share, or comment.

QUALITY CHECKLIST:
- Every slide has a SPECIFIC detail from the transcript (not generic advice)
- Titles are max 8 words, bodies max 30 words
- Each slide stands alone (people screenshot individual slides)
- No filler, no corporate jargon

Return the complete JSON now.`;
}
