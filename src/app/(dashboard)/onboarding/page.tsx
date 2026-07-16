"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { NICHE_OPTIONS } from "@/lib/types";

const STORAGE_KEY = "link2post_onboarding";

interface OnboardingData {
  firstName: string;
  linkedinUrl: string;
  niche: string;
  samplePost: string;
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

function saveData(data: OnboardingData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [niche, setNiche] = useState(NICHE_OPTIONS[0]);
  const [samplePost, setSamplePost] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  // Hydrate from localStorage on mount
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrating from localStorage on mount is safe
  useEffect(() => {
    const saved = loadSaved();
    if (saved?.completed) {
      router.replace("/projects/new");
      return;
    }
    if (saved?.firstName) setFirstName(saved.firstName);
    if (saved?.linkedinUrl) setLinkedinUrl(saved.linkedinUrl);
    if (saved?.niche) setNiche(saved.niche);
    if (saved?.samplePost) setSamplePost(saved.samplePost);
  }, [router]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const steps = [
    { label: "Name", field: "firstName" },
    { label: "LinkedIn", field: "linkedinUrl" },
    { label: "Niche", field: "niche" },
  ];

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname.includes("linkedin.com") &&
        (parsed.pathname.includes("/in/") || parsed.pathname.includes("/posts/"))
      );
    } catch {
      return false;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return firstName.trim().length > 0;
      case 1:
        return linkedinUrl.trim().length > 0;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;

    if (step === 1 && !isValidUrl(linkedinUrl)) {
      setShowFallback(true);
      return;
    }

    saveData({ firstName, linkedinUrl, niche, samplePost, completed: false });

    if (step === 2) {
      setAnalyzing(true);
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              saveData({ firstName, linkedinUrl, niche, samplePost, completed: true });
              router.push("/projects/new");
            }, 400);
            return 100;
          }
          return prev + Math.random() * 12 + 3;
        });
      }, 300);
      return;
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  };

  if (analyzing) {
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
              Analyzing your LinkedIn profile...
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
        className="w-full max-w-[400px] rounded-2xl p-8"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s.field}
              className="w-2 h-2 rounded-full transition-colors duration-200"
              style={{
                background:
                  i === step
                    ? "var(--accent)"
                    : i < step
                      ? "var(--text-muted)"
                      : "var(--bg-tertiary)",
              }}
            />
          ))}
        </div>

        <div className="min-h-[180px]">
          {step === 0 && (
            <div className="animate-fade">
              <h2
                className="text-xl font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                What should we call you?
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                First name or alias — whatever feels right.
              </p>
              <input
                ref={inputRef}
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Sarah"
                className="input-field w-full text-sm"
                autoComplete="given-name"
              />
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade">
              <h2
                className="text-xl font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                What&apos;s your LinkedIn URL?
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                We use this to learn your writing style. No spam.
              </p>
              <input
                ref={inputRef}
                type="url"
                value={linkedinUrl}
                onChange={(e) => {
                  setLinkedinUrl(e.target.value);
                  setShowFallback(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://linkedin.com/in/yourname"
                className="input-field w-full text-sm"
                autoComplete="url"
              />
              {showFallback && (
                <div className="mt-4 animate-fade">
                  <p
                    className="text-xs mb-2"
                    style={{ color: "var(--error)" }}
                  >
                    Could not access that LinkedIn URL. You can paste a sample
                    post below instead.
                  </p>
                  <textarea
                    value={samplePost}
                    onChange={(e) => setSamplePost(e.target.value)}
                    placeholder="Paste one of your best LinkedIn posts here..."
                    className="input-field w-full text-sm resize-none"
                    rows={5}
                    style={{ minHeight: "100px" }}
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade">
              <h2
                className="text-xl font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Pick your niche.
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                This helps us tailor topics and hooks to your audience.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {NICHE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNiche(n)}
                    className="px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors"
                    style={{
                      background:
                        niche === n ? "var(--accent)" : "var(--bg-tertiary)",
                      color: niche === n ? "white" : "var(--text-secondary)",
                      border: `1px solid ${niche === n ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="btn-secondary text-sm px-4 py-2.5"
            >
              Back
            </button>
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
            {step === 2 ? "Start analyzing" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
