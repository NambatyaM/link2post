"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), { ssr: false });

const COMPARISON = [
  { without: "Write posts manually", with: "AI writes in your voice" },
  { without: "Design carousels in Canva", with: "AI designs carousel slides" },
  { without: "Guess your posting schedule", with: "AI builds a content calendar" },
  { without: "Research hooks and angles", with: "AI generates optimized hooks" },
  { without: "Copy-paste into docs", with: "Everything in one workspace" },
  { without: "No performance feedback", with: "AI Growth Coach scores every post" },
];

const WHAT_GETS_GENERATED = [
  "12 LinkedIn Posts",
  "5 Carousel PDFs",
  "2 Long Articles",
  "Poll Ideas",
  "Comment Ideas",
  "Content Calendar",
  "Viral Hooks",
  "CTAs & Endings",
  "Image Prompts",
  "Carousel Designs",
  "AI Growth Report",
  "Brand Voice Profile",
];

const CAROUSEL_STEPS = [
  { label: "Theme", icon: "🎨" },
  { label: "Edit", icon: "✏️" },
  { label: "Live Preview", icon: "👁️" },
  { label: "Export PDF", icon: "📄" },
];

const CAROUSEL_FEATURES = [
  "20+ professionally designed themes",
  "Auto-layout generation",
  "AI chooses the best layout for your content",
  "Brand colors & font pairs",
  "Icons & illustrations",
  "Export PDF ready for LinkedIn",
];

const ROADMAP = [
  { label: "AI comment assistant", status: "next" },
  { label: "Team workspaces", status: "planned" },
  { label: "Personal brand analytics", status: "planned" },
  { label: "Trend detection", status: "planned" },
  { label: "Multi-language support", status: "planned" },
  { label: "Brand kits", status: "planned" },
  { label: "Custom templates", status: "planned" },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 project",
      "1 transcript per month",
      "Up to 12 generated posts",
      "1 carousel",
      "Basic calendar",
    ],
    cta: "Start Free",
    highlighted: false,
    link: "/signup",
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    features: [
      "20 projects",
      "Unlimited transcripts",
      "Unlimited post edits",
      "Unlimited carousel exports",
      "Brand Voice Memory",
      "AI Growth Coach",
      "Analytics dashboard",
      "Priority generation",
    ],
    cta: "Coming Soon",
    highlighted: true,
    link: "/beta",
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    features: [
      "Unlimited projects",
      "Unlimited transcripts",
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

const WORKFLOW_STEPS = [
  { label: "Transcript", sub: "Paste any content", color: "#6366f1" },
  { label: "Voice Analysis", sub: "AI learns your style", color: "#8b5cf6" },
  { label: "12 LinkedIn Posts", sub: "Optimized for engagement", color: "#a855f7" },
  { label: "5 Carousel Designs", sub: "Professionally themed", color: "#d946ef" },
  { label: "2 Articles", sub: "Long-form thought leadership", color: "#ec4899" },
  { label: "Monthly Calendar", sub: "Best times mapped", color: "#f43f5e" },
  { label: "Growth Analytics", sub: "AI-powered insights", color: "#ef4444" },
];

const GROWTH_SCORES = [
  { label: "Hook Score", value: "95", max: "100", color: "var(--success)" },
  { label: "Virality", value: "91", unit: "%", color: "var(--accent)" },
  { label: "Save Potential", value: "★★★★★", color: "#eab308" },
  { label: "Comment Potential", value: "★★★★☆", color: "#eab308" },
  { label: "Best Time", value: "Tue 9AM", color: "var(--accent)" },
];

const DASHBOARD_STATS = [
  { label: "Brand Voice", value: "96%", sub: "consistency" },
  { label: "Posts Generated", value: "28", sub: "this month" },
  { label: "Carousels Designed", value: "6", sub: "exported" },
  { label: "Calendar", value: "4 wks", sub: "fully filled" },
  { label: "AI Quality Score", value: "94/100", sub: "average" },
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

function WorkflowPipeline() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx((p) => (p + 1) % WORKFLOW_STEPS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      {/* Vertical pipeline */}
      <div className="flex flex-col items-center gap-0">
        {WORKFLOW_STEPS.map((step, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <div key={step.label} className="flex flex-col items-center">
              <div
                className="flex items-center gap-3 rounded-xl px-5 py-3 transition-all duration-500"
                style={{
                  background: isActive ? `${step.color}20` : isPast ? `${step.color}08` : "var(--bg-secondary)",
                  border: `1px solid ${isActive ? step.color : isPast ? `${step.color}30` : "var(--border)"}`,
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                  opacity: isPast || isActive ? 1 : 0.5,
                  minWidth: 260,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{
                    background: isActive ? step.color : isPast ? `${step.color}30` : "var(--bg-tertiary)",
                    color: isActive ? "#fff" : isPast ? step.color : "var(--text-muted)",
                  }}
                >
                  {isPast ? "✓" : i + 1}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {step.label}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{step.sub}</p>
                </div>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div
                  className="w-px h-3 transition-colors duration-500"
                  style={{ background: i < activeIdx ? WORKFLOW_STEPS[i + 1].color : "var(--border)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrowthDashboardMockup() {
  return (
    <div
      className="rounded-xl overflow-hidden text-left"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="text-[10px] px-3 py-1 rounded-md" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
            link2post.app/dashboard
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats row */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {DASHBOARD_STATS.map((stat) => (
            <div key={stat.label} className="rounded-lg p-2.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <p className="text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
              <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>{stat.value}</p>
              <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        <div className="rounded-lg p-3 mb-4" style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>AI RECOMMENDATION</span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            &ldquo;Add one founder story this Thursday to improve content balance. Your educational posts outperform personal ones by 2.3x — mix in more narrative.&rdquo;
          </p>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-5 gap-2">
          {GROWTH_SCORES.map((s) => (
            <div key={s.label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <p className="text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-base font-bold" style={{ color: s.color }}>{s.value}{s.unit || ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100dvh" }}>
      <style>{`
        @keyframes meshShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .pricing-card:hover { transform: translateY(-4px); }
        .editor-float { animation: float 6s ease-in-out infinite; }
      `}</style>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
        style={{ height: 64, background: "var(--nav-bg)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Link2Post" className="h-7 w-auto" />
          <span className="text-sm font-semibold hidden sm:inline" style={{ color: "var(--text-primary)" }}>Link2Post</span>
        </Link>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-xs hidden sm:inline" style={{ color: "var(--text-secondary)" }}>Features</a>
          <a href="#pricing" className="text-xs hidden sm:inline" style={{ color: "var(--text-secondary)" }}>Pricing</a>
          <ThemeToggle />
          <Link href="/login" className="text-xs" style={{ color: "var(--text-secondary)" }}>Login</Link>
          <Link href="/signup" className="text-xs font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "#fff" }}>Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 overflow-hidden" style={{ minHeight: "95vh" }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129,140,248,0.18), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(129,140,248,0.08), transparent)", animation: "meshShift 12s ease-in-out infinite", backgroundSize: "200% 200%" }} />
        <div className="relative max-w-4xl">
          <RevealBlock>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-[11px] font-medium" style={{ background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)", color: "var(--accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              The AI LinkedIn Growth OS
            </div>
          </RevealBlock>
          <RevealBlock>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>
              Turn One Transcript Into<br />
              <span style={{ color: "var(--accent)" }}>30 Days of LinkedIn Growth</span>
            </h1>
          </RevealBlock>
          <RevealBlock delay={0.1}>
            <p className="mt-6 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Link2Post analyzes your transcript, learns your voice, writes high-performing LinkedIn posts, designs professional carousel PDFs, builds a personalized content calendar, and coaches you to grow your audience — all in minutes.
            </p>
          </RevealBlock>
          <RevealBlock delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="text-sm font-semibold px-8 py-3.5 rounded-xl transition-all hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
                Generate My First Month Free
              </Link>
              <a href="#demo" className="text-sm px-7 py-3.5 rounded-xl transition-all flex items-center gap-2" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Watch 60-second Demo
              </a>
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* Workflow Pipeline */}
      <section id="demo" className="px-6 py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">One Transcript. A Complete Content System.</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              No prompt engineering. No context windows. Just paste and go.
            </p>
          </RevealBlock>
          <div className="flex justify-center">
            <RevealBlock>
              <WorkflowPipeline />
            </RevealBlock>
          </div>
        </div>
      </section>

      {/* Growth Dashboard */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">AI Growth Dashboard</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Not just an AI writer — a full LinkedIn growth platform that tracks, scores, and coaches you to better content.
            </p>
          </RevealBlock>
          <div className="editor-float">
            <RevealBlock>
              <GrowthDashboardMockup />
            </RevealBlock>
          </div>
        </div>
      </section>

      {/* Why Link2Post */}
      <section id="features" className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Why Link2Post?</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Stop juggling 5 tools. Link2Post replaces your entire LinkedIn content workflow.
            </p>
          </RevealBlock>
          <RevealBlock>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {/* Header */}
              <div className="grid grid-cols-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>
                  Without Link2Post
                </div>
                <div className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  With Link2Post
                </div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2"
                  style={{ borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="px-6 py-4 flex items-center gap-3" style={{ borderRight: "1px solid var(--border)" }}>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>✗</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.without}</span>
                  </div>
                  <div className="px-6 py-4 flex items-center gap-3" style={{ background: "rgba(129,140,248,0.04)" }}>
                    <span className="text-xs" style={{ color: "var(--success)" }}>✓</span>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{row.with}</span>
                  </div>
                </div>
              ))}
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* Carousel Builder */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">The First AI Carousel Builder Designed for LinkedIn</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              No Canva needed. AI generates professional carousel slides from your content — you just pick a theme and export.
            </p>
          </RevealBlock>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Steps */}
            <RevealBlock>
              <div className="flex flex-col gap-3">
                {CAROUSEL_STEPS.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4 rounded-xl p-4 transition-all" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: "rgba(129,140,248,0.1)" }}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{step.label}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(129,140,248,0.1)", color: "var(--accent)" }}>
                      Step {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </RevealBlock>

            {/* Features list */}
            <RevealBlock delay={0.15}>
              <div className="space-y-4">
                {CAROUSEL_FEATURES.map((feat) => (
                  <div key={feat} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(34,197,94,0.15)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{feat}</span>
                  </div>
                ))}
              </div>
            </RevealBlock>
          </div>
        </div>
      </section>

      {/* AI Growth Coach */}
      <section className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">More Than an AI Writer</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Every post receives an AI performance review before you publish. Know exactly how your content will perform.
            </p>
          </RevealBlock>

          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {GROWTH_SCORES.map((score, i) => (
              <RevealBlock key={score.label} delay={i * 0.08}>
                <div
                  className="rounded-2xl p-5 text-center"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{score.label}</p>
                  <p className="text-2xl font-bold" style={{ color: score.color }}>{score.value}{score.unit || ""}</p>
                  {score.max && (
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(parseInt(score.value) / parseInt(score.max)) * 100}%`, background: score.color }} />
                    </div>
                  )}
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* What Gets Generated */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">What Gets Generated?</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              One transcript produces a complete LinkedIn content system. Here&apos;s everything you get.
            </p>
          </RevealBlock>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {WHAT_GETS_GENERATED.map((item, i) => (
              <RevealBlock key={item} delay={i * 0.04}>
                <div
                  className="rounded-xl px-4 py-3.5 flex items-center gap-2.5"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item}</span>
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <RevealBlock>
            <div className="rounded-2xl p-8 sm:p-12" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
              </svg>
              <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
                &ldquo;I used to spend 4 hours every week writing LinkedIn posts. Now I paste my podcast transcript, and in 30 seconds I have a full month of content — posts, carousels, articles — all written exactly like me.&rdquo;
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
      <section id="pricing" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Simple Pricing</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Start free, upgrade when you&apos;re ready to scale your LinkedIn presence.
            </p>
          </RevealBlock>
          <div className="grid sm:grid-cols-3 gap-5 items-stretch">
            {PRICING.map((plan, i) => (
              <RevealBlock key={plan.name} delay={i * 0.1}>
                <div
                  className="pricing-card rounded-2xl p-6 flex flex-col h-full transition-all duration-200"
                  style={{
                    background: "var(--bg-secondary)",
                    border: plan.highlighted ? "2px solid var(--accent)" : "1px solid var(--border)",
                  }}
                >
                  {plan.highlighted && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider mb-3 inline-block" style={{ color: "var(--accent)" }}>Most Popular</span>
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

      {/* Roadmap */}
      <section className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">What&apos;s Coming Next</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              We&apos;re building the most complete LinkedIn growth platform. Here&apos;s what&apos;s on the roadmap.
            </p>
          </RevealBlock>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROADMAP.map((item, i) => (
              <RevealBlock key={item.label} delay={i * 0.05}>
                <div
                  className="flex items-center gap-3 rounded-xl px-5 py-3.5"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: item.status === "next" ? "var(--accent)" : "var(--text-muted)" }}
                  />
                  <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: item.status === "next" ? "rgba(129,140,248,0.1)" : "var(--bg-tertiary)",
                      color: item.status === "next" ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {item.status === "next" ? "Coming Next" : "Planned"}
                  </span>
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Your Next Month of LinkedIn Content Is Already in Your Transcript</h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Stop staring at a blank page. Paste one transcript and leave with a complete LinkedIn content system — posts, carousel PDFs, articles, a content calendar, and an AI growth plan tailored to your voice.
            </p>
            <Link
              href="/signup"
              className="inline-block text-sm font-semibold px-8 py-3.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Start Free — No Credit Card Required
            </Link>
          </RevealBlock>
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
