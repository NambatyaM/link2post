"use client";

import { useState, useRef, useEffect } from "react";

interface ModelOption {
  providerId: string;
  providerLabel: string;
  tagline: string;
  modelId: string;
  modelLabel: string;
}

export default function ModelSelector({
  options,
  selected,
  onSelect,
}: {
  options: ModelOption[];
  selected: { providerId: string; modelId: string } | null;
  onSelect: (providerId: string, modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = options.find(
    (o) => o.providerId === selected?.providerId && o.modelId === selected?.modelId,
  );

  const grouped = options.reduce<Record<string, ModelOption[]>>((acc, opt) => {
    if (!acc[opt.providerId]) acc[opt.providerId] = [];
    acc[opt.providerId].push(opt);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg transition-colors"
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        {current ? (
          <span>{current.tagline} <span style={{ color: "var(--text-muted)" }}>via {current.providerLabel}</span></span>
        ) : (
          "Auto-select best model"
        )}
        <svg
          width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-80 rounded-xl overflow-hidden z-50 py-1"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border-light)" }}>
            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              Choose AI model — all are free
            </p>
          </div>
          {Object.entries(grouped).map(([providerId, models]) => {
            const providerLabel = models[0].providerLabel;
            const tagline = models[0].tagline;
            return (
              <div key={providerId}>
                <div
                  className="px-3 py-1.5 flex items-center gap-2"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {providerLabel}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--accent)",
                    }}
                  >
                    {tagline}
                  </span>
                </div>
                {models.map((opt) => {
                  const isSelected =
                    opt.providerId === selected?.providerId && opt.modelId === selected?.modelId;
                  return (
                    <button
                      key={`${opt.providerId}-${opt.modelId}`}
                      type="button"
                      onClick={() => {
                        onSelect(opt.providerId, opt.modelId);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
                      style={{
                        background: isSelected ? "rgba(99,102,241,0.1)" : "transparent",
                        color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "var(--bg-tertiary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {!isSelected && <span className="w-[10px]" />}
                      {opt.modelLabel}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
