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
  const [done, setDone] = useState<"unlocked" | "waitlist" | null>(null);

  const handleUnlock = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/beta/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone("unlocked");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlist = async () => {
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
        body: JSON.stringify({ email: email.trim(), source: "limit_wall_waitlist" }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone("waitlist");
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
            You&apos;ve used all {limit} free posts
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            You have two options — both free, both immediate.
          </p>
        </div>

        {done === "unlocked" ? (
          <div className="text-center py-4">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--success)" }}>
              Full access unlocked!
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              All features are now available. Reload this page to continue generating.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Reload & Continue
            </button>
          </div>
        ) : done === "waitlist" ? (
          <div className="text-center py-4">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--success)" }}>
              You&apos;re on the waitlist!
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              We&apos;ll email you when paid plans launch with unlimited generation.
            </p>
            <button
              onClick={onDismiss}
              className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-4">
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
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleUnlock}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {loading ? "Working..." : "Get Full Access — Free During Beta"}
              </button>
              <button
                onClick={handleWaitlist}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                Just Join the Waitlist
              </button>
            </div>

            <div className="mt-4 rounded-lg p-3" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                <strong>Full Access:</strong> Unlocks all features now + priority waitlist
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                <strong>Waitlist:</strong> Get notified when paid plans launch (no features unlocked now)
              </p>
            </div>

            <p className="text-[10px] text-center mt-3" style={{ color: "var(--text-muted)" }}>
              No spam. We only email you when something ships.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
