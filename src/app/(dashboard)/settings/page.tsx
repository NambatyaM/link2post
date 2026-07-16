"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Tab = "profile" | "voice" | "billing";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "voice", label: "Voice Profile" },
  { id: "billing", label: "Billing" },
];

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  linkedinUrl: string;
}

interface VoiceData {
  tone: string[];
  personality: string;
  vocabulary: string[];
  sentenceLength: string;
  ctaStyle: string;
  storytellingStyle: string;
  contentPillars: string[];
  targetAudience: string;
  formattingStyle: string[];
  commonPhrases: string[];
  favoriteEmojis: string[];
}

const MOCK_VOICE: VoiceData = {
  tone: ["Conversational", "Authoritative", "Empathetic"],
  personality: "A natural storyteller who blends personal experience with actionable insights. Writes with warmth but isn't afraid to be direct.",
  vocabulary: ["Jargon-free", "Direct", "Storytelling", "Data-informed"],
  sentenceLength: "medium",
  ctaStyle: "Ends with thought-provoking questions that invite genuine debate, never generic engagement bait.",
  storytellingStyle: "First-person narrative with personal anecdotes, specific numbers, and named examples.",
  contentPillars: ["Leadership lessons", "Startup failures", "AI trends", "Team building"],
  targetAudience: "Founders and CTOs at 10-100 person SaaS companies",
  formattingStyle: ["1-2 sentences per paragraph", "Line breaks between thoughts", "Starts with a hook question", "Uses bullet points for lists"],
  commonPhrases: ["Here's what I learned", "The truth is", "I used to think...", "Let me explain"],
  favoriteEmojis: ["💡", "🔥", "🚀", "✅"],
};

const PLANS = [
  { name: "Free", price: "$0", features: ["5 projects/month", "Basic templates", "Standard AI"], current: true },
  { name: "Pro", price: "$29/mo", features: ["Unlimited projects", "Voice profiling", "Priority AI", "Calendar scheduling"], current: false },
  { name: "Business", price: "$99/mo", features: ["Team seats", "Custom branding", "API access", "Dedicated support"], current: false },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile>({ firstName: "", lastName: "", email: "", linkedinUrl: "" });
  const [voice, setVoice] = useState<VoiceData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [projectsUsed] = useState(3);
  const [projectsLimit] = useState(5);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Try loading brand voice from localStorage first (set during onboarding)
        const savedVoice = localStorage.getItem("link2post_brand_voice");
        if (savedVoice) {
          try {
            setVoice(JSON.parse(savedVoice));
          } catch { /* ignore */ }
        }

        const res = await fetch("/api/settings/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: session.user.email || "",
            linkedinUrl: data.linkedinUrl || "",
          });
          // DB voice profile takes precedence over localStorage
          if (data.voiceProfile) {
            setVoice(data.voiceProfile);
          }
        } else {
          setProfile((prev) => ({ ...prev, email: session.user.email || "" }));
        }
      } catch {
        if (!voice) setVoice(MOCK_VOICE);
      }
    }

    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [saved]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          linkedinUrl: profile.linkedinUrl,
        }),
      });

      setSaved(true);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  const handleRetrain = () => {
    router.push("/onboarding");
  };

  return (
    <main className="min-h-screen px-6 py-10 max-w-[800px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Manage your account and preferences
        </p>
      </div>

      <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      <div
        className="rounded-xl p-6"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        {activeTab === "profile" && (
          <div className="flex flex-col gap-5 max-w-md">
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Profile
            </h3>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  First name
                </label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                  className="input-field w-full text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Last name
                </label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                  className="input-field w-full text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="input-field w-full text-sm opacity-60 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-muted)" }}>
                LinkedIn URL
              </label>
              <input
                type="url"
                value={profile.linkedinUrl}
                onChange={(e) => setProfile((p) => ({ ...p, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/yourname"
                className="input-field w-full text-sm"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-primary self-start text-sm"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
            </button>
          </div>
        )}

        {activeTab === "voice" && (
          <div className="flex flex-col gap-5">
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Brand Voice Profile
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Your AI-analyzed writing style. Every piece of content is generated to match this voice.
            </p>

            <div className="flex flex-col gap-5">
              {/* Tone */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                  Tone
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(voice?.tone || []).map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(129,140,248,0.12)", color: "var(--accent)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Personality */}
              {voice?.personality && (
                <div>
                  <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                    Personality
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {voice.personality}
                  </p>
                </div>
              )}

              {/* Vocabulary */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                  Vocabulary
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(voice?.vocabulary || []).map((v) => (
                    <span
                      key={v}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sentence Length */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                  Sentence Length
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  {voice?.sentenceLength || "—"}
                </span>
              </div>

              {/* CTA Style */}
              {voice?.ctaStyle && (
                <div>
                  <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                    CTA Style
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {voice.ctaStyle}
                  </p>
                </div>
              )}

              {/* Storytelling Style */}
              {voice?.storytellingStyle && (
                <div>
                  <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                    Storytelling Style
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {voice.storytellingStyle}
                  </p>
                </div>
              )}

              {/* Content Pillars */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                  Content Pillars
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(voice?.contentPillars || []).map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "rgba(16,185,129,0.12)", color: "var(--success)" }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              {voice?.targetAudience && (
                <div>
                  <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                    Target Audience
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {voice.targetAudience}
                  </p>
                </div>
              )}

              {/* Formatting Style */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                  Formatting Style
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(voice?.formattingStyle || []).map((f) => (
                    <span
                      key={f}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Common Phrases */}
              <div>
                <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                  Common Phrases
                </span>
                <div className="flex flex-col gap-1.5">
                  {(voice?.commonPhrases || []).map((p) => (
                    <span
                      key={p}
                      className="text-sm italic"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      &ldquo;{p}&rdquo;
                    </span>
                  ))}
                </div>
              </div>

              {/* Favorite Emojis */}
              {(voice?.favoriteEmojis?.length ?? 0) > 0 && (
                <div>
                  <span className="text-xs font-medium block mb-2" style={{ color: "var(--text-muted)" }}>
                    Favorite Emojis
                  </span>
                  <div className="flex gap-2">
                    {(voice?.favoriteEmojis || []).map((e) => (
                      <span key={e} className="text-xl">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => router.push("/onboarding")}
                className="btn-secondary text-sm"
              >
                Re-do Onboarding
              </button>
              <button
                onClick={handleRetrain}
                className="btn-secondary text-sm"
              >
                Re-train Voice
              </button>
            </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="flex flex-col gap-5">
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Billing
            </h3>

            <div
              className="rounded-lg p-4 flex items-center justify-between"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
            >
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Current Plan
                </span>
                <span className="text-sm ml-2" style={{ color: "var(--accent)" }}>
                  Free
                </span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {projectsUsed} / {projectsLimit} projects used
              </span>
            </div>

            <div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: "var(--accent)",
                    width: `${Math.min((projectsUsed / projectsLimit) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {projectsLimit - projectsUsed} projects remaining this month
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className="rounded-lg p-4 flex flex-col gap-3"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: `1px solid ${plan.current ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {plan.name}
                    </span>
                    <span className="text-sm ml-2 font-bold" style={{ color: "var(--text-primary)" }}>
                      {plan.price}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.current ? (
                    <span
                      className="text-xs text-center py-1.5 rounded-md font-medium"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
                    >
                      Current
                    </span>
                  ) : (
                    <button
                      onClick={() => router.push("/beta")}
                      className="text-xs text-center py-1.5 rounded-md font-medium transition-colors"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
