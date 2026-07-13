import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, buildYouTubePrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, recordGeneration } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { validateLinkedInResult, type ValidationError } from "@/lib/validate";
import { PROVIDERS, resolveProviderAndModel } from "@/lib/providers";
import type { VideoInfo, LinkedInResult } from "@/lib/types";

interface ModelAttempt {
  provider: { baseUrl: string; label: string; id: string };
  model: string;
  apiKey: string;
}

function buildAttempts(providerId?: string, modelId?: string): ModelAttempt[] {
  if (providerId) {
    const resolved = resolveProviderAndModel(providerId, modelId);
    if (!resolved) return [];
    const primary = { provider: { baseUrl: resolved.provider.baseUrl, label: resolved.provider.label, id: resolved.provider.id }, model: resolved.model, apiKey: resolved.apiKey };
    const rest = resolved.provider.models
      .filter((m) => m.id !== resolved.model)
      .map((m) => ({ provider: primary.provider, model: m.id, apiKey: resolved.apiKey }));
    return [primary, ...rest];
  }

  const attempts: ModelAttempt[] = [];
  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.envKey] || "";
    if (!apiKey) continue;
    const base = { baseUrl: provider.baseUrl, label: provider.label, id: provider.id };
    for (const m of provider.models) {
      attempts.push({ provider: base, model: m.id, apiKey });
    }
  }
  return attempts;
}

async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  providerId?: string,
  modelId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const attempts = buildAttempts(providerId, modelId);

  if (attempts.length === 0) {
    return mockStream(encoder, generateMockLinkedInResponse());
  }

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.provider.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${attempt.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 32000,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        console.error(`Stream: Model ${attempt.model} (${attempt.provider.label}) failed: status=${response.status}`);
        continue;
      }

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
                        encoder.encode(`data: ${JSON.stringify({ model: attempt.model, provider: attempt.provider.label })}\n\n`),
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
          } catch (e) {
            console.error(`Stream error for model ${attempt.model}:`, e);
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
        body: "After spending six months analyzing what separates top-performing LinkedIn content from everything else, I realized something uncomfortable: the algorithm isn't hiding your content. It's reflecting it.\n\n[IMAGE PROMPT 1]\n\n## The Signal Problem\n\nMost creators think the algorithm is a gatekeeper. It isn't. It's a distribution engine that amplifies signals. When your post gets 5 engagements in 10 minutes, it shows it to 50 more people. When those 50 generate 15 engagements, it scales further.\n\nThe algorithm doesn't decide if your content is good. Your audience does. The algorithm just decides how many people get to see that judgment.\n\n**The algorithm is an amplifier, not a judge.**\n\n[IMAGE PROMPT 2]\n\n## The Specificity Principle\n\nVague content gets vague engagement. Specific content gets saved, shared, and commented on.\n\nConsider these two approaches:\n\n| Approach | Example | Expected Engagement |\n|----------|---------|---------------------|\n| Generic | \"Here's what I learned about leadership\" | Low |\n| Specific | \"I fired my best performer. Revenue went up 40%.\" | High |\n\nNumbers, dates, names, and exact details make your content feel real rather than generic. The human brain is wired to engage with specifics, not abstractions.\n\n[IMAGE PROMPT 3]\n\n## The Consistency Multiplier\n\nOne viral post won't build your presence. Three posts per week, every week, for six months will.\n\nThe creators winning on LinkedIn aren't more talented — they're more consistent. And consistency compounds.\n\nHere's the framework that works:\n\n1. **Tuesday**: A standalone post with a specific insight\n2. **Wednesday**: Your strongest piece — article or power post\n3. **Thursday**: A post with a practical takeaway\n4. **Friday** (optional): Something lighter, more personal\n\nThat's 3-4 pieces per week. Not 7. Not 1. Just enough to stay visible without burning out.\n\n[IMAGE PROMPT 4]\n\n## The Bottom Line\n\nStop trying to hack the algorithm. Start understanding it. The moment you shift from \"How do I beat the algorithm?\" to \"How do I give the algorithm something worth amplifying?\" — everything changes.\n\nYour content is the signal. The algorithm is just the amplifier.",
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
    const { videoInfo, timezone, audience, provider: providerId, model: modelId, stream: wantStream } = await req.json() as {
      videoInfo: VideoInfo;
      timezone: string;
      audience?: string;
      provider?: string;
      model?: string;
      stream?: boolean;
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

    await recordGeneration({ userId, deviceId }).catch(() => {});

    if (wantStream === false) {
      const { result, validation } = await generateAndValidate(videoInfo, timezone, audience, providerId, modelId);
      const responseHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(rateResult),
      };
      return Response.json({ result, validation }, { status: 200, headers: responseHeaders });
    }

    const userPrompt = buildYouTubePrompt(videoInfo, timezone, audience);
    const stream = await streamCompletion(SYSTEM_PROMPT, userPrompt, providerId, modelId);

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

export async function generateAndValidate(
  videoInfo: VideoInfo,
  timezone: string,
  audience?: string,
  providerId?: string,
  modelId?: string,
): Promise<{ result: LinkedInResult; validation: ReturnType<typeof validateLinkedInResult> }> {
  const attempts = buildAttempts(providerId, modelId);
  const userPrompt = buildYouTubePrompt(videoInfo, timezone, audience);

  if (attempts.length === 0) {
    console.error("generateAndValidate: No providers available, falling back to mock");
    const mockResult = parseAIResponse(generateMockLinkedInResponse())!;
    return { result: mockResult, validation: validateLinkedInResult(mockResult) };
  }

  console.log(`generateAndValidate: ${attempts.length} models to try, starting with ${attempts[0].model} (${attempts[0].provider.label})`);

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.provider.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${attempt.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 32000,
          stream: false,
        }),
      });

      if (!response.ok) {
        console.error(`Model ${attempt.model} (${attempt.provider.label}) returned status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        console.error(`Model ${attempt.model} returned no content string`);
        continue;
      }

      const result = parseAIResponse(content);
      if (!result) {
        console.error(`Model ${attempt.model} response failed JSON parsing, preview:`, content.substring(0, 300));
        continue;
      }

      const validation = validateLinkedInResult(result);

      if (!validation.valid) {
        const retryPrompt = buildValidationFeedbackPrompt(userPrompt, validation.errors);
        const retryResponse = await fetch(attempt.provider.baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${attempt.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: attempt.model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: retryPrompt },
            ],
            temperature: 0.7,
            max_tokens: 32000,
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
    } catch (e) {
      console.error(`Error with model ${attempt.model}:`, e);
      continue;
    }
  }

  const fallback = parseAIResponse(generateMockLinkedInResponse())!;
  return { result: fallback, validation: validateLinkedInResult(fallback) };
}
