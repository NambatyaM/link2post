"use client";

import { useState } from "react";
import { Session } from "@supabase/supabase-js";
import type { LinkedInResult, CalendarEntry, LinkedInPost, LinkedInArticle, VideoScript, CarouselSlide } from "@/lib/types";
import ExpandedDayView from "./ExpandedDayView";
import VideoScriptView from "./VideoScriptView";
import CarouselBuilder from "./CarouselBuilder";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
type Tab = "calendar" | "script" | "carousel";

function getItemForEntry(result: LinkedInResult, entry: CalendarEntry): LinkedInPost | LinkedInArticle | null {
  if (entry.type === "post") return result.posts[entry.contentIndex] ?? null;
  return result.articles[entry.contentIndex] ?? null;
}

function getHookPreview(item: LinkedInPost | LinkedInArticle | null): string {
  if (!item) return "";
  if ("hook" in item) return item.hook.split(" ").slice(0, 8).join(" ") + "...";
  return item.title.split(" ").slice(0, 8).join(" ") + "...";
}

export default function ContentCalendar({
  result,
  timezone,
  videoTitle,
  session,
  script,
  carouselSlides,
  loading,
  onRegenerate,
  onCopyAll,
  onDownloadTxt,
  onGenerateScript,
  onGenerateCarousel,
  onNewVideo,
}: {
  result: LinkedInResult;
  timezone: string;
  videoTitle: string;
  session: Session | null;
  script: VideoScript | null;
  carouselSlides: CarouselSlide[] | null;
  loading: boolean;
  onRegenerate: (type: "post" | "article", index: number) => void;
  onCopyAll: () => void;
  onDownloadTxt: () => void;
  onGenerateScript: () => void;
  onGenerateCarousel: () => void;
  onNewVideo: () => void;
}) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  const tzShort = Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/").pop()?.replace(/_/g, " ") || timezone;

  const handleCopyAll = () => {
    onCopyAll();
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const entriesByDay: Record<string, CalendarEntry> = {};
  for (const entry of result.calendar) {
    entriesByDay[entry.day] = entry;
  }

  return (
    <div className="w-full max-w-[768px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="Link2Post" className="shrink-0 w-10 h-10 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{videoTitle}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
              {result.posts.length} post{result.posts.length !== 1 ? "s" : ""} · {result.articles.length} article{result.articles.length !== 1 ? "s" : ""} · {tzShort}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyAll}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid var(--border)", color: copiedAll ? "var(--accent)" : "var(--text-muted)" }}
          >
            {copiedAll ? "Copied!" : "Copy all"}
          </button>
          <button
            onClick={onDownloadTxt}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Download .txt
          </button>
          <button
            onClick={onNewVideo}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "var(--accent)", color: "white" }}
          >
            New content
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}>
        {([
          { id: "calendar" as Tab, label: "Posts & Articles" },
          { id: "script" as Tab, label: "Video Script" },
          { id: "carousel" as Tab, label: "Carousel" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 text-xs font-medium py-2 rounded-lg transition-colors"
            style={{
              background: activeTab === tab.id ? "var(--bg-primary)" : "transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
              border: activeTab === tab.id ? "1px solid var(--border-light)" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "calendar" && (
        <div className="space-y-2">
          {WEEK_DAYS.map((day) => {
          const entry = entriesByDay[day];
          const isExpanded = expandedDay === day;

          if (!entry) {
            return (
              <div
                key={day}
                className="rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)", opacity: 0.5 }}
              >
                <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>{day.slice(0, 2)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Rest day — no post recommended</p>
                </div>
              </div>
            );
          }

          const item = getItemForEntry(result, entry);
          const hookPreview = getHookPreview(item);

          return (
            <div key={day}>
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-colors"
                style={{
                  background: "var(--bg-tertiary)",
                  border: `1px solid ${isExpanded ? "var(--accent)" : "var(--border-light)"}`,
                }}
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: entry.type === "article" ? "rgba(10,102,194,0.12)" : "rgba(99,102,241,0.12)",
                  }}
                >
                  <span className="text-[11px] font-semibold" style={{ color: entry.type === "article" ? "#0a66c2" : "var(--accent)" }}>
                    {day.slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {entry.type === "article" ? "Article" : "Post"}
                    </span>
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {entry.recommendedTime}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{hookPreview}</p>
                </div>
                {entry.itemId && (
                  <span className="flex items-center gap-1 shrink-0">
                    {entry.feedback === "up" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="var(--accent)" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>
                    )}
                    {entry.feedback === "down" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="#ef4444" strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg>
                    )}
                  </span>
                )}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isExpanded && item && (
                <ExpandedDayView
                  entry={entry}
                  item={item}
                  session={session}
                  onRegenerate={() => onRegenerate(entry.type, entry.contentIndex)}
                />
              )}
            </div>
          );
        })}
        </div>
      )}

      {activeTab === "script" && (
        <div>
          {script ? (
            <VideoScriptView script={script} />
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Generate a short video script</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Turn this video into a 60-second Reel, TikTok, or Short</p>
              <button
                onClick={onGenerateScript}
                disabled={loading}
                className="text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 019.95 9" /></svg>
                    Generating...
                  </span>
                ) : "Generate script"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "carousel" && (
        <div>
          {carouselSlides ? (
            <CarouselBuilder initialSlides={carouselSlides} videoTitle={videoTitle} />
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Generate a carousel</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>10-slide PDF carousel — 6x more engagement than text posts</p>
              <button
                onClick={onGenerateCarousel}
                disabled={loading}
                className="text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 019.95 9" /></svg>
                    Generating...
                  </span>
                ) : "Generate carousel"}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] mt-4 text-center" style={{ color: "var(--text-muted)" }}>
        Posting times based on research from Buffer, Sprout Social, and SocialPilot. Times shown in {tzShort}.
      </p>
    </div>
  );
}
