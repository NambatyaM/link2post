import { NextRequest } from "next/server";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import { checkRateLimit, getRateLimitHeaders, getClientIp } from "@/lib/rate-limit";
import { verifyToken, extractBearerToken } from "@/lib/auth";

const UNAUTHENTICATED_LIMIT = 10;
const AUTHENTICATED_LIMIT = 50;
const AI_MODEL = "opc/deepseek-v4-flash-free";

async function streamFreeTheAi(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.FREETHEAI_KEY || "";

  const encoder = new TextEncoder();

  if (!apiKey) {
    const mock = generateMockResponse(prompt);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: mock })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
  }

  try {
    const response = await fetch("https://api.freetheai.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const mock = generateMockResponse(prompt);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: mock })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
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
                if (content && typeof content === "string") {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
                  );
                }
              } catch {
                // skip malformed JSON lines
              }
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
  } catch {
    const mock = generateMockResponse(prompt);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: mock })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
  }
}

function generateMockResponse(prompt: string): string {
  const content = prompt
    .replace(/---BEGIN CONTENT---[\s\S]*?---END CONTENT---/, "")
    .replace(/FOCUS ANGLE:.*/, "")
    .replace(/TONE:.*/, "")
    .replace(/REPURPOSE THIS CONTENT:/, "")
    .trim();

  const keyPoints = extractKeyPoints(content);

  return JSON.stringify({
    twitter_thread: [
      `\ud83e\uddf5 Most people miss this about ${keyPoints.topic}:\n\nHere's what actually works (thread) \ud83d\udc47`,
      `1/ ${keyPoints.mainInsight}\n\nThis changes everything about how you approach it.`,
      `2/ ${keyPoints.secondaryInsight}\n\nHere's why this matters more than people think.`,
      `3/ The biggest mistake people make?\n\n${keyPoints.commonMistake}\n\nStop doing this immediately.`,
      `4/ Here's what to do instead:\n\n${keyPoints.solution}\n\nThis is the framework that actually delivers results.`,
      `5/ Quick recap:\n\n\u2705 ${keyPoints.mainInsight}\n\u2705 ${keyPoints.solution}\n\nIf this was helpful, repost the first tweet to help others! \ud83d\udd04`,
    ],
    linkedin_story: `I used to struggle with ${keyPoints.topic}.\n\nEvery day, I'd ${keyPoints.commonMistake}.\n\nThen I discovered something that changed everything:\n\n\u2192 ${keyPoints.mainInsight}\n\nHere's what happened next:\n\n\u2022 ${keyPoints.secondaryInsight}\n\u2022 ${keyPoints.solution}\n\u2022 The results spoke for themselves\n\nThe lesson? Stop overcomplicating ${keyPoints.topic}.\n\nStart with what actually works.\n\nWhat's your biggest challenge with ${keyPoints.topic}? Drop it below \ud83d\udc47`,
    linkedin_listicle: `Stop wasting time on ${keyPoints.topic}.\n\nHere are 5 things that actually work:\n\n1\ufe0f\u20e3 ${keyPoints.mainInsight}\n   \u2192 This alone 3x'd my results\n\n2\ufe0f\u20e3 ${keyPoints.secondaryInsight}\n   \u2192 Most people overlook this completely\n\n3\ufe0f\u20e3 ${keyPoints.solution}\n   \u2192 Simple but incredibly effective\n\n4\ufe0f\u20e3 Focus on consistency over perfection\n   \u2192 Small daily actions compound fast\n\n5\ufe0f\u20e3 Measure what matters, not what's easy\n   \u2192 Track real outcomes, not vanity metrics\n\nSave this for later \u2014 you'll thank me. \ud83d\udd16\n\n# ${keyPoints.topic.replace(/\s+/g, "")} #Growth #Productivity`,
    instagram_caption: `Stop scrolling \u2014 this might change how you think about ${keyPoints.topic} \ud83d\udc47\n\nHere's the truth nobody tells you:\n\n${keyPoints.mainInsight}\n\nI used to ${keyPoints.commonMistake}.\n\nThen I learned ${keyPoints.solution}.\n\nThe difference was night and day.\n\n\ud83d\udca1 Save this post for later\n\ud83d\udd04 Share with someone who needs this\n\ud83d\udcac Drop a \ud83d\udd25 if you agree\n\n.\n.\n.\n${Array.from({ length: 20 }, (_, i) => `#${keyPoints.topic.split(" ")[i % keyPoints.topic.split(" ").length]?.replace(/[^a-zA-Z]/g, "") || "content"}`).join(" ")}`,
    instagram_carousel_titles: [
      `Stop Doing This in ${keyPoints.topic}`,
      `The #1 Mistake Everyone Makes`,
      `What Actually Works Instead`,
      `The 3-Step Framework`,
      `Your Action Plan Starting Today`,
    ],
    tiktok_script: `HOOK: "You've been doing ${keyPoints.topic} all wrong."\n\n[Text overlay: "The ${keyPoints.topic} secret nobody tells you"]\n\n"Here's what most people do: ${keyPoints.commonMistake}"\n\n[Text overlay: "\u274c Wrong approach"]\n\n"But what actually works is: ${keyPoints.solution}"\n\n[Text overlay: "\u2705 Right approach"]\n\n"And here's the crazy part \u2014 ${keyPoints.mainInsight}."\n\n[Text overlay: "\ud83e\udd2f Mind blown"]\n\n"Follow for more ${keyPoints.topic} tips!"\n\n[Text overlay: "Follow \u2192 \ud83d\udd14"]`,
    reddit: {
      title: `PSA: Here's what actually works for ${keyPoints.topic} (after years of trial and error)`,
      body: `Hey everyone,\n\nI've been dealing with ${keyPoints.topic} for a while now, and I wanted to share what I've learned after making every mistake in the book.\n\n**The problem:**\nMost advice about ${keyPoints.topic} is either too generic or completely wrong. I used to ${keyPoints.commonMistake}.\n\n**What actually worked:**\n\n1. ${keyPoints.mainInsight}\n2. ${keyPoints.secondaryInsight}\n3. ${keyPoints.solution}\n\n**The result:**\nThese changes made a massive difference. Not overnight, but consistently over time.\n\nHope this helps someone who's in the same boat. Happy to answer questions in the comments.`,
      subreddits: ["LifeProTips", "selfimprovement", "GetMotivated"],
    },
    email_digest: `Subject: The ${keyPoints.topic} strategy that actually works\n\nHey there,\n\nQuick one today \u2014 something about ${keyPoints.topic} that I wish I knew sooner:\n\n${keyPoints.mainInsight}\n\nThe short version: ${keyPoints.solution}\n\nIf you only take one thing from this email, let it be this.\n\nTalk soon.`,
    email_deep_dive: `Subject: I was wrong about ${keyPoints.topic} \u2014 here's what changed everything\n\nHey there,\n\nI need to admit something.\n\nFor the longest time, I was approaching ${keyPoints.topic} completely wrong.\n\nI used to ${keyPoints.commonMistake}.\n\nEvery. Single. Day.\n\nThen I stumbled onto something that changed my entire perspective:\n\n${keyPoints.mainInsight}\n\nHere's the full breakdown:\n\n**Step 1: Understand the foundation**\n${keyPoints.secondaryInsight}\n\n**Step 2: Implement the change**\n${keyPoints.solution}\n\n**Step 3: Measure and iterate**\nTrack your progress weekly, not daily. Consistency beats intensity.\n\nThe results?\nNight and day difference.\n\nIf you're struggling with ${keyPoints.topic}, try this approach and let me know how it goes.\n\nCheers.`,
    youtube_community: `Quick question for the community \ud83e\udd14\n\nWhat's your biggest challenge with ${keyPoints.topic}?\n\nA) ${keyPoints.commonMistake}\nB) Not knowing where to start\nC) Staying consistent\nD) Something else (tell me below!)\n\nI'm working on some new content and want to make sure I'm covering what actually matters to you.`,
    content_calendar: [
      { day: "Monday", platform: "Twitter", post: `Thread about ${keyPoints.mainInsight} \u2014 hook with a controversial take` },
      { day: "Tuesday", platform: "LinkedIn", post: `Personal story about overcoming ${keyPoints.commonMistake}` },
      { day: "Wednesday", platform: "Instagram", post: `Carousel: 5-step framework for ${keyPoints.topic}` },
      { day: "Thursday", platform: "TikTok", post: `Quick tip: ${keyPoints.solution} \u2014 trending audio` },
      { day: "Friday", platform: "Reddit", post: `Helpful post in relevant subreddit about lessons learned` },
      { day: "Saturday", platform: "Email", post: `Weekly newsletter deep-dive on ${keyPoints.topic}` },
      { day: "Sunday", platform: "YouTube", post: `Community poll asking audience about their biggest challenge` },
    ],
    hashtags: {
      twitter: [keyPoints.topic.replace(/\s+/g, ""), "tips", "growth"],
      linkedin: [keyPoints.topic.replace(/\s+/g, ""), "professionaldevelopment", "career"],
      instagram: Array.from({ length: 10 }, (_, i) =>
        ["contentcreator", "digitalmarketing", "growthmindset", "productivity", "success", "motivation", "tips", "learning", "strategy", "business"][i]
      ),
    },
  });
}

function extractKeyPoints(content: string): {
  topic: string;
  mainInsight: string;
  secondaryInsight: string;
  commonMistake: string;
  solution: string;
} {
  const words = content.split(/\s+/).slice(0, 100).join(" ");
  const topic = words.slice(0, 60).replace(/[.!,?]+$/, "").trim() || "this topic";

  return {
    topic: topic.length > 50 ? topic.slice(0, 50) + "..." : topic,
    mainInsight:
      "Focus on delivering genuine value before asking for anything in return",
    secondaryInsight:
      "Consistency matters more than perfection \u2014 small daily actions compound",
    commonMistake:
      "Trying to do everything at once instead of mastering one thing first",
    solution:
      "Start small, measure results, double down on what works, and eliminate what doesn't",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { content, focus, tone } = await req.json();

    if (!content || content.length < 50) {
      return Response.json(
        { error: "Content must be at least 50 characters long." },
        { status: 400 },
      );
    }

    let deviceId = "anonymous";
    let plan: "free" | "pro" = "free";

    const token = extractBearerToken(req);
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        deviceId = payload.deviceId;
        plan = payload.plan;
      }
    }

    const rateKey = plan === "pro" ? `pro:${deviceId}` : `ip:${getClientIp(req)}`;
    const limit = plan === "pro" ? AUTHENTICATED_LIMIT : UNAUTHENTICATED_LIMIT;
    const rateResult = checkRateLimit(rateKey, { windowMs: 3_600_000, max: limit });

    if (!rateResult.allowed) {
      return Response.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateResult),
        },
      );
    }

    const userPrompt = buildUserPrompt(content, focus || "", tone || "");
    const stream = await streamFreeTheAi(userPrompt);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        ...getRateLimitHeaders(rateResult),
      },
    });
  } catch (error) {
    console.error("Repurpose error:", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
