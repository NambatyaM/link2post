export interface CarouselTemplate {
  id: string;
  name: string;
  colors: {
    background: string;
    title: string;
    body: string;
    accent: string;
    accentText: string;
    progress: string;
    progressBg: string;
  };
  font: string;
}

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: "midnight",
    name: "Midnight",
    colors: {
      background: "#1a1a2e",
      title: "#ffffff",
      body: "rgba(255,255,255,0.75)",
      accent: "#6366f1",
      accentText: "#ffffff",
      progress: "#6366f1",
      progressBg: "rgba(255,255,255,0.1)",
    },
    font: "system-ui, -apple-system, sans-serif",
  },
  {
    id: "slate",
    name: "Slate",
    colors: {
      background: "#0f172a",
      title: "#f8fafc",
      body: "rgba(248,250,252,0.7)",
      accent: "#3b82f6",
      accentText: "#ffffff",
      progress: "#3b82f6",
      progressBg: "rgba(255,255,255,0.08)",
    },
    font: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "warm",
    name: "Warm",
    colors: {
      background: "#1c1917",
      title: "#fafaf9",
      body: "rgba(250,250,249,0.7)",
      accent: "#f59e0b",
      accentText: "#1c1917",
      progress: "#f59e0b",
      progressBg: "rgba(255,255,255,0.08)",
    },
    font: "system-ui, -apple-system, sans-serif",
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      background: "#0c1222",
      title: "#e2e8f0",
      body: "rgba(226,232,240,0.7)",
      accent: "#06b6d4",
      accentText: "#ffffff",
      progress: "#06b6d4",
      progressBg: "rgba(255,255,255,0.08)",
    },
    font: "'Courier New', monospace",
  },
  {
    id: "minimal",
    name: "Clean",
    colors: {
      background: "#ffffff",
      title: "#111827",
      body: "#4b5563",
      accent: "#2563eb",
      accentText: "#ffffff",
      progress: "#2563eb",
      progressBg: "#e5e7eb",
    },
    font: "system-ui, -apple-system, sans-serif",
  },
];

export const CAROUSEL_FORMATS = [
  { id: "square", label: "Square", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait", width: 1080, height: 1350 },
] as const;

export type CarouselFormat = (typeof CAROUSEL_FORMATS)[number];
