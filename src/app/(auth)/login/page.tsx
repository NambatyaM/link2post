"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      router.push("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 animate-float"
          style={{ background: "#818CF8", top: "-20%", right: "-10%" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 animate-float-delayed"
          style={{ background: "#A855F7", bottom: "-15%", left: "-5%" }} />
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="fixed top-5 left-5 flex items-center gap-2 text-sm transition-colors z-10"
        style={{ color: "var(--text-muted)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Home
      </Link>

      {/* Left side - decorative (desktop only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative">
        <motion.div
          className="max-w-md text-center relative z-10"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: "var(--accent-muted)", border: "1px solid var(--border-accent)" }}>
            <img src="/logo.png" alt="" className="w-10 h-10 rounded-lg" />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Welcome back to Link2Post</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Pick up right where you left off. Your content calendars, projects, and AI insights are waiting.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Secure login
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Your data, your voice
            </span>
          </div>
        </motion.div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="text-center mb-8">
            <motion.img
              src="/logo.png"
              alt="Link2Post"
              className="w-12 h-12 rounded-2xl mx-auto mb-4 object-cover lg:hidden"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Sign in to access your content calendars
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="sr-only" htmlFor="login-email">Email address</label>
            <motion.input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="Email address"
              required
              autoComplete="email"
              className="w-full text-sm px-4 py-3.5 rounded-xl"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-glow)" }}
            />
            <label className="sr-only" htmlFor="login-password">Password</label>
            <motion.input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full text-sm px-4 py-3.5 rounded-xl"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              whileFocus={{ borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-glow)" }}
            />

            {error && (
              <motion.p
                className="text-xs px-1"
                style={{ color: "var(--error)" }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full text-sm font-semibold py-3.5 rounded-xl disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
              whileHover={{ scale: 1.01, boxShadow: "0 4px 20px rgba(129,140,248,0.3)" }}
              whileTap={{ scale: 0.99 }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </motion.button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline transition-colors hover:text-[var(--accent)]" style={{ color: "var(--accent)" }}>
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
