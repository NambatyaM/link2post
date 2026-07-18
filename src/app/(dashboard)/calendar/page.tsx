"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface CalendarPost {
  id: string;
  hook: string;
  body: string;
  imagePrompt: string;
  postType: string;
  viralityScore: number;
  status: string;
  scheduledDate: string | null;
  projectTitle: string;
  projectId: string;
}

interface PostTypeCount {
  type: string;
  count: number;
  color: string;
  bg: string;
}

const TYPE_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  story: { color: "#60A5FA", bg: "rgba(96,165,250,0.15)", icon: "📖" },
  educational: { color: "#34D399", bg: "rgba(52,211,153,0.15)", icon: "🎓" },
  carousel: { color: "#A78BFA", bg: "rgba(167,139,250,0.15)", icon: "📑" },
  poll: { color: "#FBBF24", bg: "rgba(251,191,36,0.15)", icon: "📊" },
  framework: { color: "#F472B6", bg: "rgba(244,114,182,0.15)", icon: "🏗️" },
  article: { color: "#F87171", bg: "rgba(248,113,113,0.15)", icon: "📝" },
  thought_leadership: { color: "#FB923C", bg: "rgba(251,146,60,0.15)", icon: "💡" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  ready: { bg: "rgba(52,211,153,0.15)", color: "#34D399" },
  approved: { bg: "rgba(52,211,153,0.15)", color: "#34D399" },
  scheduled: { bg: "rgba(96,165,250,0.15)", color: "#60A5FA" },
  published: { bg: "rgba(129,140,248,0.15)", color: "var(--accent)" },
  archived: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

const TYPE_FILTERS = ["all", "story", "educational", "carousel", "poll", "framework", "article", "thought_leadership"];
const STATUS_FILTERS = ["all", "draft", "ready", "scheduled", "published"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const today = new Date();
  const todayStr = dateKey(today);

  const cells: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
  const prevMonthLast = new Date(year, month, 0).getDate();

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthLast - i), isCurrentMonth: false, isToday: false });
  }
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    cells.push({ date: d, isCurrentMonth: true, isToday: dateKey(d) === todayStr });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, isToday: false });
  }
  return cells;
}

function getWeekdayName(d: Date) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function getRecommendedTime(dayOfWeek: number) {
  const times: Record<number, string> = { 1: "9:00 AM", 2: "8:30 AM", 3: "8:00 AM", 4: "9:15 AM", 5: "10:00 AM" };
  return times[dayOfWeek] || "9:00 AM";
}

function getBestTimeRating(dayOfWeek: number) {
  const ratings: Record<number, { stars: number; label: string }> = {
    1: { stars: 4, label: "Good" },
    2: { stars: 5, label: "Excellent" },
    3: { stars: 5, label: "Excellent" },
    4: { stars: 4, label: "Good" },
    5: { stars: 4, label: "Good" },
  };
  return ratings[dayOfWeek] || { stars: 3, label: "Average" };
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  const [weekOffset, setWeekOffset] = useState(0);
  const dragRef = useRef<CalendarPost | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPosts([]); setLoading(false); return; }

      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const allPosts: CalendarPost[] = [];
      const projects = data.projects || [];

      for (const project of projects) {
        const pRes = await fetch(`/api/projects/${project.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          for (const post of pData.posts || []) {
            allPosts.push({
              ...post,
              projectTitle: project.title,
              projectId: project.id,
            });
          }
        }
      }
      setPosts(allPosts);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filteredPosts = posts.filter((p) => {
    if (typeFilter !== "all" && p.postType !== typeFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const postsByDate: Record<string, CalendarPost[]> = {};
  for (const post of filteredPosts) {
    const date = post.scheduledDate ? dateKey(new Date(post.scheduledDate)) : null;
    if (date) {
      if (!postsByDate[date]) postsByDate[date] = [];
      postsByDate[date].push(post);
    }
  }

  const typeCounts: PostTypeCount[] = TYPE_FILTERS.filter((t) => t !== "all").map((t) => {
    const info = TYPE_COLORS[t] || TYPE_COLORS.story;
    return {
      type: t,
      count: filteredPosts.filter((p) => p.postType === t).length,
      color: info.color,
      bg: info.bg,
    };
  }).filter((tc) => tc.count > 0);

  const totalPosts = filteredPosts.length;
  const draftCount = filteredPosts.filter((p) => p.status === "draft").length;
  const readyCount = filteredPosts.filter((p) => p.status === "approved" || p.status === "ready").length;
  const scheduledCount = filteredPosts.filter((p) => p.status === "scheduled").length;

  const grid = buildMonthGrid(year, month);
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToPrev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const goToNext = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  };

  const getWeekDates = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();

  const handleDragStart = (post: CalendarPost) => { dragRef.current = post; };
  const handleDragEnd = () => { dragRef.current = null; };
  const handleDrop = async (targetDate: string) => {
    const post = dragRef.current;
    if (!post) return;
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`/api/projects/${post.projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ posts: [{ hook: post.hook, body: post.body, imagePrompt: post.imagePrompt, viralityScore: post.viralityScore, status: post.status }] }),
        });
      }
    } catch { /* */ }
    dragRef.current = null;
    fetchPosts();
  };

  const missingTypes = ["story", "carousel", "poll", "framework", "article", "thought_leadership"]
    .filter((t) => !filteredPosts.some((p) => p.postType === t));

  return (
    <main className="min-h-screen px-6 py-10 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Post Tracker</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Assign dates to your posts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button onClick={() => setView("month")} className="px-3 py-1.5 text-xs font-medium transition-colors" style={{ background: view === "month" ? "var(--accent)" : "var(--bg-secondary)", color: view === "month" ? "white" : "var(--text-muted)" }}>Month</button>
            <button onClick={() => setView("week")} className="px-3 py-1.5 text-xs font-medium transition-colors" style={{ background: view === "week" ? "var(--accent)" : "var(--bg-secondary)", color: view === "week" ? "white" : "var(--text-muted)" }}>Week</button>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {typeCounts.map((tc) => (
          <div key={tc.type} className="rounded-xl p-3 text-center" style={{ background: tc.bg, border: "1px solid var(--border)" }}>
            <span className="text-lg">{TYPE_COLORS[tc.type]?.icon}</span>
            <p className="text-lg font-bold mt-1" style={{ color: tc.color }}>{tc.count}</p>
            <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>{tc.type.replace("_", " ")}</p>
          </div>
        ))}
        {typeCounts.length === 0 && !loading && (
          <div className="col-span-6 rounded-xl p-3 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No posts yet. Generate content to see stats.</p>
          </div>
        )}
        {typeCounts.length > 0 && (
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(129,140,248,0.1)", border: "1px solid var(--border)" }}>
            <span className="text-lg">📦</span>
            <p className="text-lg font-bold mt-1" style={{ color: "var(--accent)" }}>{totalPosts}</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Total Pieces</p>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-[3] flex flex-col gap-4">
          {/* Navigation + Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={goToPrev} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: "var(--text-primary)" }}>{monthLabel}</span>
              <button onClick={goToNext} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button onClick={goToToday} className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Today</button>
            </div>
            <div className="flex items-center gap-2">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {TYPE_FILTERS.map((f) => <option key={f} value={f}>{f === "all" ? "All Types" : f.replace("_", " ")}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {STATUS_FILTERS.map((f) => <option key={f} value={f}>{f === "all" ? "All Statuses" : f}</option>)}
              </select>
            </div>
          </div>

          {/* Content Status Bar */}
          <div className="flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--bg-tertiary)" }} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Draft: {draftCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "#34D399" }} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Ready: {readyCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "#60A5FA" }} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Scheduled: {scheduledCount}</span>
            </div>
          </div>

          {/* Month View */}
          {view === "month" && (
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-5">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                  <div key={day} className="text-xs font-medium text-center py-2.5" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-5">
                {grid.filter((_, i) => {
                  const dayOfWeek = grid[i].date.getDay();
                  return dayOfWeek >= 1 && dayOfWeek <= 5;
                }).filter((cell) => {
                  return cell.isCurrentMonth || grid.indexOf(cell) < 7;
                }).slice(0, 35).map((cell, idx) => {
                  const key = dateKey(cell.date);
                  const dayPosts = postsByDate[key] || [];
                  const dayOfWeek = cell.date.getDay();
                  const timeInfo = getBestTimeRating(dayOfWeek);

                  return (
                    <div
                      key={idx}
                      className="min-h-[110px] p-2 transition-colors"
                      style={{
                        borderRight: (idx + 1) % 5 !== 0 ? "1px solid var(--border)" : undefined,
                        borderBottom: idx < 30 ? "1px solid var(--border)" : undefined,
                        opacity: cell.isCurrentMonth ? 1 : 0.35,
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(key)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                          style={{
                            color: cell.isToday ? "white" : "var(--text-secondary)",
                            background: cell.isToday ? "var(--accent)" : "transparent",
                          }}
                        >
                          {cell.date.getDate()}
                        </span>
                        {dayPosts.length === 0 && cell.isCurrentMonth && dayOfWeek >= 1 && dayOfWeek <= 5 && (
                          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>★{timeInfo.stars}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayPosts.slice(0, 2).map((post) => {
                          const typeInfo = TYPE_COLORS[post.postType] || TYPE_COLORS.story;
                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={() => handleDragStart(post)}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedPost(post)}
                              className="text-[10px] font-medium px-1.5 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ background: typeInfo.bg, color: typeInfo.color, borderLeft: `2px solid ${typeInfo.color}` }}
                            >
                              <div className="flex items-center gap-1">
                                <span>{typeInfo.icon}</span>
                                <span className="truncate">{post.hook?.slice(0, 20) || "Post"}</span>
                              </div>
                            </div>
                          );
                        })}
                        {dayPosts.length > 2 && (
                          <span className="text-[9px] px-1" style={{ color: "var(--text-muted)" }}>+{dayPosts.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week View */}
          {view === "week" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset((w) => w - 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  Week of {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <button onClick={() => setWeekOffset((w) => w + 1)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
              {weekDates.map((date) => {
                const key = dateKey(date);
                const dayPosts = postsByDate[key] || [];
                const dow = date.getDay();
                const timeInfo = getBestTimeRating(dow);
                const time = getRecommendedTime(dow);

                return (
                  <div key={key} className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {getWeekdayName(date)} {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">{time}</span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {"★".repeat(timeInfo.stars)}{"☆".repeat(5 - timeInfo.stars)} {timeInfo.label}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                        Expected reach: {dow >= 1 && dow <= 5 ? "High" : "Medium"}
                      </span>
                    </div>
                    {dayPosts.length === 0 ? (
                      <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>No posts scheduled</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {dayPosts.map((post) => {
                          const typeInfo = TYPE_COLORS[post.postType] || TYPE_COLORS.story;
                          return (
                            <div
                              key={post.id}
                              onClick={() => setSelectedPost(post)}
                              className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: typeInfo.bg }}>{typeInfo.icon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{post.hook}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] capitalize" style={{ color: typeInfo.color }}>{post.postType.replace("_", " ")}</span>
                                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{time}</span>
                                  <span className="text-[10px] font-bold" style={{ color: post.viralityScore >= 80 ? "#34D399" : post.viralityScore >= 60 ? "var(--accent)" : "var(--text-muted)" }}>
                                    {post.viralityScore}/100
                                  </span>
                                </div>
                              </div>
                              <span
                                className="text-[9px] font-medium px-2 py-0.5 rounded-full capitalize"
                                style={STATUS_STYLES[post.status] || STATUS_STYLES.draft}
                              >
                                {post.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPosts.length === 0 && (
            <div className="rounded-xl px-4 py-16 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>No posts scheduled yet.</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Generate content in a project, then approve posts to add them to your calendar.</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="flex-[1] flex flex-col gap-4 min-w-[240px] max-w-[280px]">
          {/* AI Insights */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
              <span>✨</span> AI Recommendations
            </h3>
            <div className="flex flex-col gap-2.5">
              {filteredPosts.length === 0 ? (
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Generate content to unlock AI insights.</p>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] mt-0.5" style={{ color: "#34D399" }}>✔</span>
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>Tuesdays and Thursdays are your strongest posting days.</p>
                  </div>
                  {typeCounts.find((t) => t.type === "story") && (
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] mt-0.5" style={{ color: "#34D399" }}>✔</span>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>Publish Story Posts on Mondays for maximum engagement.</p>
                    </div>
                  )}
                  {typeCounts.find((t) => t.type === "carousel") && (
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] mt-0.5" style={{ color: "#34D399" }}>✔</span>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>Carousels perform best on Wednesdays.</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] mt-0.5" style={{ color: "#34D399" }}>✔</span>
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>Thought Leadership performs best on Fridays.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content Balance */}
          {totalPosts > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Content Balance</h3>
              <div className="flex flex-col gap-2.5">
                {typeCounts.map((tc) => {
                  const pct = Math.round((tc.count / totalPosts) * 100);
                  return (
                    <div key={tc.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] capitalize" style={{ color: "var(--text-secondary)" }}>{tc.type.replace("_", " ")}</span>
                        <span className="text-[11px] font-medium" style={{ color: tc.color }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tc.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing Content */}
          {missingTypes.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Missing Content</h3>
              <div className="flex flex-col gap-1.5">
                {missingTypes.map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: "var(--error)" }}>❌</span>
                    <span className="text-[11px] capitalize" style={{ color: "var(--text-secondary)" }}>{t.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-2.5" style={{ color: "var(--text-muted)" }}>Generate more posts to fill these gaps.</p>
            </div>
          )}

          {/* Best Time */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Best Posting Times</h3>
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3, 4, 5].map((dow) => {
                const dayName = ["", "Mon", "Tue", "Wed", "Thu", "Fri"][dow];
                const time = getRecommendedTime(dow);
                const rating = getBestTimeRating(dow);
                return (
                  <div key={dow} className="flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{dayName}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{time}</span>
                      <span className="text-[10px]">{"".padEnd(rating.stars, "★").padEnd(5, "☆")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Panel */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSelectedPost(null)}>
          <div
            className="w-full max-w-md h-full overflow-y-auto p-6 animate-slide-in"
            style={{ background: "var(--bg-primary)", borderLeft: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Post Details</h3>
              <button onClick={() => setSelectedPost(null)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: (TYPE_COLORS[selectedPost.postType] || TYPE_COLORS.story).bg }}>
                  {(TYPE_COLORS[selectedPost.postType] || TYPE_COLORS.story).icon}
                </div>
                <div>
                  <span className="text-[11px] font-medium capitalize" style={{ color: (TYPE_COLORS[selectedPost.postType] || TYPE_COLORS.story).color }}>
                    {selectedPost.postType.replace("_", " ")} Post
                  </span>
                  <span className="text-[11px] ml-2 px-2 py-0.5 rounded-full capitalize" style={STATUS_STYLES[selectedPost.status] || STATUS_STYLES.draft}>
                    {selectedPost.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>AI Score</span>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold" style={{ color: selectedPost.viralityScore >= 80 ? "#34D399" : selectedPost.viralityScore >= 60 ? "var(--accent)" : "var(--text-muted)" }}>
                    {selectedPost.viralityScore}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>/100</span>
                    <span className="text-[10px] font-medium" style={{ color: selectedPost.viralityScore >= 80 ? "#34D399" : "var(--text-muted)" }}>
                      {selectedPost.viralityScore >= 80 ? "Excellent" : selectedPost.viralityScore >= 60 ? "Good" : "Average"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Expected Engagement</span>
                <span className="text-sm">{selectedPost.viralityScore >= 80 ? "★★★★★" : selectedPost.viralityScore >= 60 ? "★★★★☆" : "★★★☆☆"}</span>
              </div>

              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>Hook</span>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{selectedPost.hook}</p>
              </div>

              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>Preview</span>
                <div className="text-xs leading-relaxed p-3 rounded-lg max-h-[200px] overflow-y-auto" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {selectedPost.body?.slice(0, 500) || "No content preview available."}
                  {selectedPost.body && selectedPost.body.length > 500 && "..."}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>From Project</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{selectedPost.projectTitle}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.2s ease-out; }
      `}</style>
    </main>
  );
}
