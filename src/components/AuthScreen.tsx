"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowser();

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      setMagicSent(true);
      setLoading(false);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      onAuth();
    }
  };

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
    } else {
      setMagicSent(true);
    }
    setLoading(false);
  };

  if (magicSent) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-sm px-6 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--accent)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Check your email</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            We sent a {isSignUp ? "confirmation" : "magic"} link to <strong>{email}</strong>
          </p>
          <button
            onClick={() => { setMagicSent(false); setError(null); }}
            className="text-sm underline"
            style={{ color: "var(--accent)" }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Link2Post
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Sign in to save your content calendar
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full text-sm px-4 py-3 rounded-xl outline-none"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignUp ? "Create password (min 6 chars)" : "Password"}
            required
            minLength={isSignUp ? 6 : undefined}
            className="w-full text-sm px-4 py-3 rounded-xl outline-none"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />
          {error && (
            <p className="text-xs px-1" style={{ color: "#ef4444" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {loading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        <button
          onClick={handleMagicLink}
          disabled={!email || loading}
          className="w-full text-sm py-3 rounded-xl transition-colors disabled:opacity-30"
          style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          Send magic link
        </button>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
