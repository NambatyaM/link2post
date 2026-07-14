import type { VideoInfo, LinkedInResult, LinkedInPost, LinkedInArticle, CalendarEntry, VideoScript, CarouselSlide } from "./types";

function extractSentences(text: string, minLen = 25): string[] {
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen && s.split(/\s+/).length >= 5);
}

function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,.]*%?/g) || [];
  return [...new Set(matches)].slice(0, 8);
}

function extractKeyphrases(transcript: string): string[] {
  const words = transcript.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const stopWords = new Set(["this", "that", "with", "from", "they", "them", "their", "what", "when", "where", "which", "about", "would", "could", "should", "there", "these", "those", "your", "have", "been", "were", "just", "like", "very", "some", "more", "than", "into", "also", "here", "well", "only", "come", "make", "know", "take", "people", "think", "really", "going", "thing", "things", "about", "because", "through", "after", "before", "between", "under", "over", "does", "will", "each", "made", "want", "look", "first", "last", "back", "good", "much", "many", "most", "even", "still", "right", "left", "down", "keep", "being", "doing", "said", "tell", "told", "want", "give", "given", "every", "part", "help", "start", "show", "try", "way", "using", "used", "case", "work", "works", "time", "year", "years", "day", "days", "week", "months", "something", "actually", "different", "important", "another", "enough", "maybe", "often", "while", "whole", "however", "already", "let", "sure", "long", "small", "high", "made"]);
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stopWords.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);
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

function buildHookFromTranscript(sentences: string[], numbers: string[], seed: number): string {
  const bestSentence = sentences[seed % sentences.length] || "This changes everything";
  const truncated = bestSentence.length > 80 ? bestSentence.slice(0, 77) + "..." : bestSentence;
  const num = numbers[seed % numbers.length] || "";

  const patterns = [
    `"${truncated}"`,
    num ? `${num} — and here's why that matters:` : `"${truncated}" — here's why that matters:`,
    `I couldn't ignore this: "${truncated.toLowerCase()}"`,
    `This stuck with me: "${truncated.toLowerCase()}"`,
    `"${truncated}" — most people miss this.`,
  ];

  return patterns[seed % patterns.length];
}

function buildPostBodyFromTranscript(
  topicSentences: string[],
  allSentences: string[],
  numbers: string[],
  seed: number,
): string {
  const hook = topicSentences[0] || allSentences[0] || "This insight changed my perspective.";
  const detail1 = topicSentences[1] || allSentences[1 + seed % Math.max(1, allSentences.length - 1)] || "The evidence is clear when you look at it honestly.";
  const detail2 = topicSentences[2] || allSentences[2 + seed % Math.max(1, allSentences.length - 2)] || "And the results speak for themselves.";
  const num = numbers[seed % numbers.length] || "";

  const paragraphs: string[] = [];
  paragraphs.push(hook.endsWith(".") ? hook : hook + ".");
  paragraphs.push("");
  paragraphs.push(detail1.endsWith(".") ? detail1 : detail1 + ".");
  paragraphs.push("");
  if (num) {
    paragraphs.push(`The numbers back this up: ${num}.`);
    paragraphs.push("");
  }
  paragraphs.push(detail2.endsWith(".") ? detail2 : detail2 + ".");
  paragraphs.push("");
  paragraphs.push("This isn't theory. This is what actually works when you pay attention to the details.");

  return paragraphs.join("\n");
}

function buildImagePromptFromTranscript(sentence: string, keyphrase: string): string {
  const shortSentence = sentence.length > 60 ? sentence.slice(0, 57) + "..." : sentence;
  return `A clean, minimal visual showing: "${shortSentence}" — modern editorial style, warm tones, professional LinkedIn aesthetic, slight depth of field, text overlay with the key insight.`;
}

function buildArticleBodyFromTranscript(
  keyphrase: string,
  sentences: string[],
  numbers: string[],
): string {
  const s1 = sentences[0] || "The conventional approach misses something critical.";
  const s2 = sentences[1] || "When you dig into the details, the pattern becomes obvious.";
  const s3 = sentences[2] || "This is what separates those who get results from those who don't.";
  const s4 = sentences[3] || "The evidence points to one clear conclusion.";
  const s5 = sentences[4] || "And the compound effect is what matters most.";
  const n1 = numbers[0] || "";
  const n2 = numbers[1] || "";

  return `## The Core Insight

${s1}

That's not an opinion — it's what happens when you actually look at the outcomes. ${n1 ? `The data shows ${n1} across real-world cases.` : "The evidence is consistent across dozens of examples."}

[IMAGE PROMPT 1]

## What Most People Get Wrong

${s2}. ${n2 ? `Consider this: ${n2}.` : "The pattern is clear once you see it."}

Most approaches to ${keyphrase} fail because they focus on the wrong thing. They optimize for activity instead of outcomes. They measure what's easy instead of what matters.

**The real difference is specificity.**

| What Most People Do | What Actually Works |
|---------------------|-------------------|
| Generic strategies | Specific to their context |
| Vanity metrics | Outcome-based tracking |
| Sporadic effort | Systematic consistency |

## The Framework

${s3}

Here's what I've learned works:

**First:** Get specific about what success looks like. Not "do better" — exactly what, by how much, and by when.

**Second:** Build feedback loops. ${s4} The people who win aren't the ones with the best plan. They're the ones who adjust fastest.

**Third:** Let it compound. ${s5} Consistency over time creates the gap between average and exceptional.

[IMAGE PROMPT 2]

## The Bottom Line

${keyphrase} isn't complicated. It's specific.

Stop looking for shortcuts. Start looking for signal. Get specific about what you're measuring. Adjust faster than everyone else.

That's not a hack. That's a system.

[IMAGE PROMPT 3]`;
}

export function generateFullLinkedInResponse(videoInfo: VideoInfo): LinkedInResult {
  const seed = hashCode(videoInfo.title + videoInfo.transcript.slice(0, 300));
  const allSentences = extractSentences(videoInfo.transcript);
  const numbers = extractNumbers(videoInfo.transcript);
  const keyphrases = extractKeyphrases(videoInfo.transcript);
  const primaryTopic = keyphrases[0] || videoInfo.title || "this insight";

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

  const posts: LinkedInPost[] = [];
  for (let i = 0; i < 4; i++) {
    const topicSentences = pick(allSentences, 3, seed + i);
    posts.push({
      hook: buildHookFromTranscript(allSentences, numbers, seed + i),
      body: buildPostBodyFromTranscript(topicSentences, allSentences, numbers, seed + i),
      imagePrompt: buildImagePromptFromTranscript(topicSentences[0] || allSentences[0] || primaryTopic, primaryTopic),
    });
  }

  const articleSentences = pick(allSentences, 5, seed + 10);
  const articles: LinkedInArticle[] = [
    {
      title: `${primaryTopic.charAt(0).toUpperCase() + primaryTopic.slice(1)}: What the Evidence Actually Shows`,
      body: buildArticleBodyFromTranscript(primaryTopic, articleSentences, numbers),
      imagePrompts: [
        buildImagePromptFromTranscript(articleSentences[0] || "The core insight", primaryTopic),
        buildImagePromptFromTranscript(articleSentences[2] || "The framework", primaryTopic),
        buildImagePromptFromTranscript(articleSentences[4] || "The bottom line", primaryTopic),
      ],
    },
  ];

  const calendar: CalendarEntry[] = [];
  if (upcoming.length >= 4) {
    calendar.push({
      day: upcoming[0].day, date: upcoming[0].date, type: "post",
      title: posts[0].hook.slice(0, 60), contentIndex: 0,
      recommendedTime: "10:00-11:00 AM",
      note: `${upcoming[0].day} mid-morning — high engagement window`,
    });
    calendar.push({
      day: upcoming[1].day, date: upcoming[1].date, type: "article",
      title: articles[0].title, contentIndex: 0,
      recommendedTime: "10:00 AM-12:00 PM",
      note: `${upcoming[1].day} strongest day for long-form`,
    });
    calendar.push({
      day: upcoming[2].day, date: upcoming[2].date, type: "post",
      title: posts[1].hook.slice(0, 60), contentIndex: 1,
      recommendedTime: "11:00 AM-1:00 PM",
      note: `${upcoming[2].day} mid-morning — actionable content`,
    });
    if (upcoming[3]) {
      calendar.push({
        day: upcoming[3].day, date: upcoming[3].date, type: "post",
        title: posts[2].hook.slice(0, 60), contentIndex: 2,
        recommendedTime: "11:00 AM",
        note: `${upcoming[3].day} lighter tone for end of week`,
      });
    }
  }

  return { posts, articles, calendar };
}

export function generateLocalVideoScript(videoInfo: VideoInfo): VideoScript {
  const sentences = extractSentences(videoInfo.transcript);
  const keyphrases = extractKeyphrases(videoInfo.transcript);
  const topic = keyphrases[0] || videoInfo.title || "this";

  const hookSentence = sentences[0] || `Here's what most people get wrong about ${topic}`;
  const problemSentence = sentences[1] || `The issue isn't effort — it's precision`;
  const solutionSentences = sentences.slice(2, 5);
  const solution = solutionSentences.length > 0
    ? solutionSentences.join(". ")
    : `Get specific about what success looks like. Measure outcomes, not activity. Build feedback loops that let you adjust fast.`;

  return {
    sections: [
      {
        label: "Hook",
        timestamp: "0:00",
        duration: "3 sec",
        script: hookSentence.length > 100 ? hookSentence.slice(0, 97) + "..." : hookSentence,
        visual: "Face to camera, direct eye contact, slight lean forward",
        caption: "STOP SCROLLING",
      },
      {
        label: "Problem",
        timestamp: "0:03",
        duration: "7 sec",
        script: problemSentence,
        visual: "B-roll of someone looking frustrated at a screen",
        caption: "The real problem",
      },
      {
        label: "Solution",
        timestamp: "0:10",
        duration: "35 sec",
        script: solution,
        visual: "Split screen: before vs after",
        caption: "Here's what actually works",
      },
      {
        label: "CTA",
        timestamp: "0:45",
        duration: "15 sec",
        script: `Try this and tell me it doesn't work. Follow for more.`,
        visual: "Point to follow button, then fade to profile",
        caption: "Follow for more",
      },
    ],
    totalDuration: "60 seconds",
    platformNotes: "Works for Reels, TikTok, YouTube Shorts",
  };
}

export function generateLocalCarousel(videoInfo: VideoInfo): CarouselSlide[] {
  const sentences = extractSentences(videoInfo.transcript);
  const keyphrases = extractKeyphrases(videoInfo.transcript);
  const topic = keyphrases[0] || videoInfo.title || "this";

  const slides: CarouselSlide[] = [];

  const hookSentence = sentences[0] || `The truth about ${topic} nobody talks about`;
  slides.push({
    slideNumber: 1,
    title: hookSentence.length > 50 ? hookSentence.slice(0, 47) + "..." : hookSentence,
    body: `Swipe to see what the data actually shows about ${topic}.`,
    notes: "Hook slide — bold, curiosity-driven",
  });

  const insightSentences = sentences.slice(1, 7);
  for (let i = 0; i < Math.min(insightSentences.length, 6); i++) {
    const s = insightSentences[i];
    const parts = s.split(/[,;:]/);
    slides.push({
      slideNumber: i + 2,
      title: parts[0]?.slice(0, 50) || `Insight ${i + 1}`,
      body: parts.slice(1).join(". ").slice(0, 150) || s.slice(0, 150),
      notes: `Key takeaway ${i + 1}`,
    });
  }

  if (slides.length < 4) {
    slides.push({
      slideNumber: slides.length + 1,
      title: `Why ${topic} matters`,
      body: `The evidence is clear. ${topic} isn't optional — it's a system.`,
      notes: "Supporting point",
    });
  }

  slides.push({
    slideNumber: slides.length + 1,
    title: "Save this",
    body: `Which insight about ${topic} resonated most? Save this carousel to revisit later.`,
    notes: "CTA slide",
  });

  return slides;
}
