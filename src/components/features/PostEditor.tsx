"use client";

import { useState, useEffect, useCallback } from "react";
import type { LinkedInPost } from "@/lib/types";
import ImagePromptCard from "./ImagePromptCard";

interface PostEditorProps {
  post: LinkedInPost;
  index: number;
  onUpdate: (index: number, post: LinkedInPost) => void;
  onSave: () => void;
  onApprove: () => void;
  onDiscard: () => void;
}

type PreviewMode = "edit" | "linkedin";

function getCharCountColor(count: number) {
  if (count >= 1000 && count <= 1300) return "var(--success)";
  if ((count >= 900 && count < 1000) || (count > 1300 && count <= 1400)) return "#EAB308";
  return "var(--error)";
}

function getCharCountLabel(count: number) {
  if (count >= 1000 && count <= 1300) return "Ideal length";
  if (count >= 900 && count < 1000) return "Slightly short";
  if (count > 1300 && count <= 1400) return "Slightly long";
  if (count < 900) return "Too short";
  return "Too long";
}

function getScoreColor(score: number) {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--accent)";
  if (score >= 40) return "#EAB308";
  return "var(--error)";
}

function LinkedInPreview({ hook, body }: { hook: string; body: string }) {
  return (
    <div
      className="rounded-xl p-5 max-w-lg mx-auto"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="h-10 w-10 rounded-full shrink-0"
          style={{ background: "var(--accent)" }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>You</p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Creator &middot; 1st</p>
        </div>
      </div>

      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
        {hook && (
          <span className="font-semibold">{hook}</span>
        )}
        {hook && body && "\n\n"}
        {body}
      </div>

      <div
        className="flex items-center gap-6 mt-4 pt-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {["Like", "Comment", "Repost", "Send"].map((label) => (
          <span key={label} className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Toolbar({ onAction }: { onAction: (action: string) => void }) {
  const buttons = [
    { label: "B", action: "bold", title: "Bold" },
    { label: "I", action: "italic", title: "Italic" },
    { label: "Emoji", action: "emoji", title: "Add Emoji" },
  ];

  return (
    <div className="flex items-center gap-1">
      {buttons.map((btn) => (
        <button
          key={btn.action}
          onClick={() => onAction(btn.action)}
          className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
          style={{ color: "var(--text-muted)", background: "var(--bg-tertiary)" }}
          title={btn.title}
        >
          {btn.action === "bold" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            </svg>
          ) : btn.action === "italic" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          ) : (
            <span>😀</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function PostEditor({ post, index, onUpdate, onSave, onApprove, onDiscard }: PostEditorProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("edit");
  const [hook, setHook] = useState(post.hook);
  const [body, setBody] = useState(post.body);
  const [copied, setCopied] = useState(false);

  const totalChars = hook.length + body.length + (hook && body ? 2 : 0);
  const charColor = getCharCountColor(totalChars);
  const charLabel = getCharCountLabel(totalChars);

  const handleChange = useCallback(
    (field: "hook" | "body", value: string) => {
      if (field === "hook") setHook(value);
      else setBody(value);

      const updatedHook = field === "hook" ? value : hook;
      const updatedBody = field === "body" ? value : body;
      onUpdate(index, { ...post, hook: updatedHook, body: updatedBody });
    },
    [post, index, hook, body, onUpdate]
  );

  const handleToolbar = useCallback(
    (action: string) => {
      if (action === "bold") {
        handleChange("body", body + "**bold text**");
      } else if (action === "italic") {
        handleChange("body", body + "_italic text_");
      } else if (action === "emoji") {
        handleChange("body", body + " ");
      }
    },
    [body, handleChange]
  );

  const handleCopyPrompt = useCallback(() => {
    if (post.imagePrompt) {
      navigator.clipboard.writeText(post.imagePrompt).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [post.imagePrompt]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onApprove();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, onApprove]);

  const score = post.viralityScore ?? 0;
  const scoreColor = getScoreColor(score);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] font-bold px-2 py-1 rounded"
            style={{ background: `${scoreColor}15`, color: scoreColor }}
          >
            {score}/100
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Virality Score
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "var(--bg-tertiary)" }}>
          <button
            onClick={() => setPreviewMode("edit")}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: previewMode === "edit" ? "var(--bg-secondary)" : "transparent",
              color: previewMode === "edit" ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => setPreviewMode("linkedin")}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: previewMode === "linkedin" ? "var(--bg-secondary)" : "transparent",
              color: previewMode === "linkedin" ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            LinkedIn Preview
          </button>
        </div>
      </div>

      {previewMode === "linkedin" ? (
        <LinkedInPreview hook={hook} body={body} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-4 pt-3">
              <Toolbar onAction={handleToolbar} />
            </div>

            <div className="px-4 pb-2 pt-2">
              <input
                type="text"
                value={hook}
                onChange={(e) => handleChange("hook", e.target.value)}
                placeholder="Hook (first line that grabs attention)"
                className="w-full text-sm font-semibold px-0 py-1 outline-none bg-transparent"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            <div className="px-4 pb-3">
              <textarea
                value={body}
                onChange={(e) => handleChange("body", e.target.value)}
                placeholder="Write your post body here..."
                className="w-full text-sm px-0 py-1 outline-none resize-none bg-transparent leading-relaxed"
                style={{ color: "var(--text-primary)", minHeight: "160px" }}
                rows={8}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: charColor }}>
                {totalChars.toLocaleString()} / 1,000-1,300
              </span>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {charLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {post.imagePrompt && (
        <ImagePromptCard
          imagePrompt={post.imagePrompt}
          onCopy={handleCopyPrompt}
          copied={copied}
        />
      )}

      <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            AI Explanation
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          This post uses a <strong style={{ color: "var(--text-primary)" }}>pattern interrupt hook</strong> to
          stop the scroll, followed by a story-driven narrative that builds
          credibility. The body leverages short paragraphs and line breaks for
          maximum readability on mobile, ending with a clear call-to-action
          that invites engagement. Virality score: {score}/100.
        </p>
      </div>

      <div
        className="flex items-center justify-between pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <button
          onClick={onDiscard}
          className="btn-ghost text-sm"
        >
          Discard
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            className="btn-secondary text-sm"
          >
            Save Draft
          </button>
          <button
            onClick={onApprove}
            className="btn-primary text-sm"
          >
            Approve & Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
