"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activePath: string;
  userEmail?: string;
  plan?: string;
  onSignOut?: () => void;
}

const ALL_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { label: "Projects", href: "/projects", icon: FolderIcon },
  { label: "Calendar", href: "/calendar", icon: CalendarIcon },
  { label: "Analytics", href: "/analytics", icon: BarChartIcon, minPlan: "starter" },
  { label: "Pricing", href: "/pricing", icon: DollarIcon },
  { label: "Settings", href: "/settings", icon: GearIcon },
];

export default function Sidebar({
  collapsed,
  onToggle,
  activePath,
  userEmail,
  plan,
  onSignOut,
}: SidebarProps) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";
  const isActive = (href: string) =>
    activePath === href || activePath.startsWith(href + "/");

  const isPaid = plan === "starter" || plan === "pro";
  const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => {
    if (item.minPlan && !isPaid) return false;
    return true;
  });

  return (
    <motion.aside
      className="flex flex-col h-full shrink-0"
      animate={{ width: collapsed ? 56 : 240 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-center shrink-0"
        style={{
          height: 56,
          borderColor: "var(--border)",
          borderBottom: "1px solid var(--border)",
          padding: collapsed ? "0 14px" : "0 16px",
        }}
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              Link2Post
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="shrink-0 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--bg-hover)]"
          style={{
            width: 28,
            height: 28,
            marginLeft: collapsed ? 0 : "auto",
            color: "var(--text-muted)",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <polyline points="15 18 9 12 15 6" />
          </motion.svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" style={{ padding: "8px 6px" }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="sidebar-item flex items-center gap-3 rounded-lg mb-0.5 relative"
              style={{
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "var(--accent-muted)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  style={{ height: "60%", background: "var(--accent)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon active={active} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div
        className="shrink-0"
        style={{ borderTop: "1px solid var(--border)", padding: collapsed ? "12px 8px" : "12px 14px" }}
      >
        <div
          className="flex items-center gap-3"
          style={{
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <motion.div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 34,
              height: 34,
              background: "linear-gradient(135deg, var(--accent), var(--purple, #A855F7))",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
            }}
            whileHover={{ scale: 1.08 }}
          >
            {initial}
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                  {userEmail || "user@email.com"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {!collapsed && onSignOut && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={onSignOut}
                className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: "var(--text-muted)" }}
                aria-label="Sign out"
                whileHover={{ color: "var(--error)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function FolderIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function BarChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function DollarIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
