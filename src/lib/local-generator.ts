import type { VideoInfo, LinkedInResult, LinkedInPost, LinkedInArticle, CalendarEntry, VideoScript, CarouselSlide } from "./types";
import { POSTING_SCHEDULE } from "./types";

function extractKeyPhrases(transcript: string): string[] {
  const words = transcript.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const stopWords = new Set(["this", "that", "with", "from", "they", "them", "their", "what", "when", "where", "which", "about", "would", "could", "should", "there", "these", "those", "your", "have", "been", "were", "just", "like", "very", "some", "more", "than", "into", "also", "here", "well", "only", "come", "make", "know", "take", "people", "think", "really", "going", "thing", "things", "about", "because", "through", "after", "before", "between", "under", "over", "does", "will", "each", "made", "want", "look", "first", "last", "back", "good", "much", "many", "most", "even", "still", "right", "left", "down", "keep", "being", "doing", "said", "tell", "told", "want", "give", "given", "every", "part", "help", "start", "show", "try", "way", "using", "used", "case", "work", "works", "time", "year", "years", "day", "days", "week", "months", "something", "actually", "different", "important", "another", "enough", "maybe", "often", "while", "whole", "however", "already", "let", "sure", "long", "small", "high", "made"]);
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stopWords.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 12).map(([w]) => w);
}

function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,.]*%?/g) || [];
  return [...new Set(matches)].slice(0, 6);
}

function extractSentences(text: string, minLen = 30): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length >= minLen).slice(0, 15);
}

function pick<T>(arr: T[], count: number, seed: number): T[] {
  const result: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count && i < arr.length; i++) {
    let idx = (seed + i * 7) % arr.length;
    let attempts = 0;
    while (used.has(idx) && attempts < arr.length) {
      idx = (idx + 1) % arr.length;
      attempts++;
    }
    used.add(idx);
    result.push(arr[idx]);
  }
  return result;
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function buildHook(keyphrase: string, numbers: string[]): string {
  const hooks = [
    `I tracked ${keyphrase} for 90 days. The data changed how I think about everything.`,
    `Most people get ${keyphrase} completely wrong. Here's what actually works.`,
    `${numbers[0] || "87%"} of people misunderstand ${keyphrase}. Here's the reality.`,
    `The biggest mistake I see with ${keyphrase}? Treating it like it's optional.`,
    `I spent 6 months studying ${keyphrase}. Here are 3 things nobody talks about.`,
    `Stop ignoring ${keyphrase}. Here's why it matters more than you think.`,
    `Nobody tells you this about ${keyphrase}, but it changes everything.`,
    `I tested ${keyphrase} for 6 months straight. The results surprised me.`,
    `The ${keyphrase} problem nobody is talking about — and how to fix it.`,
    `I analyzed ${numbers[0] || "hundreds of"} cases of ${keyphrase}. The pattern is clear.`,
  ];
  return hooks[Math.floor(Math.random() * hooks.length)];
}

function buildPostBody(keyphrase: string, sentences: string[], numbers: string[]): string {
  const detail = sentences[0] || `The data on ${keyphrase} tells a different story than what most people assume`;
  const stat = numbers[0] || "73%";
  const insight = sentences[1] || `When you look at the actual evidence, ${keyphrase} comes down to consistency and specificity`;

  return `Everyone has an opinion on ${keyphrase}. But opinions don't move the needle.

${detail}.

That single insight reframed how I approach ${keyphrase} entirely.

**The difference between average and exceptional comes down to one thing: specificity.**

Here's what I mean:

Most people treat ${keyphrase} as a checkbox. They do it because they feel they should, not because they have a system.

The ones who get real results — the ${stat} who actually see outcomes — do something different.

They get specific. They measure. They adjust.

${insight}.

That's not theory. That's what the data shows, repeatedly.

The question isn't whether ${keyphrase} matters. It's whether you're willing to be specific about how you do it.`;
}

function buildImagePrompt(keyphrase: string): string {
  const prompts = [
    `A split-screen conceptual image: left side shows a messy, chaotic workspace representing ${keyphrase} done wrong, right side shows a clean, organized approach with clear structure. The dividing line is a subtle arrow pointing right. Modern infographic style, white background with warm accent colors.`,
    `A close-up of a notebook page with ${keyphrase} written at the top, surrounded by specific data points, arrows, and a highlighted key insight. The page is slightly worn, suggesting real-world use. Warm, focused editorial photography style with shallow depth of field.`,
    `A conceptual illustration of a magnifying glass focused on the word "${keyphrase}" with blurred generic text around it. The focused area is sharp and colorful while the background fades to gray. Clean, minimal design style.`,
    `An overhead shot of a whiteboard with a clear framework drawn on it related to ${keyphrase}, with sticky notes in different colors marking key steps. The board is partially filled, suggesting active planning. Bright, natural light, productive atmosphere.`,
    `A data visualization showing an upward trend line with ${keyphrase} as the x-axis label. The chart uses warm gradient colors from blue to gold. Clean, modern infographic style on a white background with subtle grid lines.`,
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function buildArticleTitle(keyphrase: string): string {
  const titles = [
    `The ${keyphrase} Framework That Actually Delivers Results`,
    `Why ${keyphrase} Fails for Most People — And What Works Instead`,
    `A Practical Guide to ${keyphrase}: What the Data Actually Shows`,
    `${keyphrase}: The Mistakes I See Everyone Making (and How to Fix Them)`,
    `How to Get Real Results with ${keyphrase}: Lessons from 6 Months of Testing`,
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function buildArticleBody(keyphrase: string, sentences: string[], numbers: string[]): string {
  const stat = numbers[0] || "73%";
  const detail = sentences[0] || `The conventional wisdom on ${keyphrase} misses a critical piece`;
  const insight = sentences[1] || `When you dig into the actual data, the pattern becomes obvious`;

  return `## The ${keyphrase} Problem Nobody Solves

Most advice about ${keyphrase} sounds reasonable. It's also largely wrong.

${detail}. That's not an opinion — it's what happens when you look at the outcomes across ${numbers[1] || "hundreds of"} real-world cases.

[IMAGE PROMPT 1]

## What the Data Actually Shows

Here's what separates the ${stat} who get real results from everyone else:

| Approach | What Most People Do | What Works |
|----------|-------------------|------------|
| Strategy | Generic, one-size-fits-all | Specific to their context |
| Measurement | Vanity metrics | Outcome-based tracking |
| Consistency | Sporadic, reactive | Systematic, proactive |

The pattern is clear. ${insight}.

**The biggest unlock isn't doing more — it's doing the right things with precision.**

[IMAGE PROMPT 2]

## The Framework That Changes Everything

After studying ${keyphrase} across ${numbers[1] || "dozens of"} cases, I distilled it into three principles:

**Principle 1: Specificity beats volume.**

Every successful case of ${keyphrase} started with getting specific about what success looks like. Not "do better" — but exactly what, by how much, and by when.

**Principle 2: Feedback loops matter more than plans.**

The people who win at ${keyphrase} aren't the ones with the best initial plan. They're the ones who adjust fastest based on what they learn.

**Principle 3: Consistency compounds.**

${detail}. But the compound effect of consistent, specific action over ${numbers[2] || "90 days"} is what creates the gap between average and exceptional.

[IMAGE PROMPT 3]

## The Bottom Line

${keyphrase} isn't complicated. It's just specific.

Stop looking for shortcuts. Start looking for signal in the data. Get specific about what you're measuring. Adjust faster than everyone else.

That's not a hack. That's a system.`;
}

function buildArticleImagePrompts(keyphrase: string): string[] {
  return [
    `A conceptual image of a compass pointing specifically at "${keyphrase}" while generic landmarks blur in the background. Clean, modern illustration style with a warm color palette, suggesting precision and direction.`,
    `A close-up of a dashboard showing specific metrics and KPIs related to ${keyphrase}, with one key metric highlighted in amber. The screen is sharp and clear against a blurred office background. Professional, data-driven aesthetic.`,
    `An overhead view of a desk with a strategic plan laid out — sticky notes, a timeline, and a small plant suggesting growth. The plan is specific and actionable, not vague. Warm natural light, clean composition, editorial photography style.`,
  ];
}

export function generateFullLinkedInResponse(videoInfo: VideoInfo): LinkedInResult {
  const seed = hashCode(videoInfo.title + videoInfo.transcript.slice(0, 200));
  const keyphrases = extractKeyPhrases(videoInfo.transcript);
  const numbers = extractNumbers(videoInfo.transcript);
  const sentences = extractSentences(videoInfo.transcript);
  const primaryTopic = keyphrases[0] || "this approach";
  const secondaryTopic = keyphrases[1] || "the strategy";
  const thirdTopic = keyphrases[2] || "the process";

  const today = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const upcoming: { day: string; date: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = days[d.getDay()];
    if (["Tuesday", "Wednesday", "Thursday", "Friday"].includes(dayName)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      upcoming.push({ day: dayName, date: `${year}-${month}-${day}` });
    }
    if (upcoming.length >= 5) break;
  }

  const posts: LinkedInPost[] = [
    {
      hook: buildHook(primaryTopic, numbers),
      body: buildPostBody(primaryTopic, pick(sentences, 3, seed), pick(numbers, 3, seed)),
      imagePrompt: buildImagePrompt(primaryTopic),
    },
    {
      hook: buildHook(secondaryTopic, numbers),
      body: buildPostBody(secondaryTopic, pick(sentences, 3, seed + 1), pick(numbers, 3, seed + 1)),
      imagePrompt: buildImagePrompt(secondaryTopic),
    },
    {
      hook: buildHook(thirdTopic, numbers),
      body: buildPostBody(thirdTopic, pick(sentences, 3, seed + 2), pick(numbers, 3, seed + 2)),
      imagePrompt: buildImagePrompt(thirdTopic),
    },
    {
      hook: buildHook(primaryTopic, numbers),
      body: buildPostBody(primaryTopic, pick(sentences, 3, seed + 3), pick(numbers, 3, seed + 3)),
      imagePrompt: buildImagePrompt(primaryTopic),
    },
  ];

  const articles: LinkedInArticle[] = [
    {
      title: buildArticleTitle(primaryTopic),
      body: buildArticleBody(primaryTopic, pick(sentences, 3, seed + 4), pick(numbers, 3, seed + 4)),
      imagePrompts: buildArticleImagePrompts(primaryTopic),
    },
  ];

  const calendar: CalendarEntry[] = [];
  if (upcoming.length >= 4) {
    calendar.push({
      day: upcoming[0].day, date: upcoming[0].date, type: "post",
      title: posts[0].hook.slice(0, 60), contentIndex: 0,
      recommendedTime: "10:00-11:00 AM",
      note: `${upcoming[0].day} mid-morning — high engagement window for data-driven posts`,
    });
    calendar.push({
      day: upcoming[1].day, date: upcoming[1].date, type: "article",
      title: articles[0].title, contentIndex: 0,
      recommendedTime: "10:00 AM-12:00 PM",
      note: `${upcoming[1].day} is the strongest day for long-form articles`,
    });
    calendar.push({
      day: upcoming[2].day, date: upcoming[2].date, type: "post",
      title: posts[1].hook.slice(0, 60), contentIndex: 1,
      recommendedTime: "11:00 AM-1:00 PM",
      note: `${upcoming[2].day} mid-morning — practical, actionable content performs well`,
    });
    if (upcoming[3]) {
      calendar.push({
        day: upcoming[3].day, date: upcoming[3].date, type: "post",
        title: posts[2].hook.slice(0, 60), contentIndex: 2,
        recommendedTime: "11:00 AM",
        note: `${upcoming[3].day} early — lighter, reflective tone for end of week`,
      });
    }
  }

  return { posts, articles, calendar };
}

export function generateLocalVideoScript(videoInfo: VideoInfo): VideoScript {
  const keyphrases = extractKeyPhrases(videoInfo.transcript);
  const topic = keyphrases[0] || "this insight";

  return {
    sections: [
      {
        label: "Hook",
        timestamp: "0:00",
        duration: "3 sec",
        script: `Stop scrolling. This one thing about ${topic} changed everything for me.`,
        visual: "Face to camera, direct eye contact, slight lean forward",
        caption: "STOP SCROLLING",
      },
      {
        label: "Problem",
        timestamp: "0:03",
        duration: "7 sec",
        script: `Most people think ${topic} is about doing more. It's not. The problem isn't effort — it's precision. You're doing ${topic} without a system.`,
        visual: "B-roll of someone looking frustrated at a screen, overwhelmed",
        caption: "The problem isn't effort",
      },
      {
        label: "Solution",
        timestamp: "0:10",
        duration: "35 sec",
        script: `Here's what actually works with ${topic}. Get specific about what success looks like. Measure the right things — not vanity metrics, outcome metrics. And build a feedback loop that lets you adjust fast. I changed my approach to ${topic} and the results compounded within weeks. Not because I worked harder. Because I stopped being vague.`,
        visual: "Split screen: before (messy approach) vs after (structured system)",
        caption: "Specificity beats volume",
      },
      {
        label: "CTA",
        timestamp: "0:45",
        duration: "15 sec",
        script: `Try this for two weeks. Get specific, measure outcomes, adjust fast. Then tell me it doesn't work. Follow for more strategies backed by data, not guesswork.`,
        visual: "Point to follow button, then fade to profile",
        caption: "Follow for data-backed tips",
      },
    ],
    totalDuration: "60 seconds",
    platformNotes: "Works for Reels, TikTok, YouTube Shorts",
  };
}

export function generateLocalCarousel(videoInfo: VideoInfo): CarouselSlide[] {
  const keyphrases = extractKeyPhrases(videoInfo.transcript);
  const slides: CarouselSlide[] = [];

  slides.push({
    slideNumber: 1,
    title: `The ${keyphrases[0] || "truth"} nobody talks about`,
    body: `After studying ${keyphrases[0] || "this topic"} deeply, I found a pattern that changes everything. Swipe to see it.`,
    notes: "Hook slide — bold title, curiosity-driven",
  });

  const insights = [
    `${keyphrases[0] || "This approach"} works best when you get specific. Generic strategies produce generic results.`,
    `The data shows that ${keyphrases[1] || "consistency"} matters more than intensity. Small, specific actions compound over time.`,
    `Most people measure the wrong things. Track outcomes, not activity. That's where the real signal lives.`,
    `The biggest mistake is treating ${keyphrases[0] || "this"} as optional. It's a system, not a one-time task.`,
    `${keyphrases[2] || "Feedback loops"} are the secret weapon. The fastest learners aren't the smartest — they're the ones who adjust fastest.`,
    `Here's the framework: Get specific. Measure outcomes. Adjust fast. Repeat. That's it.`,
  ];

  for (let i = 0; i < Math.min(insights.length, 6); i++) {
    const parts = insights[i].split(". ");
    slides.push({
      slideNumber: i + 2,
      title: parts[0]?.slice(0, 50) || `Insight ${i + 1}`,
      body: parts.slice(1).join(". ").slice(0, 150) || insights[i],
      notes: `Key takeaway ${i + 1} — one idea per slide`,
    });
  }

  slides.push({
    slideNumber: slides.length + 1,
    title: "Save this for later",
    body: "Which insight resonated most? Drop a comment or save this carousel to revisit when you need it.",
    notes: "CTA slide — encourage saves and comments",
  });

  return slides;
}
