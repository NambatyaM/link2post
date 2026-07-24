"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface PlanData {
  plan: string;
  quotas: {
    projects: { used: number; limit: number };
    posts: { used: number; limit: number };
  };
}

interface PlanContextValue {
  plan: string;
  quotas: PlanData["quotas"];
  loading: boolean;
  refresh: () => void;
}

const PlanContext = createContext<PlanContextValue>({
  plan: "free",
  quotas: { projects: { used: 0, limit: 1 }, posts: { used: 0, limit: 5 } },
  loading: true,
  refresh: () => {},
});

export function usePlan() {
  return useContext(PlanContext);
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlanData>({
    plan: "free",
    quotas: { projects: { used: 0, limit: 1 }, posts: { used: 0, limit: 5 } },
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !mountedRef.current) {
          if (mountedRef.current) setLoading(false);
          return;
        }

        const res = await fetch("/api/user/plan", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok && mountedRef.current) {
          const result = await res.json();
          setData(result);
        }
      } catch {
        // keep defaults
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    load();

    return () => { mountedRef.current = false; };
  }, []);

  return (
    <PlanContext.Provider value={{ plan: data.plan, quotas: data.quotas, loading, refresh: () => setLoading(true) }}>
      {children}
    </PlanContext.Provider>
  );
}
