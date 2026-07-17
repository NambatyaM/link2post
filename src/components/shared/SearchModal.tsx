"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "project" | "post" | "calendar";
  href: string;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      prevOpenRef.current = open;
      return () => { clearTimeout(t); };
    }
    prevOpenRef.current = open;
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({ q });
      const res = await fetch(`/api/search?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });
      if (!res.ok) return;

      const data = await res.json();
      const mapped: SearchResult[] = [];

      if (data.projects) {
        for (const p of data.projects) {
          mapped.push({
            id: p.id,
            title: p.title,
            subtitle: new Date(p.created_at).toLocaleDateString(),
            type: "project",
            href: `/projects/${p.id}`,
          });
        }
      }
      if (data.posts) {
        for (const p of data.posts) {
          mapped.push({
            id: p.id,
            title: p.hook || p.content.slice(0, 60),
            subtitle: p.post_type,
            type: "post",
            href: `/projects/${p.project_id}`,
          });
        }
      }
      if (data.calendar) {
        for (const c of data.calendar) {
          mapped.push({
            id: c.id,
            title: c.title,
            subtitle: `${c.day} · ${c.type}`,
            type: "calendar",
            href: `/calendar`,
          });
        }
      }

      setResults(mapped);
      setActiveIndex(0);
    } catch {
      if (!controller.signal.aborted) {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        router.push(results[activeIndex].href);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, results, activeIndex, router]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  const grouped = groupResults(results);
  let globalIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: "15vh" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fixed inset-0"
        style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      />
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          margin: "0 16px",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-muted)", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, posts, calendar..."
            className="flex-1 text-sm py-3 bg-transparent"
            style={{ color: "var(--text-primary)" }}
          />
          {loading && (
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin-slow"
              style={{
                borderColor: "var(--text-muted)",
                borderTopColor: "var(--accent)",
              }}
            />
          )}
        </div>

        <div
          ref={listRef}
          className="overflow-y-auto"
          style={{ maxHeight: 360 }}
        >
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No results found.
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.type}>
              <div
                className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {group.type}
              </div>
              {group.items.map((item) => {
                globalIndex++;
                const idx = globalIndex;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{
                      background: isActive ? "var(--bg-hover)" : "transparent",
                      color: "var(--text-primary)",
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      router.push(item.href);
                      onClose();
                    }}
                  >
                    <TypeIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {item.subtitle}
                      </p>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--text-muted)", flexShrink: 0, opacity: isActive ? 1 : 0 }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          className="flex items-center gap-4 px-4 py-2 border-t text-[11px]"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <span className="flex items-center gap-1">
            <kbd
              className="font-mono rounded px-1"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
            >
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="font-mono rounded px-1"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
            >
              ↵
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className="font-mono rounded px-1"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
            >
              esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

function groupResults(
  results: SearchResult[],
): { type: string; items: SearchResult[] }[] {
  const groups: Record<string, SearchResult[]> = {};
  for (const r of results) {
    const key = r.type === "project" ? "Projects" : r.type === "post" ? "Posts" : "Calendar";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups).map(([type, items]) => ({ type, items }));
}

function TypeIcon({ type }: { type: string }) {
  const color =
    type === "project"
      ? "var(--accent)"
      : type === "post"
        ? "var(--success)"
        : "var(--text-muted)";

  if (type === "project") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (type === "post") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
