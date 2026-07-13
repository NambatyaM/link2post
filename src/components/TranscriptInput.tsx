"use client";

import { useState } from "react";

export default function TranscriptInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (title: string, transcript: string) => void;
  isLoading: boolean;
}) {
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

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
    onSubmit(title.trim() || "Untitled video", trimmed);
  };

  const charCount = transcript.length;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[600px]">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Video title (optional)"
        className="w-full text-sm px-4 py-3 rounded-xl outline-none mb-3 transition-colors"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        disabled={isLoading}
      />
      <textarea
        value={transcript}
        onChange={(e) => { setTranscript(e.target.value); setError(""); }}
        placeholder={"Paste your YouTube transcript here.\n\nTo get it: open the video on YouTube, click the three dots (⋯) below the video, select \"Show transcript\", copy all the text, and paste it here."}
        className="w-full text-sm px-4 py-3 rounded-xl outline-none mb-2 transition-colors resize-none"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: `1px solid ${error ? "#ef4444" : "var(--border)"}`,
          minHeight: "180px",
        }}
        disabled={isLoading}
        autoFocus
      />
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {charCount > 0 ? `${charCount.toLocaleString()} characters` : ""}
        </span>
        {charCount > 0 && charCount < 100 && (
          <span className="text-[11px]" style={{ color: "#ef4444" }}>
            Need at least 100 characters
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs mb-3 px-1" style={{ color: "#ef4444" }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={isLoading || !transcript.trim()}
        className="w-full text-sm font-medium py-3.5 rounded-xl transition-colors disabled:opacity-30"
        style={{ background: "var(--accent)", color: "white" }}
      >
        Generate this week&apos;s content
      </button>
    </form>
  );
}
