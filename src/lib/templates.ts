export interface CarouselTemplate {
  id: string;
  name: string;
  category: string;
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
  borderRadius: number;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export interface FontPair {
  id: string;
  name: string;
  heading: string;
  body: string;
}

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: "midnight",
    name: "Midnight",
    category: "Modern",
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
    borderRadius: 12,
  },
  {
    id: "slate",
    name: "Slate",
    category: "Corporate",
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
    borderRadius: 8,
  },
  {
    id: "warm",
    name: "Warm",
    category: "Personal Brand",
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
    borderRadius: 16,
  },
  {
    id: "ocean",
    name: "Ocean",
    category: "Tech",
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
    borderRadius: 8,
  },
  {
    id: "clean",
    name: "Clean",
    category: "Minimal",
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
    borderRadius: 4,
  },
  {
    id: "bold",
    name: "Bold",
    category: "Bold",
    colors: {
      background: "#000000",
      title: "#ffffff",
      body: "rgba(255,255,255,0.7)",
      accent: "#ef4444",
      accentText: "#ffffff",
      progress: "#ef4444",
      progressBg: "rgba(255,255,255,0.1)",
    },
    font: "Impact, 'Arial Black', sans-serif",
    borderRadius: 0,
  },
  {
    id: "gradient",
    name: "Gradient",
    category: "Creative",
    colors: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      title: "#ffffff",
      body: "rgba(255,255,255,0.85)",
      accent: "#ffffff",
      accentText: "#764ba2",
      progress: "#ffffff",
      progressBg: "rgba(255,255,255,0.2)",
    },
    font: "system-ui, -apple-system, sans-serif",
    borderRadius: 20,
  },
  {
    id: "startup",
    name: "Startup",
    category: "Startup",
    colors: {
      background: "#0a0a0a",
      title: "#fafafa",
      body: "rgba(250,250,250,0.65)",
      accent: "#22c55e",
      accentText: "#000000",
      progress: "#22c55e",
      progressBg: "rgba(255,255,255,0.06)",
    },
    font: "system-ui, -apple-system, sans-serif",
    borderRadius: 12,
  },
  {
    id: "luxury",
    name: "Luxury",
    category: "Luxury",
    colors: {
      background: "#1a1a1a",
      title: "#d4af37",
      body: "rgba(212,175,55,0.6)",
      accent: "#d4af37",
      accentText: "#1a1a1a",
      progress: "#d4af37",
      progressBg: "rgba(212,175,55,0.1)",
    },
    font: "Georgia, 'Times New Roman', serif",
    borderRadius: 4,
  },
  {
    id: "finance",
    name: "Finance",
    category: "Finance",
    colors: {
      background: "#0f2942",
      title: "#ffffff",
      body: "rgba(255,255,255,0.7)",
      accent: "#10b981",
      accentText: "#ffffff",
      progress: "#10b981",
      progressBg: "rgba(255,255,255,0.08)",
    },
    font: "'Segoe UI', system-ui, sans-serif",
    borderRadius: 8,
  },
  {
    id: "education",
    name: "Education",
    category: "Education",
    colors: {
      background: "#fef3c7",
      title: "#1c1917",
      body: "#57534e",
      accent: "#d97706",
      accentText: "#ffffff",
      progress: "#d97706",
      progressBg: "rgba(0,0,0,0.08)",
    },
    font: "system-ui, -apple-system, sans-serif",
    borderRadius: 16,
  },
  {
    id: "healthcare",
    name: "Healthcare",
    category: "Healthcare",
    colors: {
      background: "#f0fdf4",
      title: "#14532d",
      body: "#166534",
      accent: "#059669",
      accentText: "#ffffff",
      progress: "#059669",
      progressBg: "rgba(0,0,0,0.06)",
    },
    font: "'Segoe UI', system-ui, sans-serif",
    borderRadius: 12,
  },
  {
    id: "agency",
    name: "Agency",
    category: "Agency",
    colors: {
      background: "#18181b",
      title: "#fafafa",
      body: "rgba(250,250,250,0.6)",
      accent: "#a855f7",
      accentText: "#ffffff",
      progress: "#a855f7",
      progressBg: "rgba(255,255,255,0.08)",
    },
    font: "system-ui, -apple-system, sans-serif",
    borderRadius: 10,
  },
  {
    id: "glass",
    name: "Glass",
    category: "Creative",
    colors: {
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      title: "#ffffff",
      body: "rgba(255,255,255,0.7)",
      accent: "rgba(255,255,255,0.15)",
      accentText: "#ffffff",
      progress: "#818cf8",
      progressBg: "rgba(255,255,255,0.08)",
    },
    font: "system-ui, -apple-system, sans-serif",
    borderRadius: 24,
  },
  {
    id: "editorial",
    name: "Editorial",
    category: "Modern",
    colors: {
      background: "#faf9f6",
      title: "#1a1a1a",
      body: "#6b7280",
      accent: "#1a1a1a",
      accentText: "#faf9f6",
      progress: "#1a1a1a",
      progressBg: "rgba(0,0,0,0.08)",
    },
    font: "Georgia, 'Times New Roman', serif",
    borderRadius: 2,
  },
];

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "ocean",
    name: "Ocean",
    colors: ["#0ea5e9", "#0284c7", "#0369a1", "#075985"],
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: ["#f97316", "#fb923c", "#e879f9", "#a855f7"],
  },
  {
    id: "corporate",
    name: "Corporate",
    colors: ["#ffffff", "#3b82f6", "#6b7280", "#111827"],
  },
  {
    id: "forest",
    name: "Forest",
    colors: ["#22c55e", "#16a34a", "#15803d", "#166534"],
  },
  {
    id: "berry",
    name: "Berry",
    colors: ["#ec4899", "#db2777", "#be185d", "#9d174d"],
  },
  {
    id: "ember",
    name: "Ember",
    colors: ["#ef4444", "#f97316", "#eab308", "#f59e0b"],
  },
  {
    id: "arctic",
    name: "Arctic",
    colors: ["#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc"],
  },
  {
    id: "midnight",
    name: "Midnight",
    colors: ["#1e1b4b", "#312e81", "#4338ca", "#6366f1"],
  },
  {
    id: "earth",
    name: "Earth",
    colors: ["#92400e", "#a16207", "#4d7c0f", "#166534"],
  },
  {
    id: "pastel",
    name: "Pastel",
    colors: ["#fecdd3", "#bfdbfe", "#bbf7d0", "#fef08a"],
  },
];

export const FONT_PAIRS: FontPair[] = [
  { id: "modern", name: "Modern", heading: "system-ui, -apple-system, sans-serif", body: "system-ui, -apple-system, sans-serif" },
  { id: "bold", name: "Bold", heading: "Impact, 'Arial Black', sans-serif", body: "system-ui, -apple-system, sans-serif" },
  { id: "elegant", name: "Elegant", heading: "Georgia, 'Times New Roman', serif", body: "Georgia, 'Times New Roman', serif" },
  { id: "corporate", name: "Corporate", heading: "'Segoe UI', system-ui, sans-serif", body: "'Segoe UI', system-ui, sans-serif" },
  { id: "rounded", name: "Rounded", heading: "system-ui, -apple-system, sans-serif", body: "system-ui, -apple-system, sans-serif" },
  { id: "creative", name: "Creative", heading: "'Courier New', monospace", body: "system-ui, -apple-system, sans-serif" },
  { id: "minimal", name: "Minimal", heading: "system-ui, -apple-system, sans-serif", body: "Georgia, 'Times New Roman', serif" },
  { id: "tech", name: "Tech", heading: "'Courier New', monospace", body: "'Courier New', monospace" },
];

export const BORDER_STYLES = [
  { id: "rounded", name: "Rounded", value: 16 },
  { id: "sharp", name: "Sharp", value: 0 },
  { id: "soft", name: "Soft", value: 8 },
  { id: "pill", name: "Pill", value: 9999 },
] as const;

export const BACKGROUND_STYLES = [
  { id: "solid", name: "Solid" },
  { id: "gradient", name: "Gradient" },
  { id: "mesh", name: "Mesh Gradient" },
  { id: "dots", name: "Dots" },
  { id: "lines", name: "Lines" },
  { id: "grid", name: "Grid" },
] as const;

export const CAROUSEL_FORMATS = [
  { id: "square", label: "Square", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait", width: 1080, height: 1350 },
] as const;

export type CarouselFormat = (typeof CAROUSEL_FORMATS)[number];
