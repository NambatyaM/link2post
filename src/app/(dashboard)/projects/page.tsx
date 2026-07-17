"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { Project } from "@/lib/types";

interface ProjectRow extends Project {
  postCount: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return { bg: "rgba(16, 185, 129, 0.15)", text: "var(--success)" };
    case "processing":
      return { bg: "rgba(129, 140, 248, 0.15)", text: "var(--accent)" };
    case "failed":
      return { bg: "rgba(239, 68, 68, 0.15)", text: "var(--error)" };
    default:
      return { bg: "var(--bg-tertiary)", text: "var(--text-muted)" };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-lg px-5 py-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-4 w-48 rounded" style={{ background: "var(--bg-tertiary)" }} />
        <div className="h-3 w-32 rounded" style={{ background: "var(--bg-tertiary)" }} />
      </div>
      <div className="h-5 w-20 rounded-full" style={{ background: "var(--bg-tertiary)" }} />
      <div className="h-3 w-20 rounded" style={{ background: "var(--bg-tertiary)" }} />
      <div className="h-3 w-12 rounded" style={{ background: "var(--bg-tertiary)" }} />
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDelete = useCallback(async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project and all its posts?")) return;
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setProjects([]);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/projects", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        setProjects(data.projects || []);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  return (
    <main className="min-h-screen px-6 py-10 max-w-[1080px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Projects
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            All your content generation projects
          </p>
        </div>
        <button
          onClick={() => router.push("/projects/new")}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl px-4 py-16 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-40">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            No projects yet
          </p>
          <button
            onClick={() => router.push("/projects/new")}
            className="btn-primary text-sm inline-flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create your first project
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="hidden sm:flex items-center gap-4 px-5 py-2">
            <span className="flex-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Title</span>
            <span className="w-28 text-[11px] font-medium uppercase tracking-wider text-center" style={{ color: "var(--text-muted)" }}>Status</span>
            <span className="w-24 text-[11px] font-medium uppercase tracking-wider text-center" style={{ color: "var(--text-muted)" }}>Created</span>
            <span className="w-12 text-[11px] font-medium uppercase tracking-wider text-center" style={{ color: "var(--text-muted)" }}>Posts</span>
          </div>
          {projects.map((project) => {
            const statusStyle = getStatusColor(project.status);
            return (
              <div
                key={project.id}
                className="flex items-center gap-4 rounded-lg px-5 py-4 transition-colors"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", cursor: "pointer" }}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {project.title}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {project.rawTranscript.slice(0, 80)}...
                  </p>
                </div>
                <span
                  className="w-28 text-[11px] font-medium px-2.5 py-1 rounded-full text-center capitalize shrink-0"
                  style={{ background: statusStyle.bg, color: statusStyle.text }}
                >
                  {project.status}
                </span>
                <span className="w-24 text-xs text-center shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(project.createdAt)}
                </span>
                <span className="w-12 text-sm font-medium text-center shrink-0" style={{ color: "var(--text-primary)" }}>
                  {project.postCount}
                </span>
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="shrink-0 p-1.5 rounded-md transition-colors hover:opacity-80"
                  style={{ color: "var(--text-muted)" }}
                  title="Delete project"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
