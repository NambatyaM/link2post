"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import type { LinkedInPost } from "@/lib/types";
import ImagePromptCard from "./ImagePromptCard";

const RichTextEditor = lazy(() => import("./RichTextEditor"));

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

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
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

export default function PostEditor({ post, index, onUpdate, onSave, onApprove, onDiscard }: PostEditorProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("edit");
  const [hook, setHook] = useState(post.hook);
  const [body, setBody] = useState(post.body);
  const [copied, setCopied] = useState(false);

  const bodyPlainText = stripHtml(body);
  const totalChars = hook.length + bodyPlainText.length + (hook && bodyPlainText ? 2 : 0);
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

  const handleBodyChange = useCallback(
    (html: string, _plainText: string) => {
      setBody(html);
      const plainBody = stripHtml(html);
      const updatedHook = hook;
      onUpdate(index, { ...post, hook: updatedHook, body: html });
      void plainBody;
    },
    [post, index, hook, onUpdate]
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
            <div className="px-4 pb-2 pt-3">
              <input
                type="text"
                value={hook}
                onChange={(e) => handleChange("hook", e.target.value)}
                placeholder="Hook (first line that grabs attention)"
                className="w-full text-sm font-semibold px-0 py-1 outline-none bg-transparent"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <Suspense fallback={<div className="rounded-xl h-48 animate-pulse" style={{ background: "var(--bg-tertiary)" }} />}>
            <RichTextEditor
              content={body}
              onChange={handleBodyChange}
              placeholder="Write your post body here..."
            />
          </Suspense>

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
