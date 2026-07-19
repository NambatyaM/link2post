"use client";

import { useState } from "react";

interface UpgradeWallProps {
  remaining: number;
  limit: number;
  onDismiss: () => void;
}

export default function UpgradeWall({ remaining, limit, onDismiss }: UpgradeWallProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "limit_wall" }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div
        className="rounded-2xl p-8 max-w-md w-full mx-4 relative"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-lg"
          style={{ color: "var(--text-muted)" }}
        >
          ×
        </button>

        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}
          >
            🚀
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            You&apos;ve hit your free limit
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            You&apos;ve used all {limit} free posts this month.
            Paid plans are launching soon — with unlimited posts, brand voice profiling, carousel exports, and more.
          </p>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--success)" }}>
              You&apos;re on the list!
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              We&apos;ll email you the moment paid plans go live.<br />
              No spam. Just a heads-up when it&apos;s ready.
            </p>
            <button
              onClick={onDismiss}
              className="mt-4 text-xs font-medium px-4 py-2 rounded-lg"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-center mb-3" style={{ color: "var(--text-secondary)" }}>
              Enter your email to get notified when paid plans launch:
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: `1px solid ${error ? "var(--error)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                }}
                required
                autoFocus
              />
              {error && <p className="text-[11px] text-center" style={{ color: "var(--error)" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {loading ? "Saving..." : "Notify Me When Plans Launch"}
              </button>
            </form>
            <p className="text-[10px] text-center mt-3" style={{ color: "var(--text-muted)" }}>
              No spam. Unsubscribe anytime. We only email you when something ships.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
