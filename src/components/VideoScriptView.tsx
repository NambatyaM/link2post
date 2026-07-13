"use client";

import { useState } from "react";
import type { VideoScript } from "@/lib/types";

const SECTION_COLORS: Record<string, string> = {
  Hook: "#ef4444",
  Problem: "#f59e0b",
  Solution: "var(--accent)",
  CTA: "#0a66c2",
};

export default function VideoScriptView({ script }: { script: VideoScript }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const lines = script.sections.map((s) =>
      `[${s.timestamp}] ${s.label} (${s.duration})\n${s.script}\n[Visual: ${s.visual}]\n[Caption: ${s.caption}]`
    );
    const text = `SHORT VIDEO SCRIPT\n${script.totalDuration} | ${script.platformNotes}\n\n${lines.join("\n\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied */ }
  };

  return (
    <div className="w-full max-w-[600px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Short Video Script</h3>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {script.totalDuration} · {script.platformNotes}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ border: "1px solid var(--border)", color: copied ? "var(--accent)" : "var(--text-muted)" }}
        >
          {copied ? "Copied!" : "Copy script"}
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5" style={{ background: "var(--border-light)" }} />

        <div className="space-y-4">
          {script.sections.map((section, i) => {
            const color = SECTION_COLORS[section.label] || "var(--accent)";
            return (
              <div key={i} className="relative pl-10">
                <div
                  className="absolute left-0 w-[31px] h-[31px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: color }}
                >
                  {section.timestamp}
                </div>

                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold" style={{ color }}>{section.label}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{section.duration}</span>
                  </div>

                  <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-primary)" }}>
                    &ldquo;{section.script}&rdquo;
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-medium shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>Visual</span>
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{section.visual}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-medium shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>Caption</span>
                      <p className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>{section.caption}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
