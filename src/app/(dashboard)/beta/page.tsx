"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BetaPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(129,140,248,0.12)" }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <span
          className="inline-block text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(129,140,248,0.12)", color: "var(--accent)" }}
        >
          Beta
        </span>

        <h1
          className="text-xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Paid Plans Coming Soon
        </h1>

        <p
          className="text-sm mb-6 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Link2Post is currently in beta. All features are free to use while we
          refine the product. Paid plans with advanced features will be available
          soon.
        </p>

        <div
          className="rounded-lg p-4 mb-6 text-left"
          style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
        >
          <p
            className="text-xs font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            What you get during beta:
          </p>
          <ul className="space-y-1.5">
            {[
              "Unlimited projects",
              "Full AI content generation",
              "Brand voice profiling",
              "All export formats (PDF, Word, Excel, ZIP)",
              "Content calendar & analytics",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span style={{ color: "var(--success)" }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Go Back
          </button>
          <Link
            href="/"
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all text-center"
            style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
