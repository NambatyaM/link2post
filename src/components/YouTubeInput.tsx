"use client";

import { useState } from "react";

export default function YouTubeInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const ytPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)/;
    const idOnly = /^[a-zA-Z0-9_-]{11}$/;
    if (!ytPattern.test(trimmed) && !idOnly.test(trimmed)) {
      setError("Paste a valid YouTube URL.");
      return;
    }
    setError("");
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[520px]">
      <input
        type="text"
        value={url}
        onChange={(e) => { setUrl(e.target.value); setError(""); }}
        placeholder="Paste your YouTube link."
        className="w-full text-base px-5 py-4 rounded-xl outline-none mb-3 transition-colors"
        style={{
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          border: `1px solid ${error ? "#ef4444" : "var(--border)"}`,
        }}
        disabled={isLoading}
        autoFocus
      />
      {error && (
        <p className="text-xs mb-3 px-1" style={{ color: "#ef4444" }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="w-full text-sm font-medium py-3.5 rounded-xl transition-colors disabled:opacity-30"
        style={{ background: "var(--accent)", color: "white" }}
      >
        Generate this week&apos;s content
      </button>
    </form>
  );
}
