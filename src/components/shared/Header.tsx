"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumbs: Breadcrumb[];
  onSearch?: () => void;
}

export default function Header({ breadcrumbs, onSearch }: HeaderProps) {
  const router = useRouter();

  return (
    <header
      className="flex items-center justify-between shrink-0"
      style={{
        height: 56,
        background: "transparent",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
      }}
    >
      <nav className="flex items-center gap-1.5 min-w-0">
        <motion.button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 32, height: 32, color: "var(--text-muted)", background: "transparent" }}
          whileHover={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          whileTap={{ scale: 0.92 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </motion.button>
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="text-sm truncate transition-colors hover:text-[var(--text-primary)]" style={{ color: "var(--text-muted)" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-sm font-medium truncate" style={{ color: isLast ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        <motion.button
          onClick={onSearch}
          className="flex items-center gap-2 rounded-lg"
          style={{ padding: "6px 12px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: 13 }}
          whileHover={{ borderColor: "var(--text-muted)" }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search...</span>
          <kbd
            className="text-[10px] font-medium rounded px-1.5 py-0.5"
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-muted)", marginLeft: 8 }}
          >
            {"\u2318"}K
          </kbd>
        </motion.button>
      </div>
    </header>
  );
}
