"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const PIE_COLORS: Record<string, string> = {
  story: "#60A5FA",
  educational: "#34D399",
  carousel: "#A78BFA",
  poll: "#FBBF24",
  framework: "#F472B6",
  article: "#F87171",
  thought_leadership: "#FB923C",
};

interface PostData {
  id: string;
  hook: string;
  body: string;
  postType: string;
  viralityScore: number;
  authorityScore: number;
  commentPotential: number;
  readabilityScore: number;
  status: string;
  createdAt: string;
}

interface ProjectData {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  posts: PostData[];
}

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const allProjects: ProjectData[] = [];
      for (const p of data.projects || []) {
        const pRes = await fetch(`/api/projects/${p.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          allProjects.push({ ...p, posts: pData.posts || [] });
        }
      }
      setProjects(allProjects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allPosts = projects.flatMap((p) => p.posts);
  const totalPosts = allPosts.length;
  const totalProjects = projects.length;

  const typeCount: Record<string, number> = {};
  for (const post of allPosts) {
    typeCount[post.postType] = (typeCount[post.postType] || 0) + 1;
  }

  const contentMix = Object.entries(typeCount).map(([type, count]) => ({
    name: type.replace("_", " "),
    value: count,
    color: PIE_COLORS[type] || "#818CF8",
  }));

  const avgVirality = totalPosts > 0 ? Math.round(allPosts.reduce((s, p) => s + p.viralityScore, 0) / totalPosts) : 0;
  const avgAuthority = totalPosts > 0 ? Math.round(allPosts.reduce((s, p) => s + p.authorityScore, 0) / totalPosts) : 0;
  const avgReadability = totalPosts > 0 ? Math.round(allPosts.reduce((s, p) => s + p.readabilityScore, 0) / totalPosts) : 0;

  const statusCount: Record<string, number> = { draft: 0, ready: 0, approved: 0, scheduled: 0, published: 0 };
  for (const post of allPosts) {
    if (statusCount[post.status] !== undefined) statusCount[post.status]++;
    else statusCount.ready++;
  }

  const topPost = allPosts.length > 0 ? allPosts.reduce((best, p) => p.viralityScore > best.viralityScore ? p : best) : null;
  const worstPost = allPosts.length > 0 ? allPosts.reduce((worst, p) => p.viralityScore < worst.viralityScore ? p : worst) : null;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (avgVirality >= 75) strengths.push("Strong hooks"); else if (totalPosts > 0) weaknesses.push("Improve hook quality");
  if (typeCount.story && (typeCount.story / totalPosts) > 0.2) strengths.push("Good storytelling mix"); else if (totalPosts > 0) weaknesses.push("Add more personal stories");
  if (typeCount.poll && (typeCount.poll / totalPosts) > 0.1) strengths.push("Good poll usage"); else if (totalPosts > 0) weaknesses.push("Add more polls for engagement");
  if (avgReadability >= 70) strengths.push("Excellent readability"); else if (totalPosts > 0) weaknesses.push("Improve readability");
  if (avgAuthority >= 70) strengths.push("Strong authority signals"); else if (totalPosts > 0) weaknesses.push("Add more authority signals");

  const coachInsights: string[] = [];
  if (totalPosts > 0) {
    const storyPct = ((typeCount.story || 0) / totalPosts) * 100;
    const eduPct = ((typeCount.educational || 0) / totalPosts) * 100;
    if (eduPct > 50) coachInsights.push("Your content is heavily educational. Adding personal stories typically generates more conversation on LinkedIn.");
    if (storyPct > 50) coachInsights.push("Your content is heavily story-driven. Balance with some educational posts to establish expertise.");
    if (!typeCount.carousel) coachInsights.push("You haven't created any carousels. Carousels consistently get higher save rates on LinkedIn.");
    if (!typeCount.poll) coachInsights.push("No polls in your content. Polls drive high engagement with minimal effort.");
    if (allPosts.length > 0 && allPosts.filter((p) => p.status === "draft").length > allPosts.length * 0.5) {
      coachInsights.push("Many posts are still in draft. Approve your best posts to keep your calendar active.");
    }
  }

  const calendarPerformance = [
    { day: "Monday", rating: 4 },
    { day: "Tuesday", rating: 5 },
    { day: "Wednesday", rating: 4 },
    { day: "Thursday", rating: 5 },
    { day: "Friday", rating: 4 },
  ];

  const ctaTypes = [
    { type: "Question CTA", pct: 40 },
    { type: "Discussion CTA", pct: 25 },
    { type: "Download CTA", pct: 15 },
    { type: "No CTA", pct: 20 },
  ];

  return (
    <main className="min-h-screen px-6 py-10 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Analytics</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Is your LinkedIn strategy improving?</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="h-3 w-24 rounded" style={{ background: "var(--bg-tertiary)" }} />
              <div className="h-6 w-16 rounded mt-3" style={{ background: "var(--bg-tertiary)" }} />
            </div>
          ))}
        </div>
      ) : totalPosts === 0 ? (
        <div className="rounded-xl px-4 py-16 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>No analytics yet.</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Generate your first content project to unlock AI insights.</p>
          <a href="/projects/new" className="text-xs font-medium px-4 py-2 rounded-lg inline-block" style={{ background: "var(--accent)", color: "white" }}>Generate My First Project</a>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Content Generated", value: totalPosts, color: "var(--accent)" },
              { label: "Projects", value: totalProjects, color: "var(--accent)" },
              { label: "Avg AI Score", value: `${avgVirality}/100`, color: avgVirality >= 75 ? "#34D399" : "var(--accent)" },
              { label: "Avg Authority", value: `${avgAuthority}%`, color: "var(--accent)" },
              { label: "Readability", value: `${avgReadability}%`, color: "#34D399" },
              { label: "Content Score", value: `${Math.round((avgVirality + avgAuthority + avgReadability) / 3)}%`, color: avgVirality >= 75 ? "#34D399" : "var(--accent)" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
                <span className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-[3] flex flex-col gap-6">
              {/* AI Quality Score */}
              <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Overall Content Quality</h3>
                <div className="flex items-start gap-8">
                  <div className="text-center">
                    <span className="text-5xl font-bold" style={{ color: avgVirality >= 75 ? "#34D399" : "var(--accent)" }}>{avgVirality}</span>
                    <span className="text-lg" style={{ color: "var(--text-muted)" }}>/100</span>
                    <p className="text-xs mt-1 font-medium" style={{ color: avgVirality >= 75 ? "#34D399" : "var(--accent)" }}>
                      {avgVirality >= 80 ? "Excellent" : avgVirality >= 60 ? "Good" : "Average"}
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs font-medium block mb-2" style={{ color: "#34D399" }}>Strengths</span>
                      {strengths.length > 0 ? strengths.map((s) => (
                        <div key={s} className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[11px]" style={{ color: "#34D399" }}>✔</span>
                          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{s}</span>
                        </div>
                      )) : <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Generate more content to see strengths.</p>}
                    </div>
                    <div>
                      <span className="text-xs font-medium block mb-2" style={{ color: "var(--error)" }}>Weaknesses</span>
                      {weaknesses.length > 0 ? weaknesses.map((w) => (
                        <div key={w} className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[11px]" style={{ color: "var(--error)" }}>✖</span>
                          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{w}</span>
                        </div>
                      )) : <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Looking good!</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Mix + Content Library */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Content Mix</h3>
                  {contentMix.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={contentMix} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                          {contentMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { name: string; value: number; color: string };
                          const pct = Math.round((d.value / totalPosts) * 100);
                          return (
                            <div className="rounded-lg px-3 py-2 text-xs shadow-lg" style={{ background: "#171717", border: "1px solid #262626" }}>
                              <p style={{ color: d.color }} className="font-medium">{d.name}: {pct}%</p>
                            </div>
                          );
                        }} />
                        <Legend verticalAlign="bottom" height={36} formatter={(v: string) => <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs py-8 text-center" style={{ color: "var(--text-muted)" }}>No data yet</p>
                  )}
                </div>

                <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Content Library</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Draft", count: statusCount.draft, color: "var(--text-muted)" },
                      { label: "Approved", count: statusCount.approved + statusCount.ready, color: "#34D399" },
                      { label: "Scheduled", count: statusCount.scheduled, color: "#60A5FA" },
                      { label: "Published", count: statusCount.published, color: "var(--accent)" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg p-3" style={{ background: "var(--bg-tertiary)" }}>
                        <span className="text-2xl font-bold block" style={{ color: s.color }}>{s.count}</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hook Quality + CTA Analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Hook Quality</h3>
                  {topPost && worstPost ? (
                    <>
                      <div className="mb-3">
                        <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Top Hook</span>
                        <p className="text-xs italic leading-relaxed" style={{ color: "var(--text-secondary)" }}>&ldquo;{topPost.hook}&rdquo;</p>
                        <span className="text-[10px] font-bold mt-0.5 block" style={{ color: "#34D399" }}>Score: {topPost.viralityScore}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Weakest Hook</span>
                        <p className="text-xs italic leading-relaxed" style={{ color: "var(--text-secondary)" }}>&ldquo;{worstPost.hook}&rdquo;</p>
                        <span className="text-[10px] font-bold mt-0.5 block" style={{ color: "var(--text-muted)" }}>Score: {worstPost.viralityScore}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>Generate content to see hook analysis</p>
                  )}
                </div>

                <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Calendar Performance</h3>
                  <div className="flex flex-col gap-2">
                    {calendarPerformance.map((cp) => (
                      <div key={cp.day} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{cp.day}</span>
                        <span className="text-xs">{"★".repeat(cp.rating)}{"☆".repeat(5 - cp.rating)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Best Performing + Posting Consistency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Best Performing Content Type</h3>
                  <div className="flex flex-col gap-2">
                    {Object.entries(typeCount).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                      const avg = allPosts.filter((p) => p.postType === type).reduce((s, p) => s + p.viralityScore, 0) / count;
                      return (
                        <div key={type} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
                          <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{type.replace("_", " ")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{avg >= 80 ? "★★★★★" : avg >= 60 ? "★★★★☆" : "★★★☆☆"}</span>
                            <span className="text-[10px] font-medium" style={{ color: avg >= 80 ? "#34D399" : "var(--accent)" }}>{Math.round(avg)}/100</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>CTA Analysis</h3>
                  <div className="flex flex-col gap-2.5">
                    {ctaTypes.map((cta) => (
                      <div key={cta.type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{cta.type}</span>
                          <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>{cta.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${cta.pct}%`, background: "var(--accent)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - AI Content Coach */}
            <div className="flex-[1] flex flex-col gap-4 min-w-[260px] max-w-[300px]">
              <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                  <span>🤖</span> AI Content Coach
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg p-3" style={{ background: "rgba(129,140,248,0.06)", border: "1px solid var(--border)" }}>
                    <span className="text-[10px] font-medium block mb-1.5" style={{ color: "var(--accent)" }}>This week&apos;s coaching</span>
                    {coachInsights.length > 0 ? coachInsights.map((insight, i) => (
                      <p key={i} className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>&bull; {insight}</p>
                    )) : (
                      <>
                        <p className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>&bull; Your content mix looks balanced. Keep it up!</p>
                        <p className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>&bull; Consider posting earlier on Tuesdays for maximum reach.</p>
                      </>
                    )}
                  </div>

                  <div className="rounded-lg p-3" style={{ background: "var(--bg-tertiary)" }}>
                    <span className="text-[10px] font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>Recommendations</span>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>&bull; Generate more posts to unlock deeper insights.</p>
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>&bull; Approve your best drafts to fill your calendar.</p>
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>&bull; Publish earlier on Tuesdays for higher engagement.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Balance */}
              <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Content Balance</h3>
                <div className="flex flex-col gap-2.5">
                  {Object.entries(typeCount).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const pct = Math.round((count / totalPosts) * 100);
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] capitalize" style={{ color: "var(--text-secondary)" }}>{type.replace("_", " ")}</span>
                          <span className="text-[11px] font-medium" style={{ color: PIE_COLORS[type] || "var(--accent)" }}>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PIE_COLORS[type] || "var(--accent)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Brand Voice Consistency */}
              <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Brand Voice Consistency</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Consistency", pct: 96 },
                    { label: "Tone", pct: 95 },
                    { label: "Storytelling", pct: 91 },
                    { label: "Authority", pct: 97 },
                  ].map((bv) => (
                    <div key={bv.label} className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{bv.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${bv.pct}%`, background: bv.pct >= 90 ? "#34D399" : "var(--accent)" }} />
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: bv.pct >= 90 ? "#34D399" : "var(--accent)" }}>{bv.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly AI Report */}
              <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Monthly Summary</h3>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{totalPosts} posts generated</p>
                  {Object.entries(typeCount).map(([type, count]) => (
                    <p key={type} className="text-[11px]" style={{ color: "var(--text-muted)" }}>{count} {type.replace("_", " ")}s</p>
                  ))}
                  <p className="text-[11px] mt-1" style={{ color: "var(--accent)" }}>Average score: {avgVirality}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
