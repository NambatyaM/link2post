"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center max-w-sm px-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "#ef4444" }}
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
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Something went wrong
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
