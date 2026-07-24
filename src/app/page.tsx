"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useInView, useSpring, useMotionValue } from "framer-motion";

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
  { label: "12 LinkedIn Posts", tier: "free" as const },
  { label: "Carousel PDFs", tier: "starter" as const },
  { label: "2 Long Articles", tier: "free" as const },
  { label: "Poll Ideas", tier: "free" as const },
  { label: "Comment Ideas", tier: "free" as const },
  { label: "Content Calendar", tier: "free" as const },
  { label: "Viral Hooks", tier: "free" as const },
  { label: "CTAs & Endings", tier: "free" as const },
  { label: "Image Prompts", tier: "free" as const },
  { label: "Carousel Designs", tier: "starter" as const },
  { label: "AI Growth Report", tier: "starter" as const },
  { label: "Brand Voice Profile", tier: "starter" as const },
];

const CAROUSEL_STEPS = [
  { label: "Theme", icon: "\u{1F3A8}" },
  { label: "Edit", icon: "\u{270F}\u{FE0F}" },
  { label: "Live Preview", icon: "\u{1F441}\u{FE0F}" },
  { label: "Export PDF", icon: "\u{1F4C4}" },
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
    features: ["1 project per month", "Up to 5 generated posts", "Basic carousel generator", "TXT export"],
    cta: "Start Free",
    highlighted: false,
    link: "/signup",
  },
  {
    name: "Starter",
    price: "$19",
    period: "/month",
    features: ["10 projects per month", "50 posts per month", "Brand voice profiling", "Full carousel editor + PDF export", "All export formats", "Priority generation"],
    cta: "Coming Soon",
    highlighted: true,
    link: "/pricing",
    comingSoon: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    features: ["Unlimited projects", "Unlimited posts", "Advanced analytics", "Multi-voice profiles", "API access", "Team collaboration"],
    cta: "Coming Soon",
    highlighted: false,
    link: "/pricing",
    comingSoon: true,
  },
];

const WORKFLOW_STEPS = [
  { label: "Transcript", sub: "Paste any content", color: "#6366f1" },
  { label: "Voice Analysis", sub: "AI learns your style", color: "#8b5cf6" },
  { label: "5 LinkedIn Posts", sub: "Optimized for engagement", color: "#a855f7" },
  { label: "Carousel Design", sub: "Professionally themed", color: "#d946ef" },
  { label: "2 Articles", sub: "Long-form thought leadership", color: "#ec4899" },
  { label: "Monthly Calendar", sub: "Best times mapped", color: "#f43f5e" },
  { label: "Growth Analytics", sub: "AI-powered insights", color: "#ef4444" },
];

const GROWTH_SCORES = [
  { label: "Hook Score", value: "95", max: "100", color: "var(--success)" },
  { label: "Virality", value: "91", unit: "%", color: "var(--accent)" },
  { label: "Save Potential", value: "\u2605\u2605\u2605\u2605\u2605", color: "#eab308" },
  { label: "Comment Potential", value: "\u2605\u2605\u2605\u2605\u2606", color: "#eab308" },
  { label: "Best Time", value: "Tue 9AM", color: "var(--accent)" },
];

const DASHBOARD_STATS = [
  { label: "Brand Voice", value: "96%", sub: "consistency" },
  { label: "Content Generated", value: "28", sub: "this month" },
  { label: "Carousels Designed", value: "6", sub: "exported" },
  { label: "Calendar", value: "4 wks", sub: "fully filled" },
  { label: "AI Quality Score", value: "94/100", sub: "average" },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return { ref, visible: isInView };
}

function RevealBlock({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94], delay }}
    >
      {children}
    </motion.div>
  );
}

function MagneticButton({ children, className = "", href, style }: { children: React.ReactNode; className?: string; href?: string; style?: React.CSSProperties }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div style={{ x: springX, y: springY }} className="inline-block">
      <Link
        href={href || "/"}
        className={className}
        style={style}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Link>
    </motion.div>
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
      <div className="flex flex-col items-center gap-0">
        {WORKFLOW_STEPS.map((step, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <div key={step.label} className="flex flex-col items-center">
              <motion.div
                className="flex items-center gap-3 rounded-xl px-5 py-3"
                animate={{
                  scale: isActive ? 1.04 : 1,
                  opacity: isPast || isActive ? 1 : 0.4,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  background: isActive ? `${step.color}20` : isPast ? `${step.color}08` : "var(--bg-secondary)",
                  border: `1px solid ${isActive ? step.color : isPast ? `${step.color}30` : "var(--border)"}`,
                  minWidth: 260,
                }}
              >
                <motion.div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                  animate={{
                    background: isActive ? step.color : isPast ? `${step.color}30` : "var(--bg-tertiary)",
                    color: isActive ? "#fff" : isPast ? step.color : "var(--text-muted)",
                  }}
                >
                  {isPast ? "\u2713" : i + 1}
                </motion.div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {step.label}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{step.sub}</p>
                </div>
              </motion.div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <motion.div
                  className="w-px h-3"
                  animate={{ background: i < activeIdx ? WORKFLOW_STEPS[i + 1].color : "var(--border)" }}
                  transition={{ duration: 0.5 }}
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
      className="rounded-2xl overflow-hidden text-left noise-overlay"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 64px rgba(129,140,248,0.06)" }}
    >
      <div className="flex items-center gap-2 px-4 py-3 relative z-10" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="text-[10px] px-4 py-1 rounded-full" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            link2post.app/dashboard
          </div>
        </div>
      </div>

      <div className="p-5 relative z-10">
        <div className="grid grid-cols-5 gap-2.5 mb-5">
          {DASHBOARD_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="rounded-xl p-3"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
            >
              <p className="text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
              <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>{stat.value}</p>
              <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="rounded-xl p-4 mb-5"
          style={{ background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.12)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider" style={{ color: "var(--accent)" }}>AI RECOMMENDATION</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            &ldquo;Add one founder story this Thursday to improve content balance. Your educational posts outperform personal ones by 2.3x &mdash; mix in more narrative.&rdquo;
          </p>
        </motion.div>

        <div className="grid grid-cols-5 gap-2.5">
          {GROWTH_SCORES.map((s, i) => (
            <motion.div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.06, duration: 0.35 }}
            >
              <p className="text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-base font-bold" style={{ color: s.color }}>{s.value}{s.unit || ""}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 animate-float"
        style={{ background: "#818CF8", top: "-15%", left: "15%" }} />
      <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 animate-float-delayed"
        style={{ background: "#A855F7", bottom: "5%", right: "10%" }} />
      <div className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-10"
        style={{ background: "#EC4899", top: "40%", right: "30%", animation: "float 8s ease-in-out infinite 1s" }} />
    </div>
  );
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll();

  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100dvh" }}>
      {/* Scroll Progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
        style={{ scaleX: scrollYProgress, background: "linear-gradient(90deg, #818CF8, #A855F7, #EC4899)" }}
      />

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 glass"
        style={{ height: 64, borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Link2Post" className="h-7 w-auto" />
          <span className="text-sm font-semibold hidden sm:inline" style={{ color: "var(--text-primary)" }}>Link2Post</span>
        </Link>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-xs hidden sm:inline transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>Features</a>
          <a href="#pricing" className="text-xs hidden sm:inline transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>Pricing</a>
          <ThemeToggle />
          <Link href="/login" className="text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>Login</Link>
          <MagneticButton href="/signup" className="text-xs font-semibold px-5 py-2.5 rounded-xl" style={{ background: "var(--accent)", color: "#fff" }}>
            Start Free
          </MagneticButton>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 overflow-hidden noise-overlay" style={{ minHeight: "95vh" }}>
        <HeroOrbs />

        <div className="relative max-w-4xl z-10">
          <RevealBlock>
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[11px] font-medium"
              style={{ background: "var(--accent-muted)", border: "1px solid var(--border-accent)", color: "var(--accent)" }}
              whileHover={{ scale: 1.03 }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
              Your Content Already Exists
            </motion.div>
          </RevealBlock>

          <RevealBlock>
            <h1 className="text-4xl sm:text-5xl md:text-[3.75rem] font-bold leading-[1.1] tracking-tight" style={{ color: "var(--text-primary)" }}>
              Turn One Transcript Into<br />
              <span className="animate-gradient-text">30 Days of LinkedIn Growth</span>
            </h1>
          </RevealBlock>

          <RevealBlock delay={0.1}>
            <p className="mt-7 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Link2Post analyzes your transcript, learns your voice, writes high-performing LinkedIn posts, designs professional carousel PDFs, builds a personalized content calendar, and coaches you to grow your audience &mdash; all in minutes.
            </p>
          </RevealBlock>

          <RevealBlock delay={0.2}>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton href="/signup" className="text-sm font-semibold px-10 py-4 rounded-2xl" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 4px 24px rgba(129,140,248,0.3)" }}>
                Generate My First Month Free
              </MagneticButton>
              <MagneticButton href="#demo" className="text-sm font-medium px-8 py-4 rounded-2xl flex items-center gap-2" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "var(--bg-secondary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Watch 60-second Demo
              </MagneticButton>
            </div>
          </RevealBlock>

          <RevealBlock delay={0.3}>
            <div className="mt-8 flex items-center justify-center gap-6 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Free forever plan
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Setup in 2 minutes
              </span>
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* Problem-Agitate Section */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 leading-snug">You already have great content. You just don&apos;t have time to turn it into LinkedIn posts.</h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
              Every week, you spend 4+ hours writing posts, researching hooks, designing carousels, and scheduling at the right times. And you still wonder if your content will perform.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Meanwhile, the creators who grow fastest aren&apos;t writing more &mdash; they&apos;re repurposing smarter.
            </p>
          </RevealBlock>
        </div>
      </section>

      {/* Workflow Pipeline */}
      <section id="demo" className="px-6 py-24" style={{ background: "var(--bg-secondary)" }}>
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
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">AI Growth Dashboard</h2>
            <p className="text-center text-sm mb-14 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Not just an AI writer &mdash; a full LinkedIn growth platform that tracks, scores, and coaches you to better content.
            </p>
          </RevealBlock>
          <div className="animate-float">
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
            <div className="rounded-2xl overflow-hidden glow-on-hover" style={{ border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>
                  Without Link2Post
                </div>
                <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  With Link2Post
                </div>
              </div>
              {COMPARISON.map((row, i) => (
                <motion.div
                  key={i}
                  className="grid grid-cols-2"
                  style={{ borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--border)" : "none" }}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  <div className="px-6 py-4 flex items-center gap-3" style={{ borderRight: "1px solid var(--border)" }}>
                    <span className="text-sm" style={{ color: "var(--error)" }}>{"\u2717"}</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.without}</span>
                  </div>
                  <div className="px-6 py-4 flex items-center gap-3" style={{ background: "var(--accent-muted)" }}>
                    <span className="text-xs" style={{ color: "var(--success)" }}>{"\u2713"}</span>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{row.with}</span>
                  </div>
                </motion.div>
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
              No Canva needed. AI generates professional carousel slides from your content &mdash; you just pick a theme and export.
            </p>
          </RevealBlock>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <RevealBlock>
              <div className="flex flex-col gap-3">
                {CAROUSEL_STEPS.map((step, i) => (
                  <motion.div
                    key={step.label}
                    className="flex items-center gap-4 rounded-xl p-4 glow-on-hover"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg" style={{ background: "var(--accent-muted)" }}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{step.label}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                      Step {i + 1}
                    </span>
                  </motion.div>
                ))}
              </div>
            </RevealBlock>

            <RevealBlock delay={0.15}>
              <div className="space-y-4">
                {CAROUSEL_FEATURES.map((feat, i) => (
                  <motion.div
                    key={feat}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(52,211,153,0.15)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{feat}</span>
                  </motion.div>
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
                <motion.div
                  className="rounded-2xl p-5 text-center glow-on-hover"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                  whileHover={{ y: -4 }}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{score.label}</p>
                  <p className="text-2xl font-bold" style={{ color: score.color }}>{score.value}{score.unit || ""}</p>
                  {score.max && (
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: score.color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(parseInt(score.value) / parseInt(score.max)) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </motion.div>
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
              <RevealBlock key={item.label} delay={i * 0.04}>
                <motion.div
                  className="rounded-xl px-4 py-3.5 flex items-center gap-2.5 glow-on-hover"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                  whileHover={{ y: -2, scale: 1.01 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                  {item.tier === "starter" && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                      PRO
                    </span>
                  )}
                </motion.div>
              </RevealBlock>
            ))}
          </div>
          <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
            Free plan includes 1 project, 5 posts, basic carousel, and TXT export.
            <br />
            <a href="#pricing" className="underline transition-colors hover:text-[var(--accent)]" style={{ color: "var(--accent)" }}>Upgrade to Starter</a> for full access, or{" "}
            <Link href="/beta" className="underline transition-colors hover:text-[var(--accent)]" style={{ color: "var(--accent)" }}>join the beta</Link> to get everything free.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <RevealBlock>
            <div className="rounded-2xl p-8 sm:p-12 gradient-border" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-40">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
              </svg>
              <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
                &ldquo;I went from spending 6 hours a week on LinkedIn content to 30 minutes. My engagement is up 340% and I&apos;ve booked 12 discovery calls from posts I didn&apos;t have time to write before.&rdquo;
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-full" style={{ background: "linear-gradient(135deg, var(--accent), var(--purple))", opacity: 0.8 }} />
                <div className="text-left">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Sarah Chen</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Founder, GrowthHack</p>
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
            <p className="text-center text-sm mb-6 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Start free, upgrade when you&apos;re ready to scale your LinkedIn presence.
            </p>
            <p className="text-center text-xs mb-14" style={{ color: "var(--text-muted)" }}>
              All paid features are <strong style={{ color: "var(--success)" }}>free during beta</strong> &mdash; join now and keep access when we launch.
            </p>
          </RevealBlock>
          <div className="grid sm:grid-cols-3 gap-5 items-stretch">
            {PRICING.map((plan, i) => (
              <RevealBlock key={plan.name} delay={i * 0.1}>
                <motion.div
                  className="rounded-2xl p-6 flex flex-col h-full noise-overlay"
                  style={{
                    background: "var(--bg-secondary)",
                    border: plan.highlighted ? "2px solid var(--accent)" : "1px solid var(--border)",
                    boxShadow: plan.highlighted ? "0 0 48px rgba(129,140,248,0.1)" : "none",
                  }}
                  whileHover={{ y: -6, boxShadow: plan.highlighted ? "0 0 64px rgba(129,140,248,0.15)" : "0 12px 40px rgba(0,0,0,0.3)" }}
                  transition={{ duration: 0.25 }}
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
                        <span style={{ color: "var(--success)" }}>{"\u2713"}</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.link}
                    className="block text-center text-xs font-semibold py-3 rounded-xl transition-all"
                    style={{
                      background: plan.highlighted ? "var(--accent)" : "transparent",
                      color: plan.highlighted ? "#fff" : "var(--text-secondary)",
                      border: plan.highlighted ? "none" : "1px solid var(--border)",
                      opacity: plan.comingSoon ? 0.7 : 1,
                    }}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              </RevealBlock>
            ))}
          </div>
          <RevealBlock delay={0.3}>
            <motion.div
              className="mt-8 rounded-2xl p-6 text-center noise-overlay gradient-border"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))", border: "1px solid var(--border-accent)" }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Want everything now, for free?
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Join the beta program. Get all Pro features unlocked during our beta period.
              </p>
              <MagneticButton href="/beta" className="inline-block px-6 py-2.5 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "white" }}>
                Get Full Access {"\u2192"}
              </MagneticButton>
            </motion.div>
          </RevealBlock>
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
                <motion.div
                  className="flex items-center gap-3 rounded-xl px-5 py-3.5 glow-on-hover"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                  whileHover={{ x: 4 }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: item.status === "next" ? "var(--accent)" : "var(--text-muted)" }}
                  />
                  <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: item.status === "next" ? "var(--accent-muted)" : "var(--bg-tertiary)",
                      color: item.status === "next" ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {item.status === "next" ? "Coming Next" : "Planned"}
                  </span>
                </motion.div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 relative overflow-hidden">
        <HeroOrbs />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <RevealBlock>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Your Next Month of LinkedIn Content Is Already in Your Transcript</h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Stop staring at a blank page. Paste one transcript and leave with a complete LinkedIn content system &mdash; posts, carousel PDFs, articles, a content calendar, and an AI growth plan tailored to your voice.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <MagneticButton href="/signup" className="inline-block text-sm font-semibold px-10 py-4 rounded-2xl" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 4px 24px rgba(129,140,248,0.3)" }}>
                Start Free &mdash; No Credit Card Required
              </MagneticButton>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Free to start. No credit card required. Early adopter pricing ends soon.
            </p>
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
            <a href="#features" className="text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>Features</a>
            <a href="#pricing" className="text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>Pricing</a>
            <Link href="/login" className="text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>Login</Link>
            <Link href="/signup" className="text-xs transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-secondary)" }}>Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
