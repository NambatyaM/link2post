"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), { ssr: false });

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: "Transcript Mining",
    desc: "Paste any transcript — podcast, meeting, or notes. AI extracts the most compelling ideas, stories, and insights automatically.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
      </svg>
    ),
    title: "Voice Cloning",
    desc: "AI learns your unique tone, vocabulary, and style from your past content — so every post sounds like you wrote it.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    title: "Visual Strategy",
    desc: "AI generates scroll-stopping image prompts for every post — carousels, infographics, and cover images ready for your designer.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "Carousel Builder",
    desc: "Canva-like drag-and-drop editor for LinkedIn carousels. Choose themes, fonts, colors — export as PDF, ready to post.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Algorithm Native",
    desc: "Content optimized for LinkedIn's algorithm — hooks, structure, engagement triggers, and optimal posting times.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: "Monthly Calendar",
    desc: "Auto-scheduled content calendar mapped to peak engagement hours — Mon through Fri, optimized for your niche.",
  },
];

const STEPS = [
  {
    num: 1,
    title: "Paste Your Transcript",
    desc: "Drop in your podcast, meeting, or note transcript — any length, any format. No prompt engineering needed.",
  },
  {
    num: 2,
    title: "AI Generates Everything",
    desc: "Posts, articles, carousels, image prompts, content calendar — all written in your voice, optimized for LinkedIn.",
  },
  {
    num: 3,
    title: "Customize & Publish",
    desc: "Edit with our Canva-like editor, pick your visual style, and export PDFs ready for LinkedIn. Post in minutes.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["1 project", "3 posts per month", "Basic transcript mining", "Content calendar"],
    cta: "Start Free",
    highlighted: false,
    link: "/signup",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    features: [
      "10 projects",
      "20 posts per month",
      "Full voice cloning",
      "Visual strategy prompts",
      "Carousel builder",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Coming Soon",
    highlighted: true,
    link: "/beta",
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    features: [
      "Unlimited projects",
      "Unlimited posts",
      "Multi-voice profiles",
      "Team collaboration",
      "Advanced analytics",
      "API access",
      "Dedicated support",
    ],
    cta: "Coming Soon",
    highlighted: false,
    link: "/beta",
  },
];

const STATS = [
  { value: "30s", label: "Average generation time" },
  { value: "12+", label: "Posts per transcript" },
  { value: "80+", label: "Average virality score" },
  { value: "100%", label: "Voice-matched content" },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function RevealBlock({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
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

function EditorMockup() {
  const [activeTab, setActiveTab] = useState<"posts" | "carousel" | "calendar">("posts");

  return (
    <div
      className="rounded-xl overflow-hidden text-left"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset",
      }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex gap-1 text-[10px] px-3 py-1 rounded-md" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
            link2post.app/editor
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["posts", "carousel", "calendar"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium capitalize transition-colors"
            style={{
              background: activeTab === tab ? "var(--accent)" : "transparent",
              color: activeTab === tab ? "#fff" : "var(--text-muted)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex" style={{ minHeight: 220 }}>
        {/* Sidebar */}
        <div className="w-48 p-3 flex flex-col gap-1.5" style={{ borderRight: "1px solid var(--border)" }}>
          {activeTab === "posts" && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2.5"
                  style={{
                    background: i === 1 ? "rgba(129,140,248,0.1)" : "transparent",
                    border: i === 1 ? "1px solid rgba(129,140,248,0.3)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Post #{i}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "var(--success)" }}>
                      {85 - i * 5}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full w-3/4" style={{ background: "var(--border)" }} />
                  <div className="h-1.5 rounded-full w-1/2 mt-1" style={{ background: "var(--border)" }} />
                </div>
              ))}
            </>
          )}
          {activeTab === "carousel" && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden"
                  style={{
                    border: i === 1 ? "2px solid var(--accent)" : "2px solid transparent",
                    background: "var(--bg-primary)",
                    aspectRatio: "1",
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgba(129,140,248,${0.1 + i * 0.05}), rgba(168,85,247,${0.05 + i * 0.03}))` }}>
                    <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{i}</span>
                  </div>
                </div>
              ))}
            </>
          )}
          {activeTab === "calendar" && (
            <>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
                <div key={day} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: i === 2 ? "rgba(129,140,248,0.1)" : "transparent" }}>
                  <span className="text-[10px] font-medium w-7" style={{ color: "var(--text-muted)" }}>{day}</span>
                  <div className="flex-1 h-5 rounded" style={{ background: i < 3 ? "var(--border)" : "transparent" }} />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          {activeTab === "posts" && (
            <>
              <div className="rounded-lg p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                <div className="h-3 rounded w-2/3 mb-3" style={{ background: "var(--accent)", opacity: 0.3 }} />
                <div className="space-y-1.5">
                  <div className="h-2 rounded w-full" style={{ background: "var(--border)" }} />
                  <div className="h-2 rounded w-5/6" style={{ background: "var(--border)" }} />
                  <div className="h-2 rounded w-3/4" style={{ background: "var(--border)" }} />
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="h-5 rounded-full w-16" style={{ background: "var(--border)" }} />
                  <div className="h-5 rounded-full w-20" style={{ background: "var(--border)" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 rounded-lg flex-1" style={{ background: "var(--accent)", opacity: 0.2 }} />
                <div className="h-8 rounded-lg w-24" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }} />
              </div>
            </>
          )}
          {activeTab === "carousel" && (
            <div className="flex-1 flex items-center justify-center">
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  width: 200,
                  height: 200,
                  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 20,
                }}
              >
                <div className="h-2 rounded w-12 mb-2" style={{ background: "#6366f1" }} />
                <div className="h-4 rounded w-3/4 mb-1.5" style={{ background: "#fff", opacity: 0.9 }} />
                <div className="h-4 rounded w-2/3 mb-3" style={{ background: "#fff", opacity: 0.9 }} />
                <div className="space-y-1 w-full">
                  <div className="h-1.5 rounded w-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                  <div className="h-1.5 rounded w-4/5" style={{ background: "rgba(255,255,255,0.3)" }} />
                </div>
              </div>
            </div>
          )}
          {activeTab === "calendar" && (
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg p-2"
                  style={{
                    background: i === 7 ? "rgba(129,140,248,0.15)" : "var(--bg-primary)",
                    border: i === 7 ? "1px solid rgba(129,140,248,0.3)" : "1px solid var(--border)",
                  }}
                >
                  <div className="text-[9px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>{10 + i}</div>
                  {i % 3 === 0 && <div className="h-1 rounded w-full" style={{ background: "var(--accent)", opacity: 0.4 }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    stepTimerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3500);
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100dvh" }}>
      <style>{`
        @keyframes meshShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes stepPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .step-dot-active { animation: stepPulse 1.5s ease-in-out infinite; }
        .pricing-card:hover { transform: translateY(-4px); }
        .editor-float { animation: float 6s ease-in-out infinite; }
      `}</style>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
        style={{ height: 64, background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Link2Post" className="h-7 w-auto" />
          <span className="text-sm font-semibold hidden sm:inline" style={{ color: "var(--text-primary)" }}>
            Link2Post
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-xs hidden sm:inline" style={{ color: "var(--text-secondary)" }}>
            Features
          </a>
          <a href="#pricing" className="text-xs hidden sm:inline" style={{ color: "var(--text-secondary)" }}>
            Pricing
          </a>
          <ThemeToggle />
          <Link href="/login" className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Login
          </Link>
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
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-16 overflow-hidden" style={{ minHeight: "92vh" }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129,140,248,0.18), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(129,140,248,0.08), transparent), radial-gradient(ellipse 60% 40% at 20% 60%, rgba(16,185,129,0.06), transparent)",
            animation: "meshShift 12s ease-in-out infinite",
            backgroundSize: "200% 200%",
          }}
        />
        <div className="relative max-w-4xl">
          <RevealBlock>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-[11px] font-medium" style={{ background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", color: "var(--accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              Now with AI Carousel Builder
            </div>
          </RevealBlock>
          <RevealBlock>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Paste Once. Build a Month of{" "}
              <span style={{ color: "var(--accent)" }}>LinkedIn Authority.</span>
            </h1>
          </RevealBlock>
          <RevealBlock delay={0.1}>
            <p className="mt-6 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              The AI ghostwriter that turns your podcasts, meetings, and notes into high-performing LinkedIn content — posts, articles, carousels, and visual strategies. All in your voice.
            </p>
          </RevealBlock>
          <RevealBlock delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="text-sm font-semibold px-7 py-3.5 rounded-xl transition-all hover:opacity-90"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Start Building Authority — Free
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

          {/* Stats */}
          <RevealBlock delay={0.3}>
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{stat.value}</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* Editor Preview */}
      <section className="px-6 py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto editor-float">
          <RevealBlock>
            <EditorMockup />
          </RevealBlock>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="px-6 py-24">
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
                  onClick={() => {
                    setActiveStep(i);
                    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
                  }}
                  className="w-full text-left rounded-2xl p-6 transition-all cursor-pointer"
                  style={{
                    background: activeStep === i ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                    border: `1px solid ${activeStep === i ? "var(--accent)" : "var(--border)"}`,
                    boxShadow: activeStep === i ? "0 0 0 1px rgba(129,140,248,0.15)" : "none",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                      style={{
                        background: activeStep === i ? "var(--accent)" : "var(--bg-hover)",
                        color: activeStep === i ? "#fff" : "var(--text-muted)",
                      }}
                    >
                      {step.num}
                    </span>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {step.desc}
                  </p>
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
      <section id="features" className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
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
                  className="rounded-2xl p-6 h-full transition-all hover:translate-y-[-2px]"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(129,140,248,0.1)", color: "var(--accent)" }}>
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.desc}
                  </p>
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <RevealBlock>
            <div className="rounded-2xl p-8 sm:p-12" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
              </svg>
              <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
                &ldquo;I used to spend 4 hours every week writing LinkedIn posts. Now I paste my podcast transcript, and in 30 seconds I have a full week of content — written exactly like me.&rdquo;
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full" style={{ background: "var(--accent)", opacity: 0.2 }} />
                <div className="text-left">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Beta User</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>SaaS Founder</p>
                </div>
              </div>
            </div>
          </RevealBlock>
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
                    <span className="text-[10px] font-semibold uppercase tracking-wider mb-3 inline-block" style={{ color: "var(--accent)" }}>
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-5">
                    <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {plan.price}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {plan.period}
                    </span>
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
                    href={plan.link}
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

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Build LinkedIn Authority?</h2>
            <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
              Join creators who turn transcripts into weeks of high-performing content. Free to start, no credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-block text-sm font-semibold px-8 py-3.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Get Started Free
            </Link>
          </RevealBlock>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Link2Post" className="h-5 w-auto" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              &copy; {new Date().getFullYear()} Link2Post. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Features
            </a>
            <a href="#pricing" className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Pricing
            </a>
            <Link href="/login" className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Login
            </Link>
            <Link href="/signup" className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
