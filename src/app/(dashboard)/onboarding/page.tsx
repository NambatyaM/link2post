"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NICHE_OPTIONS } from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { BrandVoiceProfile, ContentInputType } from "@/lib/types";
import { parseLinkedInCSV } from "@/services/linkedin/csv-parser";
import { readFileAsText, isValidCSVFile } from "@/lib/csv-utils";

const STORAGE_KEY = "link2post_onboarding";
const VOICE_PROFILE_KEY = "link2post_brand_voice";
const VOICE_PROMPT_KEY = "link2post_voice_prompt";

const CONTENT_TABS: { key: ContentInputType; label: string }[] = [
  { key: "youtube_transcript", label: "Transcript" },
  { key: "podcast_transcript", label: "Podcast Transcript" },
  { key: "blog", label: "Blog Post" },
  { key: "linkedin_posts", label: "LinkedIn Posts" },
  { key: "website", label: "Website Content" },
];

const CONTENT_HELPERS: Record<ContentInputType, string> = {
  youtube_transcript:
    "The longer the transcript, the better we can learn your voice. Aim for 2,000+ words.",
  podcast_transcript:
    "The longer the transcript, the better we can learn your voice. Aim for 2,000+ words.",
  blog: "Paste your best-performing content. 1,000+ words recommended.",
  linkedin_posts:
    "Separate each post with --- (three dashes on its own line). The more posts, the more accurate your voice profile.",
  website: "Paste your best-performing content. 1,000+ words recommended.",
  other: "",
};

const PLACEHOLDERS: Record<ContentInputType, string> = {
  youtube_transcript: "Paste a transcript from a video, talk, or any spoken content...",
  podcast_transcript: "Paste a podcast transcript...",
  blog: "Paste a blog post or article...",
  linkedin_posts: "Paste 5-10 of your LinkedIn posts separated by ---",
  website: "Paste content from your website, about page, or sales pages...",
  other: "",
};

const ANALYSIS_MESSAGES = [
  "Reading your content...",
  "Identifying your tone and personality...",
  "Mapping your vocabulary and phrasing...",
  "Building your content pillars...",
  "Creating your Brand Voice Profile...",
];

interface OnboardingData {
  firstName: string;
  niche: string;
  targetAudience: string;
  completed: boolean;
}

function loadSaved(): OnboardingData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Spinner() {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="w-16 h-16 rounded-full animate-spin-slow"
        style={{
          border: "3px solid var(--bg-tertiary)",
          borderTopColor: "var(--accent)",
        }}
      />
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute"
      >
        <path d="M12 2a10 10 0 0 1 10 10" opacity="0.3" />
      </svg>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [niche, setNiche] = useState(NICHE_OPTIONS[0]);
  const [targetAudience, setTargetAudience] = useState("");
  const [activeTab, setActiveTab] = useState<ContentInputType>("youtube_transcript");
  const [contentInputs, setContentInputs] = useState<Record<ContentInputType, string>>({
    youtube_transcript: "",
    podcast_transcript: "",
    blog: "",
    linkedin_posts: "",
    website: "",
    other: "",
  });
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<BrandVoiceProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<BrandVoiceProfile | null>(null);

  useEffect(() => {
    const saved = loadSaved();
    if (saved?.completed) {
      router.replace("/projects/new");
      return;
    }
    if (saved?.firstName) setFirstName(saved.firstName);
    if (saved?.niche) setNiche(saved.niche);
    if (saved?.targetAudience) setTargetAudience(saved.targetAudience);
  }, [router]);

  const saveData = useCallback(
    (overrides?: Partial<OnboardingData>) => {
      const data: OnboardingData = {
        firstName: overrides?.firstName ?? firstName,
        niche: overrides?.niche ?? niche,
        targetAudience: overrides?.targetAudience ?? targetAudience,
        completed: overrides?.completed ?? false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },
    [firstName, niche, targetAudience],
  );

  const getActiveContent = useCallback(() => {
    return contentInputs[activeTab] || csvContent;
  }, [contentInputs, activeTab, csvContent]);

  const hasAnyContent = Object.values(contentInputs).some((v) => v.trim().length > 0) || csvContent.length > 0;

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return firstName.trim().length > 0;
      case 1:
        return hasAnyContent;
      case 2:
        return false;
      case 3:
        return !!voiceProfile;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleContentChange = (value: string) => {
    setContentInputs((prev) => ({ ...prev, [activeTab]: value }));
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isValidCSVFile(file)) return;
    try {
      const text = await readFileAsText(file);
      const parsed = parseLinkedInCSV(text);
      setCsvFileName(file.name);
      setCsvContent(parsed);
      setActiveTab("linkedin_posts");
      setContentInputs((prev) => ({
        ...prev,
        linkedin_posts: parsed,
      }));
    } catch {
      setAnalysisError("Failed to read CSV file. Please try again.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeCSV = () => {
    setCsvFileName(null);
    setCsvContent("");
    setContentInputs((prev) => ({ ...prev, linkedin_posts: "" }));
  };

  const runAnalysis = async () => {
    setStep(2);
    setProgress(0);
    setAnalysisStepIdx(0);
    setAnalysisError(null);

    let progressVal = 0;
    const progressInterval = setInterval(() => {
      progressVal += Math.random() * 8 + 2;
      const stepIdx = Math.min(Math.floor(progressVal / 20), ANALYSIS_MESSAGES.length - 1);
      setAnalysisStepIdx(stepIdx);
      setProgress(Math.min(progressVal, 95));
      if (progressVal >= 95) clearInterval(progressInterval);
    }, 400);

    try {
      const content = getActiveContent();
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/brand-voice/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ content, contentType: activeTab }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const profile: BrandVoiceProfile = await res.json();
      clearInterval(progressInterval);
      setProgress(100);
      setAnalysisStepIdx(ANALYSIS_MESSAGES.length - 1);

      localStorage.setItem(VOICE_PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(VOICE_PROMPT_KEY, profile.voicePrompt || "");

      setTimeout(() => {
        setVoiceProfile(profile);
        setEditDraft(profile);
        setStep(3);
      }, 600);
    } catch (err) {
      clearInterval(progressInterval);
      setAnalysisError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
  };

  const handleNext = () => {
    if (step === 0) {
      saveData({ completed: false });
      setStep(1);
    } else if (step === 1) {
      runAnalysis();
    } else if (step === 3) {
      setIsEditing(false);
      setStep(4);
    } else if (step === 4) {
      saveData({ completed: true });
      router.push("/projects/new");
    }
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
    else if (step === 3) setStep(1);
  };

  const handleSaveEdit = () => {
    if (!editDraft) return;
    setVoiceProfile(editDraft);
    localStorage.setItem(VOICE_PROFILE_KEY, JSON.stringify(editDraft));
    localStorage.setItem(VOICE_PROMPT_KEY, editDraft.voicePrompt || "");
    setIsEditing(false);
  };

  const renderVoiceProfileCard = (profile: BrandVoiceProfile, editing: boolean) => {
    const draft = editDraft || profile;

    const updateDraft = (field: keyof BrandVoiceProfile, value: unknown) => {
      setEditDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: value };
      });
    };

    const updateArrayField = (field: keyof BrandVoiceProfile, index: number, value: string) => {
      setEditDraft((prev) => {
        if (!prev) return prev;
        const arr = [...(prev[field] as string[])];
        arr[index] = value;
        return { ...prev, [field]: arr };
      });
    };

    const addArrayItem = (field: keyof BrandVoiceProfile) => {
      setEditDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: [...(prev[field] as string[]), ""] };
      });
    };

    const removeArrayItem = (field: keyof BrandVoiceProfile, index: number) => {
      setEditDraft((prev) => {
        if (!prev) return prev;
        const arr = [...(prev[field] as string[])];
        arr.splice(index, 1);
        return { ...prev, [field]: arr };
      });
    };

    const PillBadges = ({ field, values }: { field: keyof BrandVoiceProfile; values: string[] }) => {
      if (editing) {
        return (
          <div className="flex flex-wrap gap-2">
            {values.map((v, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  className="input-field text-xs py-1 px-2"
                  value={v}
                  onChange={(e) => updateArrayField(field, i, e.target.value)}
                  style={{ minWidth: 80 }}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(field, i)}
                  className="text-xs"
                  style={{ color: "var(--error)" }}
                >
                  x
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem(field)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: "var(--accent)", border: "1px dashed var(--accent)" }}
            >
              + Add
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}
            >
              {v}
            </span>
          ))}
        </div>
      );
    };

    const TextField = ({
      field,
      label,
    }: {
      field: keyof BrandVoiceProfile;
      label: string;
    }) => (
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        {editing ? (
          <textarea
            className="input-field w-full text-sm resize-none"
            rows={3}
            value={(draft[field] as string) || ""}
            onChange={(e) => updateDraft(field, e.target.value)}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {(profile[field] as string) || "N/A"}
          </p>
        )}
      </div>
    );

    const SentenceLengthBadge = () => (
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Sentence Length
        </p>
        {editing ? (
          <select
            className="input-field text-sm"
            value={draft.sentenceLength}
            onChange={(e) => updateDraft("sentenceLength", e.target.value)}
          >
            <option value="short">short</option>
            <option value="medium">medium</option>
            <option value="long">long</option>
            <option value="varied">varied</option>
          </select>
        ) : (
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}
          >
            {profile.sentenceLength}
          </span>
        )}
      </div>
    );

    const PhrasesList = ({ values }: { values: string[] }) => {
      if (editing) {
        return (
          <div className="flex flex-col gap-1.5">
            {values.map((v, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  className="input-field text-xs py-1 px-2 flex-1"
                  value={v}
                  onChange={(e) => updateArrayField("commonPhrases", i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem("commonPhrases", i)}
                  className="text-xs"
                  style={{ color: "var(--error)" }}
                >
                  x
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("commonPhrases")}
              className="text-xs px-2 py-1 rounded self-start"
              style={{ color: "var(--accent)", border: "1px dashed var(--accent)" }}
            >
              + Add
            </button>
          </div>
        );
      }
      return (
        <ul className="list-disc list-inside space-y-0.5">
          {values.map((v, i) => (
            <li key={i} className="text-sm" style={{ color: "var(--text-primary)" }}>
              {v}
            </li>
          ))}
        </ul>
      );
    };

    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Tone
          </p>
          <PillBadges field="tone" values={draft.tone} />
        </div>

        <TextField field="personality" label="Personality" />

        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Vocabulary
          </p>
          <PillBadges field="vocabulary" values={draft.vocabulary} />
        </div>

        <SentenceLengthBadge />

        <TextField field="ctaStyle" label="CTA Style" />

        <TextField field="storytellingStyle" label="Storytelling Style" />

        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Content Pillars
          </p>
          <PillBadges field="contentPillars" values={draft.contentPillars} />
        </div>

        <TextField field="targetAudience" label="Target Audience" />

        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Formatting Style
          </p>
          <PillBadges field="formattingStyle" values={draft.formattingStyle} />
        </div>

        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Common Phrases
          </p>
          <PhrasesList values={draft.commonPhrases} />
        </div>

        {draft.favoriteEmojis.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Favorite Emojis
            </p>
            <PillBadges field="favoriteEmojis" values={draft.favoriteEmojis} />
          </div>
        )}
      </div>
    );
  };

  const steps = ["Tell us about yourself", "Share your content", "Analyzing your voice", "Your Brand Voice Profile", "You're all set!"];

  if (step === 2) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <Spinner />
          <div>
            <h2
              className="text-xl font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {ANALYSIS_MESSAGES[analysisStepIdx]}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Learning your voice to create content that sounds like you.
            </p>
          </div>
          <div className="w-full">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  background: "var(--accent)",
                  width: `${Math.min(progress, 100)}%`,
                }}
              />
            </div>
            <p
              className="text-xs mt-2 tabular-nums"
              style={{ color: "var(--text-muted)" }}
            >
              {Math.round(Math.min(progress, 100))}%
            </p>
          </div>
          {analysisError && (
            <div className="w-full">
              <p className="text-xs mb-3" style={{ color: "var(--error)" }}>
                {analysisError}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary text-sm flex-1">
                  Go Back
                </button>
                <button onClick={runAnalysis} className="btn-primary text-sm flex-1">
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-8"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-200"
                style={{
                  background:
                    i === step
                      ? "var(--accent)"
                      : i < step
                        ? "var(--success)"
                        : "var(--bg-tertiary)",
                }}
              />
              {i < steps.length - 1 && (
                <div
                  className="w-8 h-px"
                  style={{
                    background: i < step ? "var(--success)" : "var(--bg-tertiary)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mb-2">
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {steps[step]}
          </h2>
        </div>

        <div className="min-h-[200px] mt-6">
          {step === 0 && (
            <div className="animate-fade space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="input-field w-full"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Niche
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {NICHE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNiche(n)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors"
                      style={{
                        background: niche === n ? "var(--accent)" : "var(--bg-tertiary)",
                        color: niche === n ? "white" : "var(--text-secondary)",
                        border: `1px solid ${niche === n ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  Target audience <span style={{ color: "var(--text-muted)" }}>(optional)</span>
                </label>
                <textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Who do you write for? e.g. Founders, marketers, developers..."
                  className="input-field w-full text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade">
              <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                {CONTENT_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                    style={{
                      background: activeTab === tab.key ? "var(--accent)" : "var(--bg-tertiary)",
                      color: activeTab === tab.key ? "white" : "var(--text-secondary)",
                      border: `1px solid ${activeTab === tab.key ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                  style={{
                    border: "1px dashed var(--text-muted)",
                    color: "var(--text-muted)",
                  }}
                >
                  Upload CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCSVUpload}
                />
              </div>

              {csvFileName && (
                <div
                  className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <span style={{ color: "var(--success)" }}>CSV loaded:</span>
                  <span style={{ color: "var(--text-primary)" }}>{csvFileName}</span>
                  <button
                    type="button"
                    onClick={removeCSV}
                    className="ml-auto"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Remove
                  </button>
                </div>
              )}

              <textarea
                value={contentInputs[activeTab]}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={PLACEHOLDERS[activeTab]}
                className="input-field w-full text-sm resize-none"
                rows={8}
                style={{ minHeight: 180 }}
              />

              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                {CONTENT_HELPERS[activeTab]}
              </p>
            </div>
          )}

          {step === 3 && voiceProfile && (
            <div className="animate-fade">
              <div
                className="rounded-xl p-5 overflow-y-auto"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  maxHeight: 420,
                }}
              >
                {renderVoiceProfileCard(voiceProfile, isEditing)}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade flex flex-col items-center gap-4 py-8 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "var(--success)" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                You&apos;re all set, {firstName || "there"}!
              </h3>
              <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
                Your brand voice is locked in. Every piece of content we generate will sound like you.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          {step === 1 && (
            <button onClick={handleBack} className="btn-secondary text-sm px-4 py-2.5">
              Back
            </button>
          )}
          {step === 3 && (
            <>
              <button onClick={handleBack} className="btn-secondary text-sm px-4 py-2.5">
                Back
              </button>
              {isEditing ? (
                <button onClick={handleSaveEdit} className="btn-primary text-sm px-4 py-2.5 flex-1">
                  Save Edits
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary text-sm px-4 py-2.5"
                >
                  Edit
                </button>
              )}
            </>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canProceed() ? "var(--accent)" : "var(--bg-tertiary)",
              color: canProceed() ? "white" : "var(--text-muted)",
            }}
          >
            {step === 0
              ? "Continue"
              : step === 1
                ? "Analyze my voice"
                : step === 3
                  ? "Looks good!"
                  : "Start Creating"}
          </button>
        </div>
      </div>
    </div>
  );
}
