"use client";

import { use, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { CarouselSlide } from "@/lib/types";
import dynamic from "next/dynamic";

const CarouselEditor = dynamic(() => import("@/components/CarouselEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading editor...</p>
      </div>
    </div>
  ),
});

async function fetchProject(projectId: string): Promise<{ title: string; transcript: string } | null> {
  try {
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const res = await fetch(`/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const project = data.project;
    return { title: project.title, transcript: project.raw_transcript };
  } catch {
    return null;
  }
}

async function generateSlides(transcript: string, projectId: string): Promise<CarouselSlide[]> {
  const supabase = getSupabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

  const res = await fetch("/api/generate-carousel", {
    method: "POST",
    headers,
    body: JSON.stringify({
      videoInfo: {
        title: "Carousel",
        description: "",
        transcript,
        url: "",
        videoId: "",
      },
    }),
  });

  if (!res.ok) throw new Error("Carousel generation failed");
  const data = await res.json();
  return data.slides || [];
}

function EditorPageContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [title, setTitle] = useState("Carousel");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadAndGenerate = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const project = await fetchProject(projectId);
      if (!project) {
        setError("Project not found");
        return;
      }

      setTitle(project.title);

      if (!project.transcript || project.transcript.length < 100) {
        setError("Transcript is too short to generate a carousel");
        return;
      }

      setGenerating(true);
      const generated = await generateSlides(project.transcript, projectId);
      if (generated.length > 0) {
        setSlides(generated);
      } else {
        setError("Failed to generate carousel slides");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [projectId]);

  // Auto-load on mount
  useState(() => {
    loadAndGenerate();
  });

  if (loading || generating) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              {generating ? "Generating your carousel..." : "Loading project..."}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {generating ? "AI is creating your slides" : "Fetching transcript"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center max-w-sm">
          <p className="text-sm mb-4" style={{ color: "var(--error)" }}>{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => router.back()}
              className="text-xs font-medium px-4 py-2 rounded-lg"
              style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Go Back
            </button>
            <button
              onClick={loadAndGenerate}
              className="text-xs font-medium px-4 py-2 rounded-lg"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No slides generated</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      <div
        className="flex items-center gap-3 px-4 border-b shrink-0"
        style={{ height: 44, background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-lg transition-colors shrink-0"
          style={{
            width: 32,
            height: 32,
            color: "var(--text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{title}</span>
      </div>
      <div className="flex-1 min-h-0">
        <CarouselEditor
          initialSlides={slides}
          projectTitle={title}
          onExport={() => {}}
        />
      </div>
    </div>
  );
}

export default function CarouselEditorPage() {
  const params = useParams();
  const projectId = params.id as string;

  return <EditorPageContent projectId={projectId} />;
}
