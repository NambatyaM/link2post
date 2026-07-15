"use client";

import { useState } from "react";

const TARGET_TOOLS = ["Midjourney", "DALL-E 3", "Stable Diffusion"] as const;

interface ImagePromptCardProps {
  imagePrompt: string;
  onCopy: () => void;
  copied?: boolean;
}

export default function ImagePromptCard({ imagePrompt, onCopy, copied }: ImagePromptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tool, setTool] = useState<string>(TARGET_TOOLS[0]);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Visual Asset Strategy
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-all"
        style={{
          maxHeight: expanded ? "400px" : "0",
          opacity: expanded ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.2s ease",
        }}
      >
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div
            className="rounded-lg p-4 overflow-x-auto"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
              }}
            >
              {imagePrompt}
            </pre>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Target:
              </label>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                className="text-xs px-2 py-1 rounded outline-none"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {TARGET_TOOLS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: copied ? "rgba(16, 185, 129, 0.15)" : "var(--bg-tertiary)",
                color: copied ? "var(--success)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Prompt
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
