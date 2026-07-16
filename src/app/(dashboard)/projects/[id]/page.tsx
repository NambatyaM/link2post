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
    return { ...data.project, posts: data.posts || [] } as ProjectDetail;
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
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState("");

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

      const saveRes = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ posts }),
      });

      if (!saveRes.ok) throw new Error("Save failed");

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

      const approveRes = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          posts: posts.map((p, i) => (i === index ? { ...p, status: "approved" } : p)),
        }),
      });

      if (!approveRes.ok) throw new Error("Approve failed");

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

  const handleGenerate = useCallback(async () => {
    if (!project || generating) return;
    setGenerating(true);
    setGenerateProgress("Starting generation...");

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const voiceProfilePrompt = localStorage.getItem("link2post_voice_prompt") || "";

      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audience: project.audience,
          voiceProfilePrompt,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";
      let model = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.model) {
              model = `${parsed.provider}/${parsed.model}`;
              setGenerateProgress(`Generating with ${model}...`);
            }
            if (parsed.content) {
              accumulated += parsed.content;
              setGenerateProgress(`Generating... (${accumulated.length} chars)`);
            }
          } catch { /* skip parse errors */ }
        }
      }

      setGenerateProgress("Processing results...");

      if (accumulated) {
        let parsed: { posts?: Array<{ hook: string; body: string; imagePrompt: string; viralityScore?: number; authorityScore?: number; commentPotential?: number; readabilityScore?: number }> } | null = null;
        try { parsed = JSON.parse(accumulated); } catch {
          const jsonStart = accumulated.indexOf("{");
          const jsonEnd = accumulated.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            try { parsed = JSON.parse(accumulated.slice(jsonStart, jsonEnd + 1)); } catch { /* */ }
          }
        }

        if (parsed?.posts) {
          const newPosts: LinkedInPost[] = parsed.posts.map((post) => ({
            hook: post.hook,
            body: post.body,
            imagePrompt: post.imagePrompt,
            viralityScore: post.viralityScore ?? 0,
            authorityScore: post.authorityScore ?? 0,
            commentPotential: post.commentPotential ?? 0,
            readabilityScore: post.readabilityScore ?? 0,
            status: "draft" as const,
          }));
          setPosts(newPosts);
          if (newPosts.length > 0) setSelectedIndex(0);
        }
      }

      setGenerateProgress("");
      setSaveMessage("Content generated!");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      setGenerateProgress("");
      setSaveMessage(err instanceof Error ? err.message : "Generation failed");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setGenerating(false);
    }
  }, [project, projectId, generating]);

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
            {generating ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
                <span className="text-[10px]" style={{ color: "var(--accent)" }}>Generating...</span>
              </div>
            ) : posts.length > 0 ? (
              <button
                onClick={handleGenerate}
                className="text-[10px] font-medium px-2 py-1 rounded transition-colors"
                style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                Regenerate
              </button>
            ) : null}
          </div>

          {posts.length === 0 ? (
            <div className="rounded-lg px-4 py-8 text-center" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              {generating ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
                  <p className="text-xs" style={{ color: "var(--accent)" }}>{generateProgress}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>No posts generated yet</p>
                  <button
                    onClick={handleGenerate}
                    className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Generate Content
                  </button>
                </>
              )}
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
          {generating && generateProgress ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
              <p className="text-sm" style={{ color: "var(--accent)" }}>{generateProgress}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>This may take 15-30 seconds...</p>
            </div>
          ) : selectedIndex !== null && posts[selectedIndex] ? (
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
