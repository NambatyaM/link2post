"use client";

import { use, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { Project, LinkedInPost } from "@/lib/types";
import PostEditor from "@/components/features/PostEditor";
import ExportToolbar from "@/components/features/ExportToolbar";

interface ProjectDetail extends Project {
  posts: LinkedInPost[];
}

async function fetchProjectData(projectId: string): Promise<ProjectDetail | null> {
  try {
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    const res = await fetch(`/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch");

    const data = await res.json();
    return data.project as ProjectDetail;
  } catch {
    return null;
  }
}

function ProjectContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = use(fetchProjectData(projectId));
  const [posts, setPosts] = useState<LinkedInPost[]>(() => project?.posts ?? []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    (project?.posts?.length ?? 0) > 0 ? 0 : null
  );
  const [saveMessage, setSaveMessage] = useState("");

  const handleUpdatePost = useCallback((index: number, updated: LinkedInPost) => {
    setPosts((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!project) return;
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ posts }),
      });

      setSaveMessage("Draft saved");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch {
      setSaveMessage("Failed to save");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  }, [project, projectId, posts]);

  const handleApprove = useCallback(async (index: number) => {
    if (!project) return;
    const post = posts[index];
    if (!post) return;

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          posts: posts.map((p, i) => (i === index ? { ...p, status: "approved" } : p)),
        }),
      });

      setPosts((prev) =>
        prev.map((p, i) => (i === index ? { ...p, status: "approved" as const } : p))
      );

      setSaveMessage("Post approved & scheduled");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch {
      setSaveMessage("Failed to approve");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  }, [project, projectId, posts]);

  const handleDiscard = useCallback(() => {
    if (selectedIndex === null) return;
    setPosts((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      if (prev >= posts.length - 1) return Math.max(0, posts.length - 2);
      return prev;
    });
  }, [selectedIndex, posts.length]);

  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Project not found</p>
          <button onClick={() => router.push("/projects")} className="btn-primary text-sm">
            Back to Projects
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-primary)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/projects")}
            className="text-xs font-medium shrink-0 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Projects
          </button>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {project.title}
          </span>
        </div>
        {saveMessage && (
          <span
            className="text-xs font-medium animate-fade"
            style={{ color: saveMessage.includes("Failed") ? "var(--error)" : "var(--success)" }}
          >
            {saveMessage}
          </span>
        )}
        <ExportToolbar project={project} posts={posts} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className="w-[30%] min-w-[260px] max-w-[360px] overflow-y-auto p-3 shrink-0"
          style={{ borderRight: "1px solid var(--border)", background: "var(--bg-primary)" }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Generated Posts ({posts.length})
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-lg px-4 py-8 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No posts generated yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {posts.map((post, index) => {
                const isSelected = selectedIndex === index;
                const score = post.viralityScore ?? 0;
                const scoreColor =
                  score >= 80 ? "var(--success)" : score >= 60 ? "var(--accent)" : "var(--text-muted)";

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className="w-full text-left rounded-lg px-3 py-3 transition-all"
                    style={{
                      background: isSelected ? "var(--bg-tertiary)" : "transparent",
                      border: `1px solid ${isSelected ? "var(--border)" : "transparent"}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
                      >
                        #{index + 1}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: `${scoreColor}15`, color: scoreColor }}
                      >
                        {score}
                      </span>
                    </div>
                    <p
                      className="text-xs font-medium line-clamp-2 leading-relaxed"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {post.hook || "Untitled post"}
                    </p>
                    <p
                      className="text-[11px] mt-1 line-clamp-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {post.body.slice(0, 100)}...
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-primary)" }}>
          {selectedIndex !== null && posts[selectedIndex] ? (
            <PostEditor
              key={selectedIndex}
              post={posts[selectedIndex]}
              index={selectedIndex}
              onUpdate={handleUpdatePost}
              onSave={handleSave}
              onApprove={() => handleApprove(selectedIndex)}
              onDiscard={handleDiscard}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Select a post to edit
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading project...</p>
      </div>
    </main>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ProjectContent projectId={projectId} />
    </Suspense>
  );
}
