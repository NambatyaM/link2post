"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const PLANS = [
  {
    id: "free",
    label: "Free",
    price: 0,
    description: "Try before you commit",
    features: ["2 posts per month", "2 AI providers", "Basic exports (TXT)", "Community support"],
    popular: false,
  },
  {
    id: "starter",
    label: "Starter",
    price: 15,
    description: "For growing creators",
    features: ["50 posts per month", "4 AI providers (faster failover)", "PDF, DOCX, XLSX exports", "Brand voice profiling", "Carousel editor", "Email support"],
    popular: false,
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID,
  },
  {
    id: "pro",
    label: "Pro",
    price: 49,
    description: "For power users & teams",
    features: ["Unlimited posts", "All 6 AI providers", "Priority AI routing", "All export formats", "Advanced analytics", "Priority support"],
    popular: true,
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [paddle, setPaddle] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { initializePaddle } = await import("@paddle/paddle-js");
        const instance = await initializePaddle({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "",
          environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "sandbox" : "production",
        });
        if (instance) setPaddle(instance);
      } catch {
        /* Paddle not configured */
      }
    };
    if (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) init();
  }, []);

  const handleSelect = async (planId: string) => {
    if (planId === "free") {
      router.push("/projects/new");
      return;
    }

    setLoading(planId);

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        router.push("/login");
        return;
      }

      const plan = PLANS.find((p) => p.id === planId);
      if (!plan?.paddlePriceId) {
        setLoading(null);
        return;
      }

      if (paddle) {
        paddle.Checkout.open({
          items: [{ priceId: plan.paddlePriceId, quantity: 1 }],
          customer: { email: session.user.email },
          successCallback: () => {
            router.push("/dashboard");
          },
        });
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Start free, upgrade when you need more
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: plan.popular ? "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))" : "var(--bg-secondary)",
                border: `1px solid ${plan.popular ? "var(--accent)" : "var(--border)"}`,
                position: plan.popular ? "relative" : undefined,
              }}
            >
              {plan.popular && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  BEST VALUE
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

              <ul className="flex flex-col gap-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={loading === plan.id}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: plan.id === "free" ? "var(--bg-tertiary)" : "var(--accent)",
                  color: plan.id === "free" ? "var(--text-primary)" : "white",
                }}
              >
                {loading === plan.id ? "Opening checkout..." : plan.id === "free" ? "Start Free" : `Subscribe ${plan.label}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-center mt-8" style={{ color: "var(--text-muted)" }}>
          All plans include a 7-day free trial. Cancel anytime. Payments secured by Paddle.
        </p>
      </div>
    </main>
  );
}
