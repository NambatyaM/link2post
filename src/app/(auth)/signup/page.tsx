"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setConfirmationSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const backLink = (
    <Link
      href="/"
      className="fixed top-5 left-5 flex items-center gap-2 text-sm transition-colors"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Home
    </Link>
  );

  if (confirmationSent) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center px-6"
        style={{ background: "var(--bg-primary)" }}
      >
        {backLink}
        <div className="w-full max-w-sm text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Check your email
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            We sent a confirmation link to{" "}
            <strong style={{ color: "var(--text-primary)" }}>{email}</strong>. Click it to activate your
            account, then sign in.
          </p>
          <Link
            href="/login"
            className="text-sm underline"
            style={{ color: "var(--accent)" }}
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-6"
      style={{ background: "var(--bg-primary)" }}
    >
      {backLink}
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Link2Post"
            className="w-12 h-12 rounded-2xl mx-auto mb-4 object-cover"
          />
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Create your account
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Start building your LinkedIn authority today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            autoComplete="email"
            className="w-full text-sm px-4 py-3 rounded-xl outline-none"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password (min 6 chars)"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full text-sm px-4 py-3 rounded-xl outline-none"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />

          {error && (
            <p className="text-xs px-1" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="underline" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
