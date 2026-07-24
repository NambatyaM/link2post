"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { PlanProvider, usePlan } from "@/components/providers/PlanProvider";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import SearchModal from "@/components/shared/SearchModal";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  calendar: "Calendar",
  analytics: "Analytics",
  settings: "Settings",
};

function deriveBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [
    { label: "Link2Post", href: "/dashboard" },
  ];

  let accumulated = "";
  for (const segment of segments) {
    accumulated += "/" + segment;
    const label = ROUTE_LABELS[segment];
    if (label) {
      crumbs.push({ label, href: accumulated });
    } else {
      crumbs.push({ label: segment, href: accumulated });
    }
  }

  if (crumbs.length === 1) {
    crumbs.push({ label: "Dashboard" });
  } else {
    const last = crumbs[crumbs.length - 1];
    if (last.href) {
      crumbs[crumbs.length - 1] = { label: last.label };
    }
  }

  return crumbs;
}

function DashboardShell({
  children,
  userEmail,
  authChecked,
  onSignOut,
}: {
  children: React.ReactNode;
  userEmail?: string;
  authChecked: boolean;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const { plan } = usePlan();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const breadcrumbs = useMemo(() => deriveBreadcrumbs(pathname), [pathname]);

  if (!authChecked) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin-slow"
          style={{ borderColor: "var(--text-muted)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        activePath={pathname}
        userEmail={userEmail}
        plan={plan}
        onSignOut={onSignOut}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          breadcrumbs={breadcrumbs}
          onSearch={() => setSearchOpen(true)}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserEmail(session.user.email ?? undefined);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserEmail(session.user.email ?? undefined);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <PlanProvider>
      <DashboardShell
        userEmail={userEmail}
        authChecked={authChecked}
        onSignOut={handleSignOut}
      >
        {children}
      </DashboardShell>
    </PlanProvider>
  );
}
