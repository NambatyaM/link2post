"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Step = "auth" | "feedback" | "success";

export default function AuthScreen({ onAuth, onDismiss }: { onAuth: () => void; onDismiss?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("auth");

  const [hearAbout, setHearAbout] = useState("");
  const [improvement, setImprovement] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowser();

    if (isSignUp) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (signUpData.session) {
        onAuth();
        return;
      }
      if (signUpData.user) {
        const referrerCode = localStorage.getItem("link2post_ref") || null;
        const deviceId = localStorage.getItem("link2post_device_id") || null;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          fetch("/api/auth/signup-event", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              source: referrerCode ? "referral" : "direct",
              referrerCode,
              deviceId,
            }),
          }).catch(() => {});
        }
      }
      setStep("feedback");
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

  const handleFeedbackSubmit = async () => {
    setFeedbackLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/auth/signup-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ hearAbout, improvement }),
        });
      }
      setFeedbackSaved(true);
    } catch {
      // silently fail - feedback is non-critical
    }
    setFeedbackLoading(false);
    setStep("success");
  };

  const handleSkipFeedback = () => {
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-sm px-6 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--accent)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Check your email</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <button
            onClick={() => { setStep("auth"); setIsSignUp(false); setError(null); }}
            className="text-sm underline"
            style={{ color: "var(--accent)" }}
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  if (step === "feedback") {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-sm px-6">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent)", opacity: 0.9 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Quick question
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Help us build a better tool (takes 10 seconds)
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Where did you hear about us?
              </label>
              <input
                type="text"
                value={hearAbout}
                onChange={(e) => setHearAbout(e.target.value)}
                placeholder="e.g. Twitter, YouTube, friend, Google..."
                maxLength={500}
                className="w-full text-sm px-4 py-2.5 rounded-xl outline-none"
                style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                How can we improve the tool?
              </label>
              <textarea
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                placeholder="Any suggestions, feature requests, or pain points..."
                maxLength={500}
                rows={3}
                className="w-full text-sm px-4 py-2.5 rounded-xl outline-none resize-none"
                style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
              <p className="text-[10px] mt-1 text-right" style={{ color: "var(--text-muted)" }}>
                {improvement.length}/500
              </p>
            </div>

            <button
              onClick={handleFeedbackSubmit}
              disabled={feedbackLoading}
              className="w-full text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {feedbackLoading ? "Saving..." : feedbackSaved ? "Saved!" : "Submit & continue"}
            </button>

            <button
              onClick={handleSkipFeedback}
              className="w-full text-xs py-2 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isSignUp ? "Sign up to keep your content calendars" : "Sign in to access your calendars"}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
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

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full text-xs mt-4 py-2 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}
