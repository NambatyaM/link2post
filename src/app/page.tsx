"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { LinkedInResult, LinkedInPost, LinkedInArticle, VideoScript, VideoInfo, CarouselSlide } from "@/lib/types";
import TranscriptInput from "@/components/TranscriptInput";
import ProcessingStages from "@/components/ProcessingStages";
import ContentCalendar from "@/components/ContentCalendar";
import AuthScreen from "@/components/AuthScreen";
import ModelSelector from "@/components/ModelSelector";
import ThemeToggle from "@/components/ThemeToggle";
import VideosLibrary from "@/components/VideosLibrary";
import ReferralBanner from "@/components/ReferralBanner";
import { TRIAL_LIMIT } from "@/lib/constants";

interface ModelOption {
  providerId: string;
  providerLabel: string;
  tagline: string;
  modelId: string;
  modelLabel: string;
}

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

function getAuthHeaders(session: Session | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
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
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<{ providerId: string; modelId: string } | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>("generating");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[] | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setModelOptions(data.options || []);
        if (data.default) setSelectedModel(data.default);
      })
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("link2post_ref", ref);
      window.history.replaceState({}, "", window.location.pathname);
    }
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

  const handleGenerate = async (title: string, transcript: string) => {
    if (isTrialExhausted) {
      setShowSignupWall(true);
      return;
    }

    setLoading(true);
    setError("");
    setProcessingStage("generating");
    setAppState("processing");
    abortRef.current = false;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoInfo: transcriptData,
          timezone,
          audience: "LinkedIn professionals",
          provider: selectedModel?.providerId,
          model: selectedModel?.modelId,
          stream: false,
        }),
      });

      if (!generateRes.ok) {
        const errData = await generateRes.json();
        throw new Error(errData.error || "Generation failed");
      }

      const data = await generateRes.json();
      if (data.result) {
        const genResult = data.result as LinkedInResult;
        setResult(genResult);
        setVideoTitle(title);
        setProcessingStage("done");

        if (!session) {
          const newCount = incrementTrialCount();
          setTrialCount(newCount);
        }

        if (session) {
          try {
            await fetch("/api/calendar/save", {
              method: "POST",
              headers: getAuthHeaders(session),
              body: JSON.stringify({
                videoUrl: "",
                videoTitle: title,
                videoId: "",
                transcript,
                result: genResult,
              }),
            });
          } catch { /* save failed, calendar still shows in-memory */ }
        }

        setTimeout(() => setAppState("calendar"), 400);
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
    try {
      const item = type === "post" ? result.posts[index] : result.articles[index];
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, sourceContent: JSON.stringify(item), videoTitle, provider: selectedModel?.providerId, model: selectedModel?.modelId, stream: false }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
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
        }
      }
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
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoInfo,
          provider: selectedModel?.providerId,
          model: selectedModel?.modelId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.script) {
        setScript(data.script);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCarousel = async () => {
    if (!result || !videoInfo) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoInfo,
          provider: selectedModel?.providerId,
          model: selectedModel?.modelId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.slides) {
        setCarouselSlides(data.slides);
      }
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
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          {session && appState !== "library" && (
            <button
              onClick={() => setAppState("library")}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              My Videos
            </button>
          )}
          {appState === "library" && (
            <button
              onClick={() => setAppState("input")}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              New video
            </button>
          )}
          <ThemeToggle />
        </div>
        {appState === "input" && (
          <div className="flex flex-col items-center w-full max-w-[600px]">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                Link2Post
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Paste a transcript, get a week of LinkedIn content.
              </p>
            </div>

            <TranscriptInput onSubmit={handleGenerate} isLoading={loading} />

            {modelOptions.length > 1 && (
              <div className="mt-3">
                <ModelSelector
                  options={modelOptions}
                  selected={selectedModel}
                  onSelect={(providerId, modelId) => setSelectedModel({ providerId, modelId })}
                />
              </div>
            )}

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

            <div className="mt-10 w-full">
              <p className="text-[11px] text-center mb-4" style={{ color: "var(--text-muted)" }}>
                What you get from one transcript:
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "post", label: "LinkedIn Posts", desc: "Hooks, stories, CTAs" },
                  { icon: "article", label: "LinkedIn Article", desc: "Long-form with image prompts" },
                  { icon: "calendar", label: "Content Calendar", desc: "Best times to post" },
                  { icon: "script", label: "Video Script", desc: "60-sec Reels & TikToks" },
                  { icon: "carousel", label: "PDF Carousel", desc: "10 slides, download ready" },
                  { icon: "library", label: "Video Library", desc: "Save & revisit anytime" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl px-3 py-4 text-center"
                    style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}
                  >
                    <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(16,163,127,0.12)" }}>
                      {item.icon === "post" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      )}
                      {item.icon === "article" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      )}
                      {item.icon === "calendar" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      )}
                      {item.icon === "script" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                      )}
                      {item.icon === "carousel" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                      )}
                      {item.icon === "library" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                      )}
                    </div>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                  </div>
                ))}
              </div>
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
              onRegenerate={handleRegenerate}
              onCopyAll={handleCopyAll}
              onDownloadTxt={handleDownloadTxt}
              onGenerateScript={handleGenerateScript}
              onGenerateCarousel={handleGenerateCarousel}
              onNewVideo={() => { setAppState("input"); setResult(null); setVideoTitle(""); setScript(null); setCarouselSlides(null); setVideoInfo(null); }}
            />
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
