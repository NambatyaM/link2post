"use client";

import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";

interface ReferralStats {
  code: string | null;
  totalReferrals: number;
  confirmedReferrals: number;
  bonusRemaining: number;
}

export default function ReferralBanner({ session }: { session: Session }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/referral/stats", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, [session]);

  const handleCopyLink = async () => {
    if (!stats?.code) return;
    const link = `${window.location.origin}?ref=${stats.code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied */ }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/referral/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setStats((prev) => prev ? { ...prev, code: data.code } : { code: data.code, totalReferrals: 0, confirmedReferrals: 0, bonusRemaining: 0 });
      }
    } finally {
      setGenerating(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="w-full max-w-[768px] mx-auto mb-5">
      <div
        className="rounded-xl overflow-hidden transition-all"
        style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center gap-3 text-left"
        >
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4h2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              Invite friends, get 3 free generations each
            </p>
            {stats.confirmedReferrals > 0 && (
              <p className="text-[10px]" style={{ color: "var(--accent)" }}>
                {stats.confirmedReferrals} friend{stats.confirmedReferrals !== 1 ? "s" : ""} joined · {stats.bonusRemaining} bonus generations
              </p>
            )}
          </div>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            {stats.code ? (
              <>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 text-xs font-mono px-3 py-2 rounded-lg truncate"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                  >
                    {window.location.origin}?ref={stats.code}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="text-xs font-medium px-3 py-2 rounded-lg transition-colors shrink-0"
                    style={{ background: "var(--accent)", color: copied ? "var(--accent)" : "white" }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out Link2Post — it turns transcripts into LinkedIn content in seconds. Use my referral link for free generations:`)}&url=${encodeURIComponent(`${window.location.origin}?ref=${stats.code}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-[11px] font-medium py-2 rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  >
                    Share on X
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}?ref=${stats.code}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-[11px] font-medium py-2 rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "#0a66c2" }}
                  >
                    Share on LinkedIn
                  </a>
                </div>
              </>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={generating}
                className="w-full text-xs font-medium py-2.5 rounded-lg transition-colors"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {generating ? "Generating..." : "Get your referral link"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
