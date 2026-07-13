"use client";

import { useState } from "react";
import type { CalendarEntry, LinkedInPost, LinkedInArticle } from "@/lib/types";
import { Session } from "@supabase/supabase-js";

export default function ExpandedDayView({
  entry,
  item,
  session,
  onRegenerate,
}: {
  entry: CalendarEntry;
  item: LinkedInPost | LinkedInArticle;
  session: Session | null;
  onRegenerate: () => void;
}) {
  const [copiedPost, setCopiedPost] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [editingText, setEditingText] = useState(item.body);
  const [imagePromptExpanded, setImagePromptExpanded] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(entry.feedback || null);

  const isArticle = entry.type === "article";
  const articleItem = isArticle ? (item as LinkedInArticle) : null;
  const postItem = !isArticle ? (item as LinkedInPost) : null;
  const imagePrompts = articleItem?.imagePrompts || (postItem?.imagePrompt ? [postItem.imagePrompt] : []);
  const hasImagePrompts = imagePrompts.length > 0;

  const handleCopyPost = async () => {
    try {
      await navigator.clipboard.writeText(editingText);
      setCopiedPost(true);
      setTimeout(() => setCopiedPost(false), 2000);
    } catch {
      return;
    }
    if (session && entry.itemId) {
      fetch("/api/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ itemId: entry.itemId, field: "body" }),
      }).catch(() => {});
    }
  };

  const handleCopyPrompt = async () => {
    const allPrompts = imagePrompts.map((p: string, i: number) => `Image ${i + 1}: ${p}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(allPrompts);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      return;
    }
    if (session && entry.itemId) {
      fetch("/api/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ itemId: entry.itemId, field: "image_prompt" }),
      }).catch(() => {});
    }
  };

  const handleFeedback = async (value: "up" | "down") => {
    const newFeedback = feedback === value ? null : value;
    setFeedback(newFeedback);
    if (session && entry.itemId) {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ itemId: entry.itemId, feedback: newFeedback }),
      }).catch(() => {});
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden mt-1"
      style={{ background: "var(--bg-primary)", border: "1px solid var(--border-light)" }}
    >
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-md"
            style={{
              background: isArticle ? "rgba(10,102,194,0.12)" : "rgba(16,163,127,0.12)",
              color: isArticle ? "#0a66c2" : "var(--accent)",
            }}
          >
            {isArticle ? "Article" : "Post"}
          </span>
          <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {entry.recommendedTime}
          </span>
        </div>

        <textarea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          className="w-full text-sm leading-relaxed resize-none rounded-lg px-3 py-3 mb-2 outline-none"
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-light)",
            minHeight: isArticle ? "240px" : "160px",
          }}
          spellCheck={false}
        />

        {!isArticle && (
          <p
            className="text-[11px] mb-2 px-1"
            style={{ color: editingText.length > 1300 ? "#ef4444" : "var(--text-muted)" }}
          >
            {editingText.length.toLocaleString()} / 1,300 characters
          </p>
        )}

        {hasImagePrompts && (
          <div className="mb-3">
            <button
              onClick={() => setImagePromptExpanded(!imagePromptExpanded)}
              className="flex items-center gap-2 text-[11px] font-medium mb-2 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              {imagePrompts.length} image prompt{imagePrompts.length !== 1 ? "s" : ""}
              <svg
                width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ transform: imagePromptExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {imagePromptExpanded && (
              <div className="space-y-2">
                {imagePrompts.map((p: string, i: number) => (
                  <div
                    key={i}
                    className="text-xs leading-relaxed rounded-lg px-3 py-2.5"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}
                  >
                    <span className="font-medium" style={{ color: "var(--text-muted)" }}>Image {i + 1}:</span> {p}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPost}
            className="text-xs font-medium px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            style={{ background: copiedPost ? "rgba(16,163,127,0.12)" : "var(--accent)", color: copiedPost ? "var(--accent)" : "white" }}
          >
            {copiedPost ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy post</>
            )}
          </button>

          {hasImagePrompts && (
            <button
              onClick={handleCopyPrompt}
              className="text-xs px-3 py-2 rounded-lg transition-colors"
              style={{
                border: "1px solid var(--border)",
                color: copiedPrompt ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {copiedPrompt ? "Copied!" : "Copy prompt"}
            </button>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => handleFeedback("up")}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: feedback === "up" ? "var(--accent)" : "var(--text-muted)",
                background: feedback === "up" ? "rgba(16,163,127,0.12)" : "transparent",
              }}
              title="Good output"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
              </svg>
            </button>
            <button
              onClick={() => handleFeedback("down")}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: feedback === "down" ? "#ef4444" : "var(--text-muted)",
                background: feedback === "down" ? "rgba(239,68,68,0.12)" : "transparent",
              }}
              title="Poor output"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/>
                <path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/>
              </svg>
            </button>
            <button
              onClick={onRegenerate}
              className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
