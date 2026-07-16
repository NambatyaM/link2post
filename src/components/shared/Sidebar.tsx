"use client";

import Link from "next/link";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activePath: string;
  userEmail?: string;
  onSignOut?: () => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { label: "Projects", href: "/projects", icon: FolderIcon },
  { label: "Calendar", href: "/calendar", icon: CalendarIcon },
  { label: "Analytics", href: "/analytics", icon: BarChartIcon },
  { label: "Settings", href: "/settings", icon: GearIcon },
];

export default function Sidebar({
  collapsed,
  onToggle,
  activePath,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";
  const isActive = (href: string) =>
    activePath === href || activePath.startsWith(href + "/");

  return (
    <aside
      className="flex flex-col h-full border-r shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? 48 : 240,
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="flex items-center shrink-0 border-b"
        style={{
          height: 56,
          borderColor: "var(--border)",
          padding: collapsed ? "0 12px" : "0 16px",
        }}
      >
        {!collapsed && (
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            Link2Post
          </span>
        )}
        <button
          onClick={onToggle}
          className="shrink-0 flex items-center justify-center rounded transition-colors"
          style={{
            width: 28,
            height: 28,
            marginLeft: collapsed ? 0 : "auto",
            color: "var(--text-muted)",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: collapsed ? "rotate(180deg)" : undefined,
              transition: "transform 0.15s ease",
            }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" style={{ padding: "8px 6px" }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="sidebar-item flex items-center gap-3 rounded-md mb-0.5"
              style={{
                padding: collapsed ? "8px 0" : "8px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active ? "rgba(129, 140, 248, 0.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon active={active} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className="shrink-0 border-t"
        style={{ borderColor: "var(--border)", padding: collapsed ? "10px 6px" : "10px 12px" }}
      >
        <div
          className="flex items-center gap-3"
          style={{
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "0" : "0 4px",
          }}
        >
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 32,
              height: 32,
              background: "var(--accent)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p
                className="text-xs truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {userEmail || "user@email.com"}
              </p>
            </div>
          )}
          {!collapsed && onSignOut && (
            <button
              onClick={onSignOut}
              className="shrink-0 p-1.5 rounded transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-label="Sign out"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--error)";
                e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function FolderIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function BarChartIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
