"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const FEATURES = [
  { icon: "🔍", title: "Transcript Mining", desc: "Extract the most compelling ideas, stories, and insights from any transcript automatically." },
  { icon: "🎙️", title: "Voice Cloning", desc: "AI learns your unique tone, vocabulary, and style so every post sounds like you wrote it." },
  { icon: "🎨", title: "Visual Strategy", desc: "AI-generated image prompts for every post so your content stops the scroll." },
  { icon: "⚡", title: "Zero-Prompt", desc: "No prompt engineering needed. Paste your transcript and let the AI do the work." },
  { icon: "📈", title: "Algorithm Native", desc: "Content optimized for LinkedIn's algorithm — hooks, structure, and timing." },
  { icon: "📅", title: "Monthly Calendar", desc: "Auto-scheduled content calendar with best posting times for maximum reach." },
];

const STEPS = [
  { num: 1, title: "Paste Transcript", desc: "Drop in your podcast, meeting, or note transcript — any length, any format.", mock: "🎙️ Podcast transcript pasted — 4,200 words" },
  { num: 2, title: "AI Generates Content", desc: "Our AI extracts insights, writes in your voice, and crafts visual strategies.", mock: "✨ 12 posts, 2 articles, 15 image prompts generated" },
  { num: 3, title: "Calendar Mapped", desc: "Get a month of content with optimal posting times, ready to schedule.", mock: "📅 30 days mapped — Mon–Fri at peak engagement hours" },
];

const PRICING = [
  { name: "Free", price: "$0", period: "forever", features: ["1 project", "3 posts per month", "Basic transcript mining", "Content calendar"], cta: "Start Free", highlighted: false },
  { name: "Pro", price: "$29", period: "/month", features: ["10 projects", "20 posts per month", "Full voice cloning", "Visual strategy prompts", "Analytics dashboard", "Priority support"], cta: "Start Pro Trial", highlighted: true },
  { name: "Business", price: "$99", period: "/month", features: ["Unlimited projects", "Unlimited posts", "Multi-voice profiles", "Team collaboration", "Advanced analytics", "API access", "Dedicated support"], cta: "Contact Sales", highlighted: false },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function RevealBlock({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    stepTimerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3000);
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current); };
  }, []);

  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100dvh" }}>
      <style>{`
        @keyframes meshShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes stepPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .step-dot-active { animation: stepPulse 1.5s ease-in-out infinite; }
        .pricing-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
        style={{ height: 64, background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Link2Post" className="h-7 w-auto" />
          <span className="text-sm font-semibold hidden sm:inline" style={{ color: "var(--text-primary)" }}>Link2Post</span>
        </Link>
        <div className="flex items-center gap-5">
          <a href="#features" className="text-xs hidden sm:inline" style={{ color: "var(--text-secondary)" }}>Features</a>
          <a href="#pricing" className="text-xs hidden sm:inline" style={{ color: "var(--text-secondary)" }}>Pricing</a>
          <Link href="/login" className="text-xs" style={{ color: "var(--text-secondary)" }}>Login</Link>
          <Link
            href="/signup"
            className="text-xs font-medium px-4 py-2 rounded-lg"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 overflow-hidden" style={{ minHeight: "90vh" }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129,140,248,0.15), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(129,140,248,0.07), transparent), radial-gradient(ellipse 60% 40% at 20% 60%, rgba(16,185,129,0.05), transparent)",
            animation: "meshShift 12s ease-in-out infinite",
            backgroundSize: "200% 200%",
          }}
        />
        <div className="relative max-w-3xl">
          <RevealBlock>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Paste Once. Build a Month of LinkedIn Authority.
            </h1>
          </RevealBlock>
          <RevealBlock delay={0.1}>
            <p className="mt-6 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              The AI ghostwriter that turns your podcasts, meetings, and notes into high-performing LinkedIn content — complete with visual asset strategies.
            </p>
          </RevealBlock>
          <RevealBlock delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="text-sm font-semibold px-7 py-3.5 rounded-xl transition-all"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Start Building Authority Free
              </Link>
              <a
                href="#demo"
                className="text-sm px-7 py-3.5 rounded-xl transition-all"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                See How It Works
              </a>
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">From Transcript to Content in 3 Steps</h2>
            <p className="text-center text-sm mb-16 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              No prompt engineering. No context windows. Just paste and go.
            </p>
          </RevealBlock>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <RevealBlock key={step.num} delay={i * 0.12}>
                <button
                  onClick={() => { setActiveStep(i); if (stepTimerRef.current) clearInterval(stepTimerRef.current); }}
                  className="w-full text-left rounded-2xl p-6 transition-all cursor-pointer"
                  style={{
                    background: activeStep === i ? "var(--bg-tertiary)" : "var(--bg-primary)",
                    border: `1px solid ${activeStep === i ? "var(--accent)" : "var(--border)"}`,
                    boxShadow: activeStep === i ? "0 0 0 1px rgba(129,140,248,0.15)" : "none",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                      style={{ background: activeStep === i ? "var(--accent)" : "var(--bg-hover)", color: activeStep === i ? "#fff" : "var(--text-muted)" }}
                    >
                      {step.num}
                    </span>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{step.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
                  <div
                    className="rounded-xl px-4 py-3 text-xs font-mono"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      color: activeStep === i ? "var(--accent)" : "var(--text-muted)",
                      opacity: activeStep === i ? 1 : 0.5,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {step.mock}
                  </div>
                </button>
              </RevealBlock>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-8">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${activeStep === i ? "step-dot-active" : ""}`}
                style={{ background: activeStep === i ? "var(--accent)" : "var(--border)" }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Everything You Need</h2>
            <p className="text-center text-sm mb-16 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Built specifically for LinkedIn creators who want to repurpose content at scale.
            </p>
          </RevealBlock>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <RevealBlock key={f.title} delay={i * 0.07}>
                <div
                  className="rounded-2xl p-6 h-full transition-all"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                >
                  <span className="text-2xl block mb-3">{f.icon}</span>
                  <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Simple Pricing</h2>
            <p className="text-center text-sm mb-16 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Start free, upgrade when you&apos;re ready to scale your LinkedIn presence.
            </p>
          </RevealBlock>
          <div className="grid sm:grid-cols-3 gap-5 items-stretch">
            {PRICING.map((plan, i) => (
              <RevealBlock key={plan.name} delay={i * 0.1}>
                <div
                  className="pricing-card rounded-2xl p-6 flex flex-col h-full transition-all duration-200"
                  style={{
                    background: "var(--bg-primary)",
                    border: plan.highlighted ? "2px solid var(--accent)" : "1px solid var(--border)",
                  }}
                >
                  {plan.highlighted && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider mb-3 inline-block"
                      style={{ color: "var(--accent)" }}
                    >
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-5">
                    <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{plan.price}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--success)" }}>✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className="block text-center text-xs font-semibold py-2.5 rounded-xl transition-all"
                    style={{
                      background: plan.highlighted ? "var(--accent)" : "transparent",
                      color: plan.highlighted ? "#fff" : "var(--text-secondary)",
                      border: plan.highlighted ? "none" : "1px solid var(--border)",
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Link2Post" className="h-5 w-auto" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>&copy; {new Date().getFullYear()} Link2Post. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs" style={{ color: "var(--text-secondary)" }}>Features</a>
            <a href="#pricing" className="text-xs" style={{ color: "var(--text-secondary)" }}>Pricing</a>
            <Link href="/login" className="text-xs" style={{ color: "var(--text-secondary)" }}>Login</Link>
            <Link href="/signup" className="text-xs" style={{ color: "var(--text-secondary)" }}>Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
