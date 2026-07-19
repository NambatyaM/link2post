"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const PLANS = [
  {
    id: "free",
    label: "Free",
    price: 0,
    description: "Get started, no credit card",
    features: [
      "1 project per month",
      "Up to 5 generated posts",
      "Basic carousel generator",
      "TXT export",
      "Community support",
    ],
    cta: "Start Free",
    highlighted: false,
    comingSoon: false,
  },
  {
    id: "starter",
    label: "Starter",
    price: 19,
    description: "For creators who post consistently",
    features: [
      "10 projects per month",
      "50 posts per month",
      "Brand voice profiling",
      "Full carousel editor + PDF export",
      "All export formats (PDF, DOCX, CSV, Excel)",
      "Priority generation",
      "Email support",
    ],
    cta: "Coming Soon",
    highlighted: true,
    comingSoon: true,
  },
  {
    id: "pro",
    label: "Pro",
    price: 49,
    description: "For power users & teams",
    features: [
      "Unlimited projects",
      "Unlimited posts",
      "Advanced analytics dashboard",
      "Multi-voice profiles",
      "API access",
      "Team collaboration (3 seats)",
      "Dedicated support",
    ],
    cta: "Coming Soon",
    highlighted: false,
    comingSoon: true,
  },
];

function WaitlistForm({ planId, onSuccess }: { planId: string; onSuccess: () => void }) {
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
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ email: email.trim(), source: `pricing_${planId}` }),
      });

      if (!res.ok) throw new Error("Signup failed");
      setDone(true);
      onSuccess();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-3">
        <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
          You're on the list!
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          We'll notify you the moment it launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        placeholder="you@company.com"
        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
        style={{
          background: "var(--bg-tertiary)",
          border: `1px solid ${error ? "var(--error)" : "var(--border)"}`,
          color: "var(--text-primary)",
        }}
        required
      />
      {error && <p className="text-[10px]" style={{ color: "var(--error)" }}>{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
        style={{ background: "var(--accent)", color: "white" }}
      >
        {loading ? "Saving..." : "Notify Me"}
      </button>
    </form>
  );
}

export default function PricingPage() {
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});

  return (
    <main className="min-h-screen px-6 py-12" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Start free. Upgrade when you're ready for more.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: plan.highlighted
                  ? "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))"
                  : "var(--bg-secondary)",
                border: `1px solid ${plan.highlighted ? "var(--accent)" : "var(--border)"}`,
                position: plan.highlighted ? "relative" : undefined,
              }}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  POPULAR
                </span>
              )}

              <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {plan.label}
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                {plan.description}
              </p>
              <p className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
                ${plan.price}
                <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>
                  /month
                </span>
              </p>

              <ul className="flex flex-col gap-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.comingSoon ? (
                subscribed[plan.id] ? (
                  <div className="text-center py-3">
                    <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                      You're on the list!
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      We'll email you the moment this plan launches.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-center mb-2" style={{ color: "var(--text-muted)" }}>
                      Not available yet — join the waitlist
                    </p>
                    <WaitlistForm
                      planId={plan.id}
                      onSuccess={() => setSubscribed((prev) => ({ ...prev, [plan.id]: true }))}
                    />
                  </div>
                )
              ) : (
                <a
                  href="/signup"
                  className="w-full py-3 rounded-lg text-sm font-semibold transition-all text-center block"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                >
                  {plan.cta}
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-center mt-8" style={{ color: "var(--text-muted)" }}>
          Payments secured by Paddle. Cancel anytime. No hidden fees.
        </p>
      </div>
    </main>
  );
}
