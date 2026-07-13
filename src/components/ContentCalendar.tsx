"use client";

import { useState } from "react";
import { Session } from "@supabase/supabase-js";
import type { LinkedInResult, CalendarEntry, LinkedInPost, LinkedInArticle } from "@/lib/types";
import ExpandedDayView from "./ExpandedDayView";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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
  onRegenerate,
  onCopyAll,
  onNewVideo,
}: {
  result: LinkedInResult;
  timezone: string;
  videoTitle: string;
  session: Session | null;
  onRegenerate: (type: "post" | "article", index: number) => void;
  onCopyAll: () => void;
  onNewVideo: () => void;
}) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

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
          <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,0,0,0.1)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
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
            onClick={onNewVideo}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "var(--accent)", color: "white" }}
          >
            New video
          </button>
        </div>
      </div>

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
                    background: entry.type === "article" ? "rgba(10,102,194,0.12)" : "rgba(16,163,127,0.12)",
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

      <p className="text-[11px] mt-4 text-center" style={{ color: "var(--text-muted)" }}>
        Posting times based on research from Buffer, Sprout Social, and SocialPilot. Times shown in {tzShort}.
      </p>
    </div>
  );
}
