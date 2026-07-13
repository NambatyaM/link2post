"use client";

import { useState, useEffect, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { LinkedInResult, LinkedInPost, LinkedInArticle } from "@/lib/types";
import YouTubeInput from "@/components/YouTubeInput";
import ProcessingStages from "@/components/ProcessingStages";
import ContentCalendar from "@/components/ContentCalendar";
import AuthScreen from "@/components/AuthScreen";
import ModelSelector from "@/components/ModelSelector";
import { TRIAL_LIMIT } from "@/lib/constants";

interface ModelOption {
  providerId: string;
  providerLabel: string;
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

type AppState = "input" | "processing" | "calendar";

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

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setModelOptions(data.options || []);
        if (data.default) setSelectedModel(data.default);
      })
      .catch(() => {});
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

  const trialsRemaining = Math.max(0, TRIAL_LIMIT - trialCount);
  const isTrialExhausted = !session && trialsRemaining <= 0;

  const handleGenerate = async (url: string) => {
    if (isTrialExhausted) {
      setShowSignupWall(true);
      return;
    }

    setLoading(true);
    setError("");
    setAppState("processing");

    try {
      const transcriptRes = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const transcriptData = await transcriptRes.json();
      if (!transcriptRes.ok) throw new Error(transcriptData.error || "Failed to fetch transcript");

      setVideoTitle(transcriptData.title || "YouTube video");

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
        setVideoTitle(transcriptData.title || "YouTube video");

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
                videoUrl: url,
                videoTitle: transcriptData.title,
                videoId: transcriptData.videoId,
                transcript: transcriptData.transcript,
                result: genResult,
              }),
            });
          } catch { /* save failed, calendar still shows in-memory */ }
        }

        setAppState("calendar");
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
    const lines: string[] = [];
    for (const entry of result.calendar) {
      const isArticle = entry.type === "article";
      const item = isArticle ? result.articles[entry.contentIndex] : result.posts[entry.contentIndex];
      if (!item) continue;
      lines.push(`--- ${entry.day} · ${entry.type === "article" ? "Article" : "Post"} · ${entry.recommendedTime} ---`);
      if ("hook" in item) {
        lines.push(item.hook, "", item.body);
      } else {
        lines.push(item.title, "", item.body);
      }
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  const handleSignupWallDismiss = () => {
    setShowSignupWall(false);
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
        {appState === "input" && (
          <div className="flex flex-col items-center">
            <div className="mb-8 text-center">
              <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Link2Post
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Turn any YouTube video into a week of LinkedIn content.
              </p>
            </div>

            <YouTubeInput onSubmit={handleGenerate} isLoading={loading} />

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
                1 free generation remaining — sign up to keep your calendars
              </p>
            )}

            {error && (
              <p className="text-xs mt-3 max-w-[520px] text-center" style={{ color: "#ef4444" }}>{error}</p>
            )}
          </div>
        )}

        {appState === "processing" && (
          <div className="flex flex-col items-center">
            <ProcessingStages videoTitle={videoTitle} />
          </div>
        )}

        {appState === "calendar" && result && (
          <ContentCalendar
            result={result}
            timezone={timezone}
            videoTitle={videoTitle}
            session={session}
            onRegenerate={handleRegenerate}
            onCopyAll={handleCopyAll}
            onNewVideo={() => { setAppState("input"); setResult(null); setVideoTitle(""); }}
          />
        )}
      </main>
    </>
  );
}
