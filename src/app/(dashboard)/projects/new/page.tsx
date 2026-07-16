"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { NICHE_OPTIONS } from "@/lib/types";

const CONTENT_GOALS = [
  "Thought leadership",
  "Drive engagement",
  "Educate audience",
  "Build personal brand",
  "Generate leads",
  "Share expertise",
  "Community building",
  "Industry commentary",
];

export default function NewProjectPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [niche, setNiche] = useState(NICHE_OPTIONS[0]);
  const [audience, setAudience] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const charCount = transcript.length;
  const isValid = transcript.trim().length >= 100;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    }
  }, [transcript]);

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleGenerate = async () => {
    if (!isValid || generating) return;
    setError("");
    setGenerating(true);

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      let inputText = transcript.trim();

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim() || "Untitled Project",
          transcript: inputText,
          niche,
          audience: audience.trim(),
          goals: goals.join(", "),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create project");
      }

      const data = await res.json();
      router.push(`/projects/${data.project.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <main className="min-h-screen px-6 py-10 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          New Project
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Paste a transcript to generate LinkedIn content
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-[3] flex flex-col gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title (optional)"
            className="input-field text-sm w-full"
            disabled={generating}
          />

          <div
            className="rounded-xl overflow-hidden transition-all"
            style={{
              border: `1px solid ${error && !isValid ? "var(--error)" : "var(--border)"}`,
              background: "var(--bg-secondary)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); setError(""); }}
              placeholder="Paste your transcript here — podcasts, meetings, interviews, lectures, notes..."
              className="w-full text-sm px-5 py-4 outline-none resize-none bg-transparent leading-relaxed"
              style={{ color: "var(--text-primary)", minHeight: "240px", maxHeight: "400px" }}
              rows={10}
              disabled={generating}
              autoFocus
            />
            <div className="flex items-center justify-between px-5 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {charCount > 0 ? `${charCount.toLocaleString()} chars` : ""}
                </span>
                {wordCount > 0 && (
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    ~{wordCount.toLocaleString()} words
                  </span>
                )}
              </div>
              {!isValid && charCount > 0 && (
                <span className="text-[11px]" style={{ color: "var(--error)" }}>
                  Min 100 characters
                </span>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs px-1" style={{ color: "var(--error)" }}>{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!isValid || generating}
            className="w-full py-4 rounded-xl text-base font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.005]"
            style={{
              background: isValid ? "var(--accent)" : "var(--bg-tertiary)",
              color: isValid ? "white" : "var(--text-muted)",
            }}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                Creating Project...
              </span>
            ) : (
              "Generate Content"
            )}
          </button>
        </div>

        <div className="flex-[2] flex flex-col gap-4">
          <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Context Settings
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Niche
                </label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="input-field w-full text-sm"
                  disabled={generating}
                >
                  {NICHE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Target Audience
                </label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. SaaS founders, Marketing managers"
                  className="input-field w-full text-sm"
                  disabled={generating}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Content Goals
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_GOALS.map((goal) => {
                    const isSelected = goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        onClick={() => toggleGoal(goal)}
                        disabled={generating}
                        className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors disabled:opacity-50"
                        style={{
                          background: isSelected ? "var(--accent)" : "var(--bg-tertiary)",
                          color: isSelected ? "white" : "var(--text-muted)",
                          border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
