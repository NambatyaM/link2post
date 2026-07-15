"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface AnalyticsData {
  totalPosts: number;
  avgVirality: number;
  approvalRate: number;
  imageCopyRate: number;
  weeklyPosts: number[];
  viralityOverTime: number[];
  topHooks: { hook: string; score: number; date: string }[];
  contentMix: { label: string; value: number; color: string }[];
}

function buildWeekLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    labels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
  }
  return labels;
}

function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-2 h-[160px]">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
            {val}
          </span>
          <div
            className="w-full rounded-t-md transition-all duration-300"
            style={{
              background: "var(--accent)",
              height: `${(val / max) * 100}%`,
              minHeight: val > 0 ? "4px" : "0px",
              opacity: val > 0 ? 0.85 : 0.3,
            }}
          />
          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, width = 400, height = 120 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 20) - 10;
        return (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" stroke="var(--bg-secondary)" strokeWidth="2" />
        );
      })}
    </svg>
  );
}

function PieChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const radius = 50;
  const cx = 50;
  const cy = 50;

  const slices = segments.map((seg, i) => {
    const prevAccumulated = segments.slice(0, i).reduce((sum, s) => sum + s.value, 0);
    const startAngle = (prevAccumulated / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((prevAccumulated + seg.value) / total) * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = seg.value / total > 0.5 ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { ...seg, d, pct: Math.round((seg.value / total) * 100) };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-[120px] h-[120px]">
        {slices.map((slice) => (
          <path key={slice.label} d={slice.d} fill={slice.color} />
        ))}
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: slice.color }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {slice.label}
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {slice.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/analytics?range=${dateRange}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData(null);
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [dateRange]);

  const weekLabels = buildWeekLabels();
  const kpis = data
    ? [
        { label: "Total Posts", value: data.totalPosts, color: "var(--accent)" },
        { label: "Avg Virality Score", value: data.avgVirality, color: "var(--success)" },
        { label: "Approval Rate", value: `${data.approvalRate}%`, color: "var(--accent)" },
        { label: "Image Copy Rate", value: `${data.imageCopyRate}%`, color: "var(--success)" },
      ]
    : [];

  return (
    <main className="min-h-screen px-6 py-10 max-w-[1080px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Track your content performance
          </p>
        </div>
        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: dateRange === range ? "var(--accent)" : "var(--bg-secondary)",
                color: dateRange === range ? "white" : "var(--text-muted)",
                border: `1px solid ${dateRange === range ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <div className="h-3 w-24 rounded" style={{ background: "var(--bg-tertiary)" }} />
              <div className="h-6 w-16 rounded mt-3" style={{ background: "var(--bg-tertiary)" }} />
            </div>
          ))}
        </div>
      ) : !data ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No analytics data available yet. Generate some content to see insights.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl p-4"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                <span className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                  {kpi.label}
                </span>
                <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Posts per Week
              </h3>
              <BarChart data={data.weeklyPosts} labels={weekLabels} />
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Avg Virality Score
              </h3>
              <LineChart data={data.viralityOverTime} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Content Mix
              </h3>
              <PieChart segments={data.contentMix} />
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Top Performing Hooks
              </h3>
              <div className="flex flex-col gap-2">
                {data.topHooks.slice(0, 5).map((hook, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ background: "var(--bg-tertiary)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "rgba(129,140,248,0.12)",
                        color: "var(--accent)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {hook.hook}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          Score: {hook.score}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {new Date(hook.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
