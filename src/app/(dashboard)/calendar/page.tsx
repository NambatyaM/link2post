"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface ContentItem {
  id: string;
  hook: string;
  body: string;
  imagePrompt: string;
  postType: string;
  viralityScore: number;
  authorityScore: number;
  readabilityScore: number;
  status: string;
  scheduledDate: string | null;
  publishedAt: string | null;
  createdAt: string;
  projectTitle: string;
  projectId: string;
}

const TYPE_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  story: { color: "#60A5FA", bg: "rgba(96,165,250,0.15)", icon: "📖" },
  educational: { color: "#34D399", bg: "rgba(52,211,153,0.15)", icon: "🎓" },
  carousel: { color: "#A78BFA", bg: "rgba(167,139,250,0.15)", icon: "📑" },
  poll: { color: "#FBBF24", bg: "rgba(251,191,36,0.15)", icon: "📊" },
  framework: { color: "#F472B6", bg: "rgba(244,114,182,0.15)", icon: "🏗️" },
  article: { color: "#F87171", bg: "rgba(248,113,113,0.15)", icon: "📝" },
  thought_leadership: { color: "#FB923C", bg: "rgba(251,146,60,0.15)", icon: "💡" },
  listicle: { color: "#38BDF8", bg: "rgba(56,189,248,0.15)", icon: "📋" },
  case_study: { color: "#4ADE80", bg: "rgba(74,222,128,0.15)", icon: "🔍" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
  ready: { bg: "rgba(52,211,153,0.15)", color: "#34D399" },
  approved: { bg: "rgba(52,211,153,0.15)", color: "#34D399" },
  scheduled: { bg: "rgba(96,165,250,0.15)", color: "#60A5FA" },
  published: { bg: "rgba(129,140,248,0.15)", color: "#818CF8" },
  archived: { bg: "var(--bg-tertiary)", color: "var(--text-muted)" },
};

const TYPE_LIST = ["all", "story", "educational", "carousel", "poll", "framework", "article", "thought_leadership"];
const STATUS_LIST = ["all", "draft", "scheduled", "published"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatRelativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [allPosts, setAllPosts] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedPost, setSelectedPost] = useState<ContentItem | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  const [weekOffset, setWeekOffset] = useState(0);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);

  const dragRef = useRef<ContentItem | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAllPosts([]); setLoading(false); return; }

      const res = await fetch("/api/projects?include=posts", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAllPosts(data.posts || []);
    } catch {
      setAllPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filteredPosts = allPosts.filter((p) => {
    if (typeFilter !== "all" && p.postType !== typeFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (projectFilter !== "all" && p.projectId !== projectFilter) return false;
    if (searchQuery && !p.hook?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const postsByDate: Record<string, ContentItem[]> = {};
  const unscheduledPosts: ContentItem[] = [];
  for (const post of filteredPosts) {
    const date = post.scheduledDate ? dateKey(new Date(post.scheduledDate)) : null;
    if (date) {
      if (!postsByDate[date]) postsByDate[date] = [];
      postsByDate[date].push(post);
    } else {
      unscheduledPosts.push(post);
    }
  }

  const projectOptions = [...new Set(allPosts.map((p) => ({ id: p.projectId, title: p.projectTitle })))];
  const projectMap = Object.fromEntries(projectOptions.map((p) => [p.id, p.title]));

  const totalDraft = filteredPosts.filter((p) => p.status === "draft").length;
  const totalScheduled = filteredPosts.filter((p) => p.status === "scheduled").length;
  const totalPublished = filteredPosts.filter((p) => p.status === "published").length;

  const grid = buildMonthGrid(year, month);
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToPrev = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const goToNext = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToToday = () => { const t = new Date(); setYear(t.getFullYear()); setMonth(t.getMonth()); };

  const getWeekDates = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
    });
  };
  const weekDates = getWeekDates();

  const handleDragStart = (post: ContentItem) => { dragRef.current = post; };
  const handleDragEnd = () => { dragRef.current = null; };

  const handleDrop = async (targetDate: string) => {
    const post = dragRef.current;
    if (!post) return;
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const scheduledIso = new Date(targetDate + "T09:00:00").toISOString();
        await fetch(`/api/projects/${post.projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            posts: [{
              id: post.id,
              hook: post.hook,
              body: post.body,
              imagePrompt: post.imagePrompt,
              postType: post.postType,
              viralityScore: post.viralityScore,
              status: "scheduled",
              scheduledDate: scheduledIso,
            }],
          }),
        });
      }
    } catch { /* */ }
    dragRef.current = null;
    fetchPosts();
  };

  const handleStatusChange = async (post: ContentItem, newStatus: string) => {
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const updates: Record<string, unknown> = {
          posts: [{
            id: post.id,
            hook: post.hook,
            body: post.body,
            imagePrompt: post.imagePrompt,
            postType: post.postType,
            viralityScore: post.viralityScore,
            status: newStatus,
            scheduledDate: post.scheduledDate,
            publishedAt: newStatus === "published" ? new Date().toISOString() : null,
          }],
        };
        await fetch(`/api/projects/${post.projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(updates),
        });
        fetchPosts();
        if (selectedPost?.id === post.id) {
          setSelectedPost({ ...post, status: newStatus, publishedAt: newStatus === "published" ? new Date().toISOString() : post.publishedAt });
        }
      }
    } catch { /* */ }
  };

  const handleReschedule = async (post: ContentItem, newDate: string) => {
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const scheduledIso = new Date(newDate + "T09:00:00").toISOString();
        await fetch(`/api/projects/${post.projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            posts: [{
              id: post.id,
              hook: post.hook,
              body: post.body,
              imagePrompt: post.imagePrompt,
              postType: post.postType,
              viralityScore: post.viralityScore,
              status: "scheduled",
              scheduledDate: scheduledIso,
            }],
          }),
        });
        fetchPosts();
      }
    } catch { /* */ }
  };

  const handleDelete = async (post: ContentItem) => {
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const remaining = allPosts.filter((p) => p.projectId === post.projectId && p.id !== post.id);
        const postsPayload = remaining.map((p) => ({
          id: p.id,
          hook: p.hook,
          body: p.body,
          imagePrompt: p.imagePrompt,
          postType: p.postType,
          viralityScore: p.viralityScore,
          status: p.status,
          scheduledDate: p.scheduledDate,
        }));
        await fetch(`/api/projects/${post.projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ posts: postsPayload }),
        });
        setSelectedPost(null);
        fetchPosts();
      }
    } catch { /* */ }
  };

  return (
    <main className="min-h-screen px-4 py-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Content Hub</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Organize, schedule, and track all your LinkedIn content</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button onClick={() => setView("month")} className="px-3 py-1.5 text-xs font-medium transition-colors" style={{ background: view === "month" ? "var(--accent)" : "var(--bg-secondary)", color: view === "month" ? "white" : "var(--text-muted)" }}>Month</button>
            <button onClick={() => setView("week")} className="px-3 py-1.5 text-xs font-medium transition-colors" style={{ background: view === "week" ? "var(--accent)" : "var(--bg-secondary)", color: view === "week" ? "white" : "var(--text-muted)" }}>Week</button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 mb-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--text-muted)" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Draft: {totalDraft}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#60A5FA" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Scheduled: {totalScheduled}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#818CF8" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Published: {totalPublished}</span>
        </div>
        <div className="flex-1" />
        <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{filteredPosts.length} pieces</span>
      </div>

      <div className="flex gap-4">
        {/* Left Panel: Content Checklist */}
        <div
          className="flex flex-col gap-3 transition-all"
          style={{ width: checklistCollapsed ? "48px" : "300px", minWidth: checklistCollapsed ? "48px" : "300px" }}
        >
          <button
            onClick={() => setChecklistCollapsed(!checklistCollapsed)}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            {!checklistCollapsed && <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Content Checklist</span>}
          </button>

          {!checklistCollapsed && (
            <>
              <input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg w-full"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              />
              <div className="flex gap-1.5 flex-wrap">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-[10px] px-2 py-1 rounded-md" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {TYPE_LIST.map((t) => <option key={t} value={t}>{t === "all" ? "All Types" : t.replace("_", " ")}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-[10px] px-2 py-1 rounded-md" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {STATUS_LIST.map((s) => <option key={s} value={s}>{s === "all" ? "All Status" : s}</option>)}
                </select>
                {projectOptions.length > 1 && (
                  <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="text-[10px] px-2 py-1 rounded-md" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    <option value="all">All Projects</option>
                    {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredPosts.length === 0 && !loading && (
                  <p className="text-[11px] text-center py-6" style={{ color: "var(--text-muted)" }}>No content found</p>
                )}
                {filteredPosts.map((post) => {
                  const tc = TYPE_COLORS[post.postType] || TYPE_COLORS.story;
                  const sc = STATUS_STYLES[post.status] || STATUS_STYLES.draft;
                  const isSelected = selectedPost?.id === post.id;
                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={() => handleDragStart(post)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedPost(post)}
                      className="rounded-lg px-3 py-2 cursor-pointer transition-all hover:opacity-80"
                      style={{
                        background: isSelected ? "rgba(129,140,248,0.12)" : "var(--bg-secondary)",
                        border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                        borderLeft: `3px solid ${tc.color}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px]">{tc.icon}</span>
                        <span className="text-[11px] font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
                          {post.hook?.slice(0, 35) || "Untitled"}
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                          {post.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px]" style={{ color: "var(--text-muted)" }}>
                        <span className="truncate">{post.projectTitle}</span>
                        {post.scheduledDate && (
                          <span style={{ color: "#60A5FA" }}>
                            {new Date(post.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {!post.scheduledDate && <span>unscheduled</span>}
                        <span className="ml-auto">{post.viralityScore}/100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Center Panel: Calendar Grid */}
        <div className="flex-[1] flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={goToPrev} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-sm font-medium min-w-[130px] text-center" style={{ color: "var(--text-primary)" }}>{monthLabel}</span>
              <button onClick={goToNext} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button onClick={goToToday} className="ml-1 px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Today</button>
            </div>
          </div>

          {/* Unscheduled Pool */}
          {unscheduledPosts.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <h3 className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Unscheduled ({unscheduledPosts.length})
              </h3>
              <div className="flex gap-1.5 flex-wrap max-h-[60px] overflow-y-auto">
                {unscheduledPosts.map((post) => {
                  const tc = TYPE_COLORS[post.postType] || TYPE_COLORS.story;
                  return (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={() => handleDragStart(post)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedPost(post)}
                      className="text-[9px] font-medium px-2 py-1 rounded-md cursor-grab active:cursor-grabbing hover:opacity-80"
                      style={{ background: tc.bg, color: tc.color, borderLeft: `2px solid ${tc.color}` }}
                    >
                      {tc.icon} {post.hook?.slice(0, 18) || "Post"}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month View */}
          {view === "month" && (
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-5">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                  <div key={day} className="text-[11px] font-medium text-center py-2" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-5">
                {grid.filter((cell) => {
                  const dow = cell.date.getDay();
                  return dow >= 1 && dow <= 5;
                }).filter((cell) => cell.isCurrentMonth).map((cell, idx) => {
                  const key = dateKey(cell.date);
                  const dayPosts = postsByDate[key] || [];
                  const isToday = cell.isToday;

                  return (
                    <div
                      key={idx}
                      className="min-h-[90px] p-1.5 transition-colors"
                      style={{
                        borderRight: (idx + 1) % 5 !== 0 ? "1px solid var(--border)" : undefined,
                        borderBottom: idx < 25 ? "1px solid var(--border)" : undefined,
                        background: isToday ? "rgba(129,140,248,0.04)" : "transparent",
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(key)}
                    >
                      <span
                        className="text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1"
                        style={{
                          color: isToday ? "white" : "var(--text-secondary)",
                          background: isToday ? "var(--accent)" : "transparent",
                        }}
                      >
                        {cell.date.getDate()}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {dayPosts.slice(0, 3).map((post) => {
                          const tc = TYPE_COLORS[post.postType] || TYPE_COLORS.story;
                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); handleDragStart(post); }}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedPost(post)}
                              className="text-[9px] font-medium px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                              style={{ background: tc.bg, color: tc.color, borderLeft: `2px solid ${tc.color}` }}
                            >
                              <span className="truncate block">{post.hook?.slice(0, 15) || "Post"}</span>
                            </div>
                          );
                        })}
                        {dayPosts.length > 3 && (
                          <span className="text-[8px] px-0.5" style={{ color: "var(--text-muted)" }}>+{dayPosts.length - 3}</span>
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset((w) => w - 1)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Week of {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <button onClick={() => setWeekOffset((w) => w + 1)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
              {weekDates.map((date) => {
                const key = dateKey(date);
                const dayPosts = postsByDate[key] || [];
                const dow = date.getDay();
                const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                const isToday = key === dateKey(new Date());

                return (
                  <div
                    key={key}
                    className="rounded-xl p-3"
                    style={{
                      background: isToday ? "rgba(129,140,248,0.06)" : "var(--bg-secondary)",
                      border: isToday ? "1px solid var(--accent)" : "1px solid var(--border)",
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(key)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        {dayNames[dow]} {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                        {dayPosts.length} posts
                      </span>
                    </div>
                    {dayPosts.length === 0 ? (
                      <p className="text-[11px] py-1" style={{ color: "var(--text-muted)" }}>Drop content here to schedule</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {dayPosts.map((post) => {
                          const tc = TYPE_COLORS[post.postType] || TYPE_COLORS.story;
                          return (
                            <div
                              key={post.id}
                              onClick={() => setSelectedPost(post)}
                              className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80"
                              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
                            >
                              <span className="text-sm">{tc.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{post.hook}</p>
                                <span className="text-[9px] capitalize" style={{ color: tc.color }}>{post.postType?.replace("_", " ")}</span>
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: post.viralityScore >= 80 ? "#34D399" : post.viralityScore >= 60 ? "var(--accent)" : "var(--text-muted)" }}>
                                {post.viralityScore}/100
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={STATUS_STYLES[post.status] || STATUS_STYLES.draft}>
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

          {!loading && filteredPosts.length === 0 && (
            <div className="rounded-xl px-4 py-12 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>No content yet</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Generate posts in a project, then they will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide-in Detail Panel */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSelectedPost(null)}>
          <div
            className="w-full max-w-md h-full overflow-y-auto p-5 animate-slide-in"
            style={{ background: "var(--bg-primary)", borderLeft: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Content Details</h3>
              <button onClick={() => setSelectedPost(null)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Type + Status */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: (TYPE_COLORS[selectedPost.postType] || TYPE_COLORS.story).bg }}>
                  {(TYPE_COLORS[selectedPost.postType] || TYPE_COLORS.story).icon}
                </div>
                <span className="text-[11px] font-medium capitalize" style={{ color: (TYPE_COLORS[selectedPost.postType] || TYPE_COLORS.story).color }}>
                  {selectedPost.postType?.replace("_", " ")}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={STATUS_STYLES[selectedPost.status] || STATUS_STYLES.draft}>
                  {selectedPost.status}
                </span>
              </div>

              {/* Status Timeline */}
              <div className="rounded-lg p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <span className="text-[10px] font-medium block mb-2" style={{ color: "var(--text-muted)" }}>Status Timeline</span>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Created: {formatRelativeDate(selectedPost.createdAt)}</span>
                  </div>
                  {selectedPost.scheduledDate && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#60A5FA" }} />
                      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                        Scheduled: {new Date(selectedPost.scheduledDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </div>
                  )}
                  {selectedPost.publishedAt && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#818CF8" }} />
                      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Published: {formatRelativeDate(selectedPost.publishedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Virality", value: selectedPost.viralityScore, color: selectedPost.viralityScore >= 80 ? "#34D399" : selectedPost.viralityScore >= 60 ? "var(--accent)" : "var(--text-muted)" },
                  { label: "Authority", value: selectedPost.authorityScore, color: selectedPost.authorityScore >= 70 ? "#34D399" : "var(--accent)" },
                  { label: "Readability", value: selectedPost.readabilityScore, color: selectedPost.readabilityScore >= 70 ? "#34D399" : "var(--accent)" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                    <span className="text-lg font-bold block" style={{ color: s.color }}>{s.value}</span>
                    <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Hook */}
              <div>
                <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Hook</span>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{selectedPost.hook}</p>
              </div>

              {/* Body */}
              <div>
                <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Content</span>
                <div className="text-[11px] leading-relaxed p-3 rounded-lg max-h-[180px] overflow-y-auto whitespace-pre-wrap" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {selectedPost.body || "No content"}
                </div>
              </div>

              {/* Project */}
              <div>
                <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Project</span>
                <a href={`/projects/${selectedPost.projectId}`} className="text-[11px] underline" style={{ color: "var(--accent)" }}>
                  {selectedPost.projectTitle}
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Actions</span>
                <div className="flex gap-2 flex-wrap">
                  {selectedPost.status !== "published" && (
                    <>
                      {selectedPost.status === "draft" && (
                        <button onClick={() => handleStatusChange(selectedPost, "scheduled")} className="text-[10px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}>
                          Mark Scheduled
                        </button>
                      )}
                      <button onClick={() => handleStatusChange(selectedPost, "published")} className="text-[10px] font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(129,140,248,0.15)", color: "#818CF8" }}>
                        Mark Published
                      </button>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Reschedule</label>
                  <input
                    type="date"
                    value={selectedPost.scheduledDate ? dateKey(new Date(selectedPost.scheduledDate)) : ""}
                    onChange={(e) => { if (e.target.value) handleReschedule(selectedPost, e.target.value); }}
                    className="text-[11px] px-2 py-1 rounded-lg w-full"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  />
                </div>
                <button
                  onClick={() => { if (confirm("Delete this content?")) handleDelete(selectedPost); }}
                  className="text-[10px] font-medium px-3 py-1.5 rounded-lg mt-1"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}
                >
                  Delete Content
                </button>
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
