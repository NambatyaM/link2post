"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { Project } from "@/lib/types";

interface ProjectWithPosts extends Project {
  postCount: number;
  draftCount: number;
  scheduledCount: number;
  publishedCount: number;
}

function SkeletonCard() {
  return <div className="rounded-xl p-5 skeleton" style={{ height: 100 }} />;
}

function SkeletonActivity() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg px-4 py-3 skeleton" style={{ height: 56 }} />
      ))}
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return { bg: "rgba(52, 211, 153, 0.12)", text: "var(--success)" };
    case "processing": return { bg: "var(--accent-muted)", text: "var(--accent)" };
    case "failed": return { bg: "rgba(248, 113, 113, 0.12)", text: "var(--error)" };
    default: return { bg: "var(--bg-tertiary)", text: "var(--text-muted)" };
  }
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface PostScore {
  viralityScore: number;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } }
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithPosts[]>([]);
  const [allPosts, setAllPosts] = useState<PostScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setProjects([]); setLoading(false); return; }

        const res = await fetch("/api/projects?include=posts", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        setProjects(data.projects || []);
        setAllPosts(data.posts || []);
      } catch {
        setError("Could not load projects");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const totalPosts = projects.reduce((sum, p) => sum + p.postCount, 0);
  const totalDraft = projects.reduce((sum, p) => sum + p.draftCount, 0);
  const totalScheduled = projects.reduce((sum, p) => sum + p.scheduledCount, 0);
  const totalPublished = projects.reduce((sum, p) => sum + p.publishedCount, 0);
  const avgVirality = allPosts.length > 0
    ? Math.round(allPosts.reduce((sum, p) => sum + (p.viralityScore || 0), 0) / allPosts.length)
    : 0;

  return (
    <main className="min-h-screen px-6 py-10 max-w-[1080px] mx-auto">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Your LinkedIn content at a glance</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate={loading ? "hidden" : "show"}
      >
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <motion.div variants={itemVariants} className="rounded-xl p-5 glow-on-hover" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Content Generated</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{totalPosts}</p>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-xl p-5 glow-on-hover" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Content Pipeline</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>{totalDraft}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>draft</span>
                </div>
                <span className="text-lg" style={{ color: "var(--text-muted)" }}>{"\u2192"}</span>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold" style={{ color: "#60A5FA" }}>{totalScheduled}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>scheduled</span>
                </div>
                <span className="text-lg" style={{ color: "var(--text-muted)" }}>{"\u2192"}</span>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold" style={{ color: "#818CF8" }}>{totalPublished}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>published</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-xl p-5 glow-on-hover" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Avg Virality Score</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: avgVirality >= 75 ? "var(--success)" : "var(--accent)" }}>{avgVirality}</p>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-xl p-5 glow-on-hover" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Projects</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{projects.length}</p>
            </motion.div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Link
          href="/projects/new"
          className="block w-full rounded-2xl text-center font-semibold text-base transition-all glow-on-hover"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--purple, #A855F7))",
            color: "white",
            minHeight: "128px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 24px rgba(129,140,248,0.2)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Project</span>
          <span className="text-xs font-normal opacity-70">Paste a transcript to generate LinkedIn content</span>
        </Link>
      </motion.div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Recent Activity</h2>
          {projects.length > 0 && (
            <Link href="/projects" className="text-xs font-medium transition-colors hover:text-[var(--accent-hover)]" style={{ color: "var(--accent)" }}>
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <SkeletonActivity />
        ) : error ? (
          <div className="rounded-xl px-4 py-8 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            className="rounded-xl px-4 py-10 text-center"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No projects yet. Paste your first transcript to get started.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col gap-1.5"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {projects.slice(0, 5).map((project) => {
              const statusStyle = getStatusColor(project.status);
              return (
                <motion.div key={project.id} variants={itemVariants}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-xl px-4 py-3.5 glow-on-hover"
                    style={{ background: "var(--bg-tertiary)", border: "1px solid transparent" }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {project.title}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {project.postCount} pieces &middot; {timeAgo(project.createdAt)}
                        {project.draftCount > 0 && ` \u00b7 ${project.draftCount} draft`}
                        {project.scheduledCount > 0 && ` \u00b7 ${project.scheduledCount} scheduled`}
                        {project.publishedCount > 0 && ` \u00b7 ${project.publishedCount} published`}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ml-3 capitalize"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      {project.status}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </main>
  );
}
