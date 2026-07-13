import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center max-w-sm px-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--accent)" }}
        >
          <span className="text-xl font-bold" style={{ color: "white" }}>
            404
          </span>
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Page not found
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--text-muted)" }}
        >
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
