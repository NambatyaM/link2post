"use client";

import { useState, useRef, useEffect } from "react";
import type { ContentType } from "@/lib/types";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "post", label: "Post" },
  { value: "carousel", label: "Carousel" },
  { value: "article", label: "Article" },
  { value: "script", label: "Video Script" },
];

export default function TranscriptInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (title: string, transcript: string, contentType: ContentType) => void;
  isLoading: boolean;
}) {
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("post");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = transcript.trim();
    if (!trimmed) {
      setError("Paste your transcript first.");
      return;
    }
    if (trimmed.length < 100) {
      setError("Transcript is too short. Paste at least a few paragraphs.");
      return;
    }
    setError("");
    onSubmit(title.trim() || "Untitled video", trimmed, contentType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const charCount = transcript.length;

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
      <div className="flex gap-1.5 flex-wrap">
        {CONTENT_TYPES.map((ct) => (
          <button
            key={ct.value}
            type="button"
            onClick={() => setContentType(ct.value)}
            disabled={isLoading}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              background: contentType === ct.value ? "var(--accent)" : "var(--bg-tertiary)",
              color: contentType === ct.value ? "white" : "var(--text-muted)",
              border: `1px solid ${contentType === ct.value ? "var(--accent)" : "var(--border-light)"}`,
            }}
          >
            {ct.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all"
        style={{
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        disabled={isLoading}
      />
      <div
        className="rounded-2xl transition-all"
        style={{
          background: "var(--bg-secondary)",
          border: `1px solid ${error ? "#ef4444" : "var(--border)"}`,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={transcript}
          onChange={(e) => { setTranscript(e.target.value); setError(""); }}
          placeholder="Paste your transcript here..."
          className="w-full text-sm px-4 py-3 outline-none resize-none bg-transparent"
          style={{
            color: "var(--text-primary)",
            minHeight: "48px",
            maxHeight: "200px",
          }}
          rows={1}
          disabled={isLoading}
          autoFocus
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {charCount > 0 ? `${charCount.toLocaleString()} chars` : ""}
          </span>
          <button
            type="submit"
            disabled={isLoading || !transcript.trim()}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
            style={{
              background: transcript.trim() ? "var(--accent)" : "var(--bg-tertiary)",
              color: transcript.trim() ? "white" : "var(--text-muted)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
      {error && (
        <p className="text-xs px-1" style={{ color: "#ef4444" }}>{error}</p>
      )}
    </form>
  );
}
