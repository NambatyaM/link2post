import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, buildYouTubePrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { MODELS } from "@/lib/constants";
import { validateLinkedInResult, type ValidationError } from "@/lib/validate";
import type { VideoInfo, LinkedInResult } from "@/lib/types";

async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  modelId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.FREETHEAI_KEY || "";
  const encoder = new TextEncoder();

  if (!apiKey) {
    return mockStream(encoder, generateMockLinkedInResponse());
  }

  const modelsToTry = modelId
    ? [modelId, ...MODELS.filter((m) => m.id !== modelId).map((m) => m.id)]
    : MODELS.map((m) => m.id);

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        "https://api.freetheai.xyz/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 16000,
            stream: true,
          }),
        },
      );

      if (!response.ok || !response.body) continue;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;

                const data = trimmed.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === "string" && content.length > 0) {
                    if (firstChunk) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ model })}\n\n`),
                      );
                      firstChunk = false;
                    }
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
                    );
                  }
                } catch { /* skip malformed */ }
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        },
      });

      return stream;
    } catch {
      continue;
    }
  }

  return mockStream(encoder, generateMockLinkedInResponse());
}

function mockStream(
  encoder: TextEncoder,
  content: string,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

function generateMockLinkedInResponse(): string {
  const result: LinkedInResult = {
    posts: [
      {
        hook: "I analyzed 10,000 LinkedIn posts last quarter. The data contradicts everything you've been told about timing.",
        body: "Everyone says post at 8 AM on Tuesday.\n\nThe data says otherwise.\n\nHere's what I found after studying engagement patterns across 10,000 posts from creators with 10K-100K followers:\n\n**The highest engagement window isn't morning. It's 10 AM to noon on weekdays.**\n\nWhy? Professionals clear their inbox by 9:30. They take their first mental break around 10. That's when they scroll.\n\nBut here's the twist — Wednesday at 4 PM outperforms everything. The \"end of day\" scroll is real.\n\nThree things I changed:\n\n1. Moved all posts to 10 AM-12 PM window\n2. Saved my best piece for Wednesday afternoon\n3. Stopped posting on weekends entirely\n\nMy reach went up 340% in 60 days.\n\nNot because I wrote better content. Because I posted when people were actually looking.\n\nWhat time have you noticed your best engagement?",
        imagePrompt: "A digital clock face showing 10:00 AM, surrounded by floating LinkedIn engagement icons (likes, comments, shares) in varying sizes, with a subtle gradient from cool blue to warm gold suggesting the optimal window. Clean, modern data-visualization style, white background with soft shadows.",
      },
      {
        hook: "The best-performing LinkedIn post I ever wrote was 847 characters. Not 847 words.",
        body: "I used to write 2,000-word LinkedIn posts thinking more content = more value.\n\nI was wrong.\n\nThe algorithm doesn't reward length. It rewards completion rate.\n\n**If someone reads 100% of your 800-character post, that signals more value than someone reading 30% of your 3,000-character post.**\n\nHere's the math:\n- Average LinkedIn scroll speed: 1.7 seconds per post\n- Time to read 800 characters: ~15 seconds\n- Time to read 3,000 characters: ~55 seconds\n- Probability of finishing: 800 chars = high, 3,000 chars = low\n\nThe sweet spot I've found: 1,000-1,300 characters.\n\nLong enough to deliver value. Short enough that most people finish.\n\nI rewrote my top 20 posts at half the length. Engagement went up 180%.\n\nSame insights. Half the words. Double the impact.\n\nWhat's your sweet spot for post length?",
        imagePrompt: "A close-up of a phone screen showing a LinkedIn post with a visible character counter at 847, the text is crisp and readable, the background is a soft-focus coffee shop setting with warm ambient light. The composition emphasizes brevity and clarity, editorial photography style with a slight desaturated tone.",
      },
      {
        hook: "Nobody tells you this about LinkedIn: your first line is a contract with the reader.",
        body: "It promises something.\n\nEither you deliver on that promise, or you lose trust.\n\nMost people treat the hook as clickbait. A flashy line that has nothing to do with the body.\n\n**The hook isn't marketing. It's a commitment to the reader.**\n\nHere's how I write hooks now:\n\n1. Write the body first\n2. Find the single most specific, counterintuitive insight\n3. Turn that into a hook that creates curiosity\n4. Make sure the body delivers exactly what the hook promises\n\nExample:\nBody insight: \"We fired our top performer and revenue went up 40%\"\nBad hook: \"Sometimes you have to make tough decisions\"\nGood hook: \"We fired our best performer. Revenue went up 40% the next quarter.\"\n\nSame story. Different hook.\n\nThe first one gets scrolled past.\nThe second one gets clicked.\n\nThe difference isn't talent. It's specificity.\n\nWhat's the most specific hook you've ever written?",
        imagePrompt: "A magnifying glass held over a single highlighted line of text on a document, with the rest of the text blurred. The highlighted line glows with a subtle blue light. The background is a clean, minimal desk surface. Conceptual editorial style, shallow depth of field, cool-to-warm color transition.",
      },
    ],
    articles: [
      {
        title: "The LinkedIn Algorithm Isn't a Mystery — It's a Mirror",
        body: "After spending six months analyzing what separates top-performing LinkedIn content from everything else, I realized something uncomfortable: the algorithm isn't hiding your content. It's reflecting it.\n\n[IMAGE PROMPT 1]\n\n## The Signal Problem\n\nMost creators think the algorithm is a gatekeeper. It isn't. It's a distribution engine that amplifies signals. When your post gets 5 engagements in 10 minutes, it shows it to 50 more people. When those 50 generate 15 engagements, it scales further.\n\nThe algorithm doesn't decide if your content is good. Your audience does. The algorithm just decides how many people get to see that judgment.\n\n**The algorithm is an amplifier, not a judge.**\n\n[IMAGE PROMPT 2]\n\n## The Specificity Principle\n\nVague content gets vague engagement. Specific content gets saved, shared, and commented on.\n\nConsider these two approaches:\n\n| Approach | Example | Expected Engagement |\n|----------|---------|---------------------|\n| Generic | \"Here's what I learned about leadership\" | Low |\n| Specific | \"I fired my best performer. Revenue went up 40%.\" | High |\n\nNumbers, dates, names, and exact details make your content feel real rather than generic. The human brain is wired to engage with specifics, not abstractions.\n\n[IMAGE PROMPT 3]\n\n## The Consistency Multiplier\n\nOne viral post won't build your presence. Three posts per week, every week, for six months will.\n\nThe creators winning on LinkedIn aren't more talented — they're more consistent. And consistency compounds.\n\nHere's the framework that works:\n\n1. **Tuesday**: A standalone post with a specific insight\n2. **Wednesday**: Your strongest piece — article or power post\n3. **Thursday**: A post with a practical takeaway\n4. **Friday** (optional): Something lighter, more personal\n\nThat's 3-4 pieces per week. Not 7. Not 1. Just enough to stay visible without burning out.\n\n[IMAGE PROMPT 4]\n\n## The Bottom Line\n\nStop trying to hack the algorithm. Start creating content that earns engagement. The algorithm will do the rest.\n\nSpecificity gets attention. Consistency builds presence. The algorithm amplifies both.",
        imagePrompts: [
          "A split-screen conceptual image: left side shows a single LinkedIn post with 3 likes (dim, gray tones), right side shows the same post with 300 likes and a cascade of comment icons (bright, warm tones). The dividing line is a subtle upward arrow. Modern infographic style, clean white background, corporate blue accents.",
          "A close-up of a LinkedIn post being written on a laptop, with the cursor hovering over a specific number ($42K → $187K) that glows slightly. The surrounding text is slightly blurred. Warm, focused, editorial photography style with shallow depth of field.",
          "A minimalist weekly calendar grid on a whiteboard with three colorful sticky notes (Tuesday, Wednesday, Thursday) each with a small icon (lightbulb, star, checklist). Clean, organized, productive workspace. Shot from a slight overhead angle, natural light.",
          "A conceptual image of a small snowball at the top of a hill with a trail behind it, rolling into a larger snowball at the bottom. The hill is made of stacked LinkedIn post icons. Clean illustration style, blue and white palette, suggesting momentum and compounding growth.",
        ],
      },
    ],
    calendar: [
      { day: "Tuesday", date: "2026-01-13", type: "post", title: "The timing data post", contentIndex: 0, recommendedTime: "10:00-11:00 AM", note: "Tuesday mid-morning — high engagement window for standalone data-driven posts" },
      { day: "Wednesday", date: "2026-01-14", type: "article", title: "The LinkedIn Algorithm Isn't a Mystery — It's a Mirror", contentIndex: 0, recommendedTime: "10:00 AM-12:00 PM", note: "Wednesday is the strongest day for long-form articles" },
      { day: "Thursday", date: "2026-01-15", type: "post", title: "The character count post", contentIndex: 1, recommendedTime: "11:00 AM-1:00 PM", note: "Thursday mid-morning — practical, actionable content performs well" },
      { day: "Friday", date: "2026-01-16", type: "post", title: "The hook contract post", contentIndex: 2, recommendedTime: "11:00 AM", note: "Friday early — lighter, reflective tone for end of week" },
    ],
  };

  return JSON.stringify(result);
}

function parseAIResponse(raw: string): LinkedInResult | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try { return JSON.parse(cleaned) as LinkedInResult; } catch { /* */ }
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try { return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as LinkedInResult; } catch { /* */ }
  }
  return null;
}

function buildValidationFeedbackPrompt(
  originalPrompt: string,
  errors: ValidationError[],
): string {
  const errorList = errors
    .map((e) => `- [${e.type} ${e.index >= 0 ? `#${e.index + 1}` : ""}] ${e.field}: ${e.message}`)
    .join("\n");

  return `${originalPrompt}

---VALIDATION ERRORS TO FIX---

The previous response had these issues. Regenerate the COMPLETE response fixing ALL of these:

${errorList}

CRITICAL FIXES:
- Posts MUST be 1,000-1,300 characters (count carefully, not words)
- Posts MUST hook with a number, question, or contrarian word in the first 40 characters
- Posts MUST NOT end with generic CTAs like "Thoughts?" or "Agree?"
- Articles MUST be 800-1,500 words with [IMAGE PROMPT N] markers at section breaks
- All image prompts must be specific and visual, not generic

Return the complete corrected JSON response now.`;
}

export async function POST(req: NextRequest) {
  try {
    const { videoInfo, timezone, audience, model } = await req.json() as {
      videoInfo: VideoInfo;
      timezone: string;
      audience?: string;
      model?: string;
    };

    if (!videoInfo?.transcript || videoInfo.transcript.length < 100) {
      return Response.json(
        { error: "Video transcript is too short or missing." },
        { status: 400 },
      );
    }

    let userId: string | undefined;
    let plan: "anonymous" | "free" | "starter" | "pro" = "anonymous";

    const token = extractBearerToken(req);
    const deviceId = req.headers.get("x-device-id") || undefined;

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        userId = user.userId;
        plan = "free";
      }
    }

    const rateResult = await checkRateLimit({ userId, deviceId, plan });

    if (!rateResult.allowed) {
      return Response.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateResult) },
      );
    }

    const userPrompt = buildYouTubePrompt(videoInfo, timezone, audience);
    const stream = await streamCompletion(SYSTEM_PROMPT, userPrompt, model);

    recordGeneration({ userId, deviceId }).catch(() => {});

    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...getRateLimitHeaders(rateResult),
    };

    return new Response(stream, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error("Generate error:", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * Server-side validation function that can be used to validate
 * a parsed LinkedInResult before streaming to the client.
 * Exported for use in tests and potential future server-side retry logic.
 */
export async function generateAndValidate(
  videoInfo: VideoInfo,
  timezone: string,
  audience?: string,
  model?: string,
): Promise<{ result: LinkedInResult; validation: ReturnType<typeof validateLinkedInResult> }> {
  const apiKey = process.env.FREETHEAI_KEY || "";
  const userPrompt = buildYouTubePrompt(videoInfo, timezone, audience);

  if (!apiKey) {
    const mockResult = parseAIResponse(generateMockLinkedInResponse())!;
    return { result: mockResult, validation: validateLinkedInResult(mockResult) };
  }

  const modelsToTry = model
    ? [model, ...MODELS.filter((m) => m.id !== model).map((m) => m.id)]
    : MODELS.map((m) => m.id);

  for (const mdl of modelsToTry) {
    try {
      const response = await fetch("https://api.freetheai.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: mdl,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 16000,
          stream: false,
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") continue;

      const result = parseAIResponse(content);
      if (!result) continue;

      const validation = validateLinkedInResult(result);

      // If validation fails, retry once with error feedback
      if (!validation.valid) {
        const retryPrompt = buildValidationFeedbackPrompt(userPrompt, validation.errors);
        const retryResponse = await fetch("https://api.freetheai.xyz/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: mdl,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: retryPrompt },
            ],
            temperature: 0.7,
            max_tokens: 16000,
            stream: false,
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryContent = retryData.choices?.[0]?.message?.content;
          if (typeof retryContent === "string") {
            const retryResult = parseAIResponse(retryContent);
            if (retryResult) {
              return { result: retryResult, validation: validateLinkedInResult(retryResult) };
            }
          }
        }
      }

      return { result, validation };
    } catch {
      continue;
    }
  }

  const fallback = parseAIResponse(generateMockLinkedInResponse())!;
  return { result: fallback, validation: validateLinkedInResult(fallback) };
}
