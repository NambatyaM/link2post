"use client";

import { useState, useEffect } from "react";

interface GenerationFeedbackProps {
  projectId: string;
  shown: boolean;
  onDismiss: () => void;
}

export default function GenerationFeedback({ projectId, shown, onDismiss }: GenerationFeedbackProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const STORAGE_KEY = "link2post_feedback_dismissed";

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (dismissed.includes(projectId)) onDismiss();
    } catch { /* */ }
  }, [projectId, onDismiss]);

  if (!shown || sent) return null;

  const handleDismiss = () => {
    try {
      const dismissed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      dismissed.push(projectId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    } catch { /* */ }
    onDismiss();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/beta/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text, projectId }),
      });
      if (res.ok) {
        setSent(true);
        handleDismiss();
      }
    } catch { /* */ }
    setSending(false);
  };

  return (
    <div
      className="rounded-xl p-4 mb-4 flex items-start gap-3"
      style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}
    >
      <div className="flex-1">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          How was this generation?
        </p>
        <div className="flex gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="text-lg transition-transform hover:scale-110"
              style={{ color: star <= rating ? "#eab308" : "var(--text-muted)" }}
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <div className="flex gap-2 items-end">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Optional: what could be better?"
              className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] outline-none"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-50"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="text-xs shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        ×
      </button>
    </div>
  );
}
