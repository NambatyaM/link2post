"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { LinkedInResult, LinkedInPost, LinkedInArticle, VideoScript, VideoInfo, CarouselSlide, ContentType } from "@/lib/types";
import TranscriptInput from "@/components/TranscriptInput";
import ProcessingStages from "@/components/ProcessingStages";
import ContentCalendar from "@/components/ContentCalendar";
import AuthScreen from "@/components/AuthScreen";

import VideosLibrary from "@/components/VideosLibrary";
import ReferralBanner from "@/components/ReferralBanner";
import { TRIAL_LIMIT } from "@/lib/constants";

const TIMEZONE_KEY = "link2post_timezone";
const TRIAL_KEY = "link2post_trials";

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

function getInitialTimezone(): string {
  if (typeof window === "undefined") return "America/New_York";
  const saved = localStorage.getItem(TIMEZONE_KEY);
  if (saved) return saved;
  const detected = detectTimezone();
  localStorage.setItem(TIMEZONE_KEY, detected);
  return detected;
}

function getTrialCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(TRIAL_KEY) || "0", 10);
}

function incrementTrialCount(): number {
  const next = getTrialCount() + 1;
  localStorage.setItem(TRIAL_KEY, String(next));
  return next;
}

type AppState = "input" | "processing" | "calendar" | "library";
type ProcessingStage = "generating" | "done";

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post: "LinkedIn Post",
  carousel: "Carousel",
  article: "Article",
  script: "Video Script",
};

function getAuthHeaders(session: Session | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  if (typeof window !== "undefined") {
    const deviceId = localStorage.getItem("link2post_device_id");
    if (deviceId) headers["x-device-id"] = deviceId;
  }
  return headers;
}

function parseRegeneratedContent(
  type: "post" | "article",
  raw: string,
): LinkedInPost | LinkedInArticle | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (type === "post" && parsed.hook && parsed.body) return parsed as LinkedInPost;
    if (type === "article" && parsed.title && parsed.body) return parsed as LinkedInArticle;
  } catch { /* continue */ }
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      if (type === "post" && parsed.hook && parsed.body) return parsed as LinkedInPost;
      if (type === "article" && parsed.title && parsed.body) return parsed as LinkedInArticle;
    } catch { /* continue */ }
  }
  return null;
}

function calendarResultFromDb(video: Record<string, unknown>, items: Record<string, unknown>[]): LinkedInResult {
  const posts: LinkedInPost[] = [];
  const articles: LinkedInArticle[] = [];

  for (const item of items) {
    if (item.type === "post") {
      posts.push({
        hook: (item.hook as string) || "",
        body: item.body as string,
        imagePrompt: (item.image_prompt as string) || "",
      });
    } else {
      articles.push({
        title: (item.title as string) || "",
        body: item.body as string,
        imagePrompts: item.image_prompts ? (item.image_prompts as string[]) : [],
      });
    }
  }

  const calendar = items.map((item) => ({
    day: item.day as string,
    date: (video.created_at as string)?.split("T")[0] || "",
    type: item.type as "post" | "article",
    title: (item.title as string) || "",
    contentIndex: item.content_index as number,
    recommendedTime: (item.recommended_time as string) || "",
    note: "",
    itemId: item.id as string,
    feedback: (item.feedback as "up" | "down" | null) || null,
  }));

  return { posts, articles, calendar };
}

function buildPlainText(result: LinkedInResult): string {
  const lines: string[] = [];
  for (const entry of result.calendar) {
    const isArticle = entry.type === "article";
    const item = isArticle ? result.articles[entry.contentIndex] : result.posts[entry.contentIndex];
    if (!item) continue;
    lines.push(`=== ${entry.day} | ${entry.type === "article" ? "Article" : "Post"} | ${entry.recommendedTime} ===`);
    if ("hook" in item) {
      lines.push(item.hook, "", item.body);
    } else {
      lines.push(item.title, "", item.body);
    }
    if ("imagePrompt" in item && (item as LinkedInPost).imagePrompt) {
      lines.push("", `[Image Prompt: ${(item as LinkedInPost).imagePrompt}]`);
    }
    if ("imagePrompts" in item) {
      for (const [i, p] of (item as LinkedInArticle).imagePrompts.entries()) {
        lines.push("", `[Image Prompt ${i + 1}: ${p}]`);
      }
    }
    lines.push("", "");
  }
  return lines.join("\n");
}

function parseSSEOutput(raw: string): { type: "result"; result: LinkedInResult } | { type: "output"; output: string } | { type: "error" } {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.posts && parsed.calendar) return { type: "result", result: parsed as LinkedInResult };
  } catch { /* not JSON */ }
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
      if (parsed.posts && parsed.calendar) return { type: "result", result: parsed as LinkedInResult };
    } catch { /* not JSON */ }
  }
  if (cleaned.length > 0) return { type: "output", output: cleaned };
  return { type: "error" };
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("input");
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<LinkedInResult | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [timezone] = useState(getInitialTimezone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trialCount, setTrialCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(TRIAL_KEY) || "0", 10);
  });
  const [showSignupWall, setShowSignupWall] = useState(false);
  const [supabase] = useState(() => getSupabaseBrowser());
  const [processingStage, setProcessingStage] = useState<ProcessingStage>("generating");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[] | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [contentType, setContentType] = useState<ContentType>("post");
  const [plainTextOutput, setPlainTextOutput] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("link2post_ref", ref);
      window.history.replaceState({}, "", window.location.pathname);
    }

    let sessionId = localStorage.getItem("link2post_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("link2post_session_id", sessionId);
    }
    let deviceId = localStorage.getItem("link2post_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("link2post_device_id", deviceId);
    }
    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, sessionId, path: window.location.pathname }),
    }).catch(() => {});
  }, []);

  const loadActiveCalendar = useCallback(async (sess: Session) => {
    try {
      const res = await fetch("/api/calendar/active", {
        headers: getAuthHeaders(sess),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.video && data.items?.length > 0) {
          setResult(calendarResultFromDb(data.video, data.items));
          setVideoTitle(data.video.title || "");
          setAppState("calendar");
          return;
        }
      }
      setAppState("input");
    } catch {
      setAppState("input");
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        loadActiveCalendar(sess);
        const ref = localStorage.getItem("link2post_ref");
        if (ref) {
          fetch("/api/referral/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.access_token}` },
            body: JSON.stringify({ code: ref }),
          }).then(() => localStorage.removeItem("link2post_ref")).catch(() => {});
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        loadActiveCalendar(currentSession);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadActiveCalendar]);

  const loadVideoCalendar = useCallback(async (videoId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/calendar/${videoId}`, {
        headers: getAuthHeaders(session),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.video && data.items?.length > 0) {
          setResult(calendarResultFromDb(data.video, data.items));
          setVideoTitle(data.video.title || "");
          setAppState("calendar");
        }
      }
    } catch { /* failed to load */ }
  }, [session]);

  const trialsRemaining = Math.max(0, TRIAL_LIMIT - trialCount);
  const isTrialExhausted = !session && trialsRemaining <= 0;

  const handleGenerate = async (title: string, transcript: string, type: ContentType) => {
    if (isTrialExhausted) {
      setShowSignupWall(true);
      return;
    }

    setLoading(true);
    setError("");
    setProcessingStage("generating");
    setAppState("processing");
    abortRef.current = false;
    setContentType(type);
    setPlainTextOutput(null);

    const transcriptData: VideoInfo = {
      title,
      description: "",
      transcript,
      url: "",
      videoId: "",
    };

    try {
      setVideoTitle(title);
      setVideoInfo(transcriptData);

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: getAuthHeaders(session),
        body: JSON.stringify({
          videoInfo: transcriptData,
          timezone,
          audience: "LinkedIn professionals",
          stream: true,
          contentType: type,
        }),
      });

      if (!generateRes.ok) {
        const errData = await generateRes.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (status ${generateRes.status})`);
      }

      const contentTypeHeader = generateRes.headers.get("content-type") || "";

      if (contentTypeHeader.includes("text/event-stream")) {
        const reader = generateRes.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (typeof parsed.content === "string") accumulated += parsed.content;
            } catch { /* skip */ }
          }
        }

        const parsed = parseSSEOutput(accumulated);
        if (parsed.type === "result") {
          const genResult = parsed.result as LinkedInResult;
          setResult(genResult);
          setVideoTitle(title);
          setProcessingStage("done");

          if (!session) { const newCount = incrementTrialCount(); setTrialCount(newCount); }

          if (session) {
            try {
              await fetch("/api/calendar/save", {
                method: "POST",
                headers: getAuthHeaders(session),
                body: JSON.stringify({ videoUrl: "", videoTitle: title, videoId: "", transcript, result: genResult }),
              });
            } catch { /* save failed */ }
          }

          setTimeout(() => setAppState("calendar"), 400);
        } else if (parsed.type === "output") {
          setPlainTextOutput(parsed.output);
          setVideoTitle(title);
          setProcessingStage("done");
          if (!session) { const newCount = incrementTrialCount(); setTrialCount(newCount); }
          setTimeout(() => setAppState("calendar"), 400);
        } else {
          throw new Error("Could not parse generated content. Please try again.");
        }
      } else {
        const data = await generateRes.json();
        if (data.result) {
          const genResult = data.result as LinkedInResult;
          setResult(genResult);
          setVideoTitle(title);
          setProcessingStage("done");

          if (!session) { const newCount = incrementTrialCount(); setTrialCount(newCount); }

          if (session) {
            try {
              await fetch("/api/calendar/save", {
                method: "POST",
                headers: getAuthHeaders(session),
                body: JSON.stringify({ videoUrl: "", videoTitle: title, videoId: "", transcript, result: genResult }),
              });
            } catch { /* save failed */ }
          }

          setTimeout(() => setAppState("calendar"), 400);
        } else if (data.output) {
          setPlainTextOutput(data.output);
          setVideoTitle(title);
          setProcessingStage("done");
          if (!session) { const newCount = incrementTrialCount(); setTrialCount(newCount); }
          setTimeout(() => setAppState("calendar"), 400);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setAppState("input");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (type: "post" | "article", index: number) => {
    if (!result) return;
    setLoading(true);
    setError("");
    try {
      const item = type === "post" ? result.posts[index] : result.articles[index];
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: getAuthHeaders(session),
        body: JSON.stringify({ type, sourceContent: JSON.stringify(item), videoTitle, stream: false }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to regenerate. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.content) {
        const rawContent = data.content;
        const parsed = parseRegeneratedContent(type, rawContent);
        if (parsed) {
          const newResult = { ...result };
          if (type === "post") {
            newResult.posts = [...result.posts];
            newResult.posts[index] = parsed as LinkedInPost;
          } else {
            newResult.articles = [...result.articles];
            newResult.articles[index] = parsed as LinkedInArticle;
          }
          setResult(newResult);
        } else {
          setError("Could not parse regenerated content. Please try again.");
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const text = buildPlainText(result);
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* clipboard denied */ }
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const text = buildPlainText(result);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `link2post-${videoTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignupWallDismiss = () => {
    setShowSignupWall(false);
  };

  const handleGenerateScript = async () => {
    if (!result || !videoInfo) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: getAuthHeaders(session),
        body: JSON.stringify({
          videoInfo,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to generate script. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.script) {
        setScript(data.script);
      } else {
        setError("No script data received. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCarousel = async () => {
    if (!result || !videoInfo) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-carousel", {
        method: "POST",
        headers: getAuthHeaders(session),
        body: JSON.stringify({
          videoInfo,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to generate carousel. Please try again.");
        return;
      }
      const data = await res.json();
      if (data.slides) {
        setCarouselSlides(data.slides);
      } else {
        setError("No carousel data received. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSignupWall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
          <div className="w-full max-w-sm mx-4">
            <AuthScreen
              onAuth={() => { setShowSignupWall(false); }}
              onDismiss={handleSignupWallDismiss}
            />
          </div>
        </div>
      )}

      <main className="flex flex-col items-center justify-center min-h-[100dvh] px-5">
        <div className="fixed top-4 left-4 z-40">
          <img src="/corner-logo.png" alt="Link2Post" className="h-8 w-auto" />
        </div>
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          {session && appState !== "library" && (
            <button
              onClick={() => setAppState("library")}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              My content
            </button>
          )}
          {appState === "library" && (
            <button
              onClick={() => setAppState("input")}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              New content
            </button>
          )}
        </div>
        {appState === "input" && (
          <div className="flex flex-col items-center w-full max-w-[640px]">
              <div className="mb-4 text-center">
              <img src="/logo.png" alt="Link2Post" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover" />
              <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Turn any transcript into LinkedIn content
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Paste your transcript. Get posts, articles, carousels, and a content calendar — ready to publish.
              </p>
            </div>

            <TranscriptInput onSubmit={handleGenerate} isLoading={loading} />

            <div className="flex items-center justify-between w-full mt-3 px-1">
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Works with any transcript — YouTube, podcasts, interviews, lectures.
              </p>
            </div>

            {!session && trialsRemaining > 0 && trialsRemaining < TRIAL_LIMIT && (
              <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>
                {trialsRemaining} free {trialsRemaining === 1 ? "generation" : "generations"} remaining
              </p>
            )}

            {!session && trialsRemaining === 1 && (
              <p className="text-[11px] mt-3" style={{ color: "var(--text-muted)" }}>
                1 free generation left — <button onClick={() => setShowSignupWall(true)} className="underline" style={{ color: "var(--accent)" }}>sign up</button> to save calendars &amp; get unlimited
              </p>
            )}

            {error && (
              <p className="text-xs mt-3 max-w-[520px] text-center" style={{ color: "#ef4444" }}>{error}</p>
            )}

            <div className="mt-16 w-full grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "LinkedIn Posts", desc: "Hooks, stories, CTAs" },
                { label: "Long-form Article", desc: "With image prompts" },
                { label: "Content Calendar", desc: "Best times to post" },
                { label: "Video Script", desc: "60-sec Reels & TikToks" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl px-4 py-3"
                  style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}
                >
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {appState === "processing" && (
          <div className="flex flex-col items-center">
            <ProcessingStages videoTitle={videoTitle} stage={processingStage} />
          </div>
        )}

        {appState === "calendar" && result && (
          <div className="w-full max-w-[768px] mx-auto">
            {session && <ReferralBanner session={session} />}
            <ContentCalendar
              result={result}
              timezone={timezone}
              videoTitle={videoTitle}
              session={session}
              script={script}
              carouselSlides={carouselSlides}
              loading={loading}
              onRegenerate={handleRegenerate}
              onCopyAll={handleCopyAll}
              onDownloadTxt={handleDownloadTxt}
              onGenerateScript={handleGenerateScript}
              onGenerateCarousel={handleGenerateCarousel}
              onNewVideo={() => { setAppState("input"); setResult(null); setVideoTitle(""); setScript(null); setCarouselSlides(null); setVideoInfo(null); setPlainTextOutput(null); }}
            />
          </div>
        )}

        {appState === "calendar" && plainTextOutput && !result && (
          <div className="w-full max-w-[768px] mx-auto">
            {session && <ReferralBanner session={session} />}
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {CONTENT_TYPE_LABELS[contentType]}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(plainTextOutput).catch(() => {});
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => { setAppState("input"); setResult(null); setPlainTextOutput(null); setVideoTitle(""); setVideoInfo(null); }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  >
                    New content
                  </button>
                </div>
              </div>
              <div
                className="text-sm whitespace-pre-wrap leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                {plainTextOutput}
              </div>
            </div>
          </div>
        )}

        {appState === "library" && session && (
          <VideosLibrary
            session={session}
            onSelectVideo={loadVideoCalendar}
            onNewVideo={() => setAppState("input")}
          />
        )}
      </main>
    </>
  );
}
