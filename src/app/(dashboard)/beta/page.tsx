"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function BetaPage() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [email, setEmail] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }

        const res = await fetch("/api/settings/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHasAccess(data.profile?.beta_access === true);
          setEmail(session.user.email || "");
        }
      } catch { /* */ }
      setLoading(false);
    };
    check();
  }, []);

  const handleUnlock = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setUnlocking(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/beta/unlock", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) setHasAccess(true);
    } catch { /* */ }
    setUnlocking(false);
  };

  const handleFeedback = async () => {
    if (feedbackRating === 0) return;
    setFeedbackSending(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch("/api/beta/feedback", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: feedbackRating, text: feedbackText }),
      });
      setFeedbackSent(true);
    } catch { /* */ }
    setFeedbackSending(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(99,102,241,0.3)", borderTopColor: "var(--accent)" }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(129,140,248,0.12)" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
            style={{ background: "rgba(129,140,248,0.12)", color: "var(--accent)" }}
          >
            Beta Program
          </span>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {hasAccess ? "You've Got Full Access" : "Unlock Everything — Free During Beta"}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {hasAccess
              ? "All features are unlocked while we're in beta. When paid plans launch, you'll be first to know."
              : "Get unlimited projects, full AI generation, brand voice, carousel editor, all exports — completely free while we polish the product."}
          </p>
        </div>

        {!hasAccess ? (
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
              Everything you get for free during beta:
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "Unlimited projects & transcripts",
                "Full AI content generation (5 posts, articles, carousels)",
                "Brand voice profiling",
                "Full carousel editor + PDF export",
                "All export formats (PDF, Word, Excel, CSV, ZIP)",
                "Content calendar",
                "Priority generation speed",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
              Enter your email to unlock and join the waitlist for when paid plans launch:
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-3 py-2.5 rounded-lg text-xs outline-none"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={handleUnlock}
                disabled={unlocking || !email.trim() || !email.includes("@")}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {unlocking ? "Unlocking..." : "Get Full Access"}
              </button>
            </div>
            <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
              We'll email you when paid plans launch. No spam, ever.
            </p>
          </div>
        ) : (
          <>
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))", border: "1px solid var(--accent)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All features unlocked</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>You're on the priority waitlist</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Unlimited projects", "Full AI generation", "Brand voice", "All exports", "Carousel editor"].map((f) => (
                  <span key={f} className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {!feedbackSent ? (
              <div
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  How's your experience so far?
                </h2>
                <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                  Your feedback directly shapes what we build next.
                </p>

                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="text-2xl transition-transform hover:scale-110"
                      style={{ color: star <= feedbackRating ? "#eab308" : "var(--text-muted)" }}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What could we improve? What do you love? What's missing?"
                  className="w-full px-3 py-2.5 rounded-lg text-xs outline-none resize-none mb-3"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    minHeight: "80px",
                  }}
                  rows={3}
                />

                <button
                  onClick={handleFeedback}
                  disabled={feedbackRating === 0 || feedbackSending}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {feedbackSending ? "Sending..." : "Submit Feedback"}
                </button>
              </div>
            ) : (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--success)" }}>
                  Thanks for the feedback!
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  It helps us build a better product for you.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 text-xs font-medium px-4 py-2 rounded-lg"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </>
        )}

        {!hasAccess && (
          <div className="text-center mt-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Skip for now →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
