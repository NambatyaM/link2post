"use client";

import { useMemo } from "react";

const STAGES = [
  { label: "Analyzing your content", icon: "search" },
  { label: "Writing your posts", icon: "write" },
  { label: "Building your calendar", icon: "calendar" },
] as const;

function StageIcon({ type, done }: { type: string; done: boolean }) {
  if (done) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  const color = "var(--text-muted)";
  switch (type) {
    case "search":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "write":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ProcessingStages({ videoTitle, stage }: { videoTitle?: string; stage?: "generating" | "done" }) {
  const completedStages = useMemo(() => {
    if (stage === "generating") return [0, 1];
    if (stage === "done") return [0, 1, 2];
    return [];
  }, [stage]);

  return (
    <div className="w-full max-w-[400px]">
      {videoTitle && (
        <p className="text-sm text-center mb-6 truncate" style={{ color: "var(--text-muted)" }}>
          {videoTitle}
        </p>
      )}
      <div className="space-y-3">
        {STAGES.map((s, i) => {
          const done = completedStages.includes(i);
          const active = !done && (i === 0 || completedStages.includes(i - 1)) && i < STAGES.length && !completedStages.includes(i);
          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: done ? "rgba(16,163,127,0.12)" : active ? "var(--bg-tertiary)" : "transparent",
                  border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border-light)",
                }}
              >
                {active ? (
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
                ) : (
                  <StageIcon type={s.icon} done={done} />
                )}
              </div>
              <span
                className="text-sm transition-colors"
                style={{
                  color: done ? "var(--accent)" : active ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {s.label}
              </span>
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" className="ml-auto shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
