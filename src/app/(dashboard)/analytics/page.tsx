"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const PIE_COLORS = ["#818CF8", "#F472B6", "#34D399", "#FBBF24", "#A78BFA"];

interface WeeklyPost {
  week: string;
  posts: number;
}

interface ViralityPoint {
  week: string;
  score: number;
}

interface TopHook {
  hook: string;
  score: number;
  date: string;
}

interface ContentMix {
  label: string;
  value: number;
  color: string;
}

interface AnalyticsData {
  totalPosts: number;
  avgVirality: number;
  topHookType: string;
  contentMixSummary: string;
  weeklyPosts: WeeklyPost[];
  viralityOverTime: ViralityPoint[];
  topHooks: TopHook[];
  contentMix: ContentMix[];
}

function generateMockData(range: "7d" | "30d" | "90d"): AnalyticsData {
  const weeks = range === "7d" ? 1 : range === "30d" ? 4 : 12;
  const now = new Date();

  const weeklyPosts: WeeklyPost[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weeklyPosts.push({
      week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      posts: Math.floor(Math.random() * 18) + 3,
    });
  }

  const viralityOverTime: ViralityPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    viralityOverTime.push({
      week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: Math.round((Math.random() * 4 + 3) * 10) / 10,
    });
  }

  const hookTypes = ["Question", "Bold Claim", "Story", "List", "How-to", "Stats"];
  const topHooks: TopHook[] = Array.from({ length: 6 }, (_, i) => ({
    hook: `${hookTypes[i % hookTypes.length]}: "${["Why most people fail at", "The truth about", "I tried", "5 things I learned from", "How to stop", "This changed my"][i]}..."`,
    score: Math.floor(Math.random() * 40) + 60,
    date: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  })).sort((a, b) => b.score - a.score);

  const totalPosts = weeklyPosts.reduce((s, w) => s + w.posts, 0);
  const avgVirality =
    viralityOverTime.length > 0
      ? Math.round((viralityOverTime.reduce((s, v) => s + v.score, 0) / viralityOverTime.length) * 10) / 10
      : 0;

  return {
    totalPosts,
    avgVirality,
    topHookType: hookTypes[Math.floor(Math.random() * hookTypes.length)],
    contentMixSummary: "Balanced",
    weeklyPosts,
    viralityOverTime,
    topHooks,
    contentMix: [
      { label: "Threads", value: 35, color: PIE_COLORS[0] },
      { label: "Single Posts", value: 28, color: PIE_COLORS[1] },
      { label: "Carousels", value: 18, color: PIE_COLORS[2] },
      { label: "Reposts", value: 12, color: PIE_COLORS[3] },
      { label: "Quotes", value: 7, color: PIE_COLORS[4] },
    ],
  };
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: "#171717", border: "1px solid #262626" }}
    >
      <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#818CF8" }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowser();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setData(generateMockData(dateRange));
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
          setData(generateMockData(dateRange));
        }
      } catch {
        setData(generateMockData(dateRange));
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [dateRange]);

  const kpis = data
    ? [
        { label: "Total Posts", value: data.totalPosts, color: "#818CF8" },
        { label: "Avg Virality", value: data.avgVirality, color: "#34D399" },
        { label: "Top Hook Type", value: data.topHookType, color: "#F472B6" },
        { label: "Content Mix", value: data.contentMixSummary, color: "#FBBF24" },
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
                background: dateRange === range ? "#818CF8" : "#171717",
                color: dateRange === range ? "white" : "var(--text-muted)",
                border: `1px solid ${dateRange === range ? "#818CF8" : "#262626"}`,
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
              style={{ background: "#171717", border: "1px solid #262626" }}
            >
              <div className="h-3 w-24 rounded" style={{ background: "#262626" }} />
              <div className="h-6 w-16 rounded mt-3" style={{ background: "#262626" }} />
            </div>
          ))}
        </div>
      ) : !data ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "#171717", border: "1px solid #262626" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No analytics data available yet. Generate some content to see insights.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl p-4"
                style={{ background: "#171717", border: "1px solid #262626" }}
              >
                <span className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                  {kpi.label}
                </span>
                <span className="text-2xl font-bold" style={{ color: kpi.color }}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          {/* Bar Chart + Line Chart */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-5"
              style={{ background: "#171717", border: "1px solid #262626" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Posts per Week
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weeklyPosts} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <XAxis
                    dataKey="week"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(129,140,248,0.08)" }} />
                  <Bar dataKey="posts" fill="#818CF8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: "#171717", border: "1px solid #262626" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Virality Score Trend
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.viralityOverTime} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <defs>
                    <linearGradient id="viralityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#818CF8"
                    strokeWidth={2}
                    fill="url(#viralityGrad)"
                    dot={{ r: 3, fill: "#818CF8", stroke: "#171717", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: "#818CF8", stroke: "#171717", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart + Top Hooks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-5"
              style={{ background: "#171717", border: "1px solid #262626" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Content Mix
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.contentMix}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.contentMix.map((entry, i) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as ContentMix;
                      const total = data.contentMix.reduce((s, c) => s + c.value, 0);
                      const pct = Math.round((d.value / total) * 100);
                      return (
                        <div
                          className="rounded-lg px-3 py-2 text-xs shadow-lg"
                          style={{ background: "#171717", border: "1px solid #262626" }}
                        >
                          <p style={{ color: d.color }} className="font-medium">
                            {d.label}: {pct}%
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: "#171717", border: "1px solid #262626" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Top Performing Hooks
              </h3>
              <div className="flex flex-col gap-2">
                {data.topHooks.slice(0, 5).map((hook, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ background: "#262626" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "rgba(129,140,248,0.12)",
                        color: "#818CF8",
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
