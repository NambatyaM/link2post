"use client";

import { useState, useRef, useCallback } from "react";
import type { CarouselSlide } from "@/lib/types";
import {
  CAROUSEL_TEMPLATES,
  COLOR_PALETTES,
  FONT_PAIRS,
  CAROUSEL_FORMATS,
  type CarouselTemplate,
  type CarouselFormat,
} from "@/lib/templates";

interface CarouselEditorProps {
  initialSlides: CarouselSlide[];
  projectTitle?: string;
  onExport?: () => void;
}

type DesignTab = "themes" | "colors" | "fonts" | "backgrounds";

const BG_PATTERNS: Record<string, { css: string; size?: string }> = {
  solid: { css: "" },
  gradient: { css: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)" },
  mesh: { css: "radial-gradient(at 40% 20%, rgba(99,102,241,0.25) 0%, transparent 50%), radial-gradient(at 80% 80%, rgba(168,85,247,0.2) 0%, transparent 50%)" },
  dots: {
    css: "radial-gradient(circle, rgba(255,255,255,0.18) 1.5px, transparent 1.5px)",
    size: "20px 20px",
  },
  lines: {
    css: "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 24px)",
    size: "24px 24px",
  },
  grid: {
    css: "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
    size: "24px 24px",
  },
  waves: {
    css: "url(\"data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q25 0 50 10 T100 10' fill='none' stroke='rgba(255,255,255,0.12)' stroke-width='1.5'/%3E%3C/svg%3E\")",
    size: "100px 20px",
  },
  chevrons: {
    css: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 30 L20 20 L30 30' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1.5'/%3E%3C/svg%3E\")",
    size: "40px 40px",
  },
  circles: {
    css: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='18' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1.5'/%3E%3C/svg%3E\")",
    size: "60px 60px",
  },
  triangles: {
    css: "url(\"data:image/svg+xml,%3Csvg width='48' height='42' viewBox='0 0 48 42' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M24 4 L44 38 L4 38 Z' fill='none' stroke='rgba(255,255,255,0.09)' stroke-width='1.2'/%3E%3C/svg%3E\")",
    size: "48px 42px",
  },
  diagonal: {
    css: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 16px)",
    size: "22px 22px",
  },
  diamonds: {
    css: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 4 L36 20 L20 36 L4 20 Z' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1.2'/%3E%3C/svg%3E\")",
    size: "40px 40px",
  },
  crosses: {
    css: "url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 6v12M6 12h12' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3C/svg%3E\")",
    size: "24px 24px",
  },
  hexagons: {
    css: "url(\"data:image/svg+xml,%3Csvg width='56' height='100' viewBox='0 0 56 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1.2'/%3E%3Cpath d='M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1.2'/%3E%3C/svg%3E\")",
    size: "56px 100px",
  },
  zigzag: {
    css: "url(\"data:image/svg+xml,%3Csvg width='40' height='20' viewBox='0 0 40 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 15 L10 5 L20 15 L30 5 L40 15' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1.2'/%3E%3C/svg%3E\")",
    size: "40px 20px",
  },
  stars: {
    css: "url(\"data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 2l3 8h8l-6.5 5 2.5 8L14 18l-7 5 2.5-8L3 10h8z' fill='none' stroke='rgba(255,255,255,0.09)' stroke-width='1'/%3E%3C/svg%3E\")",
    size: "28px 28px",
  },
  dotsLarge: {
    css: "radial-gradient(circle, rgba(255,255,255,0.15) 3px, transparent 3px)",
    size: "32px 32px",
  },
  bubbles: {
    css: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='12' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'/%3E%3Ccircle cx='60' cy='55' r='8' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3Ccircle cx='45' cy='10' r='5' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1'/%3E%3C/svg%3E\")",
    size: "80px 80px",
  },
  abstract1: {
    css: "url(\"data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='25' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3Crect x='70' y='60' width='40' height='40' rx='8' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1' transform='rotate(15 90 80)'/%3E%3Cpath d='M60 10 L110 50' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E\")",
    size: "120px 120px",
  },
  dotsSparse: {
    css: "radial-gradient(circle, rgba(255,255,255,0.2) 2px, transparent 2px)",
    size: "48px 48px",
  },
  horizontalLines: {
    css: "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 40px)",
    size: "40px 40px",
  },
  verticalLines: {
    css: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 40px)",
    size: "40px 40px",
  },
};

function getBgStyle(bgStyle: string) {
  return BG_PATTERNS[bgStyle] || BG_PATTERNS.solid;
}

export default function CarouselEditor({ initialSlides, projectTitle, onExport }: CarouselEditorProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [activeSlide, setActiveSlide] = useState(0);
  const [template, setTemplate] = useState<CarouselTemplate>(CAROUSEL_TEMPLATES[0]);
  const [format, setFormat] = useState<CarouselFormat>(CAROUSEL_FORMATS[0]);
  const [designTab, setDesignTab] = useState<DesignTab>("themes");
  const [bgStyle, setBgStyle] = useState("solid");
  const [fontPair, setFontPair] = useState(FONT_PAIRS[0]);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const updateSlide = useCallback((index: number, field: "title" | "body", value: string) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addSlide = useCallback(() => {
    const newSlide: CarouselSlide = {
      slideNumber: slides.length + 1,
      title: "New slide",
      body: "Add your content here",
      notes: "",
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlide(slides.length);
  }, [slides.length]);

  const deleteSlide = useCallback((index: number) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, slideNumber: i + 1 })));
    setActiveSlide((prev) => Math.min(prev, slides.length - 2));
  }, [slides.length]);

  const moveSlide = useCallback((from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    });
    setActiveSlide(to);
  }, [slides.length]);

  const applyColorPalette = useCallback((palette: typeof COLOR_PALETTES[number]) => {
    setTemplate((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        background: prev.colors.background.includes("gradient") ? prev.colors.background : palette.colors[3],
        title: palette.colors[0] === "#ffffff" ? "#ffffff" : palette.colors[3],
        body: palette.colors[2],
        accent: palette.colors[0],
        progress: palette.colors[0],
      },
    }));
  }, []);

  const currentFont = fontPair;

  const renderSlideContent = useCallback((slide: CarouselSlide, i: number, isExport: boolean) => {
    const w = format.width;
    const h = format.height;
    const bg = getBgStyle(bgStyle);

    return (
      <div
        style={{
          width: isExport ? w : w * 0.55,
          height: isExport ? h : h * 0.55,
          position: "relative",
          overflow: "hidden",
          borderRadius: template.borderRadius,
          boxShadow: isExport ? "none" : "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: w,
            height: h,
            transform: isExport ? "none" : "scale(0.55)",
            transformOrigin: "top left",
            background: template.colors.background,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: w * 0.074,
            fontFamily: currentFont.heading,
            position: "relative",
            overflow: "hidden",
            borderRadius: template.borderRadius,
          }}
        >
          {bg.css && (
            <div style={{ position: "absolute", inset: 0, background: bg.css, backgroundSize: bg.size || "auto", pointerEvents: "none" }} />
          )}

          <div style={{ position: "absolute", top: w * 0.037, left: w * 0.037, fontSize: w * 0.013, fontWeight: 600, color: template.colors.accent, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {slide.slideNumber} / {slides.length}
          </div>

          {i === 0 && !isExport && (
            <div style={{ position: "absolute", top: w * 0.037, right: w * 0.037, fontSize: w * 0.011, color: `${template.colors.title}40` }}>
              Swipe to read →
            </div>
          )}

          {!isExport && editingTitle === i ? (
            <textarea
              autoFocus
              value={slide.title}
              onChange={(e) => updateSlide(i, "title", e.target.value)}
              onBlur={() => setEditingTitle(null)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setEditingTitle(null); } }}
              style={{
                fontSize: i === 0 ? w * 0.048 : w * 0.037,
                fontWeight: 800,
                color: template.colors.title,
                textAlign: "center",
                lineHeight: 1.2,
                maxWidth: w * 0.74,
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${template.colors.accent}`,
                borderRadius: 4,
                padding: 4,
                resize: "none",
                fontFamily: currentFont.heading,
                outline: "none",
              }}
            />
          ) : (
            <h2
              {...(!isExport ? { onClick: () => setEditingTitle(i) } : {})}
              style={{
                fontSize: i === 0 ? w * 0.048 : w * 0.037,
                fontWeight: 800,
                color: template.colors.title,
                textAlign: "center",
                lineHeight: 1.2,
                marginBottom: w * 0.022,
                maxWidth: w * 0.74,
                wordBreak: "break-word",
                cursor: isExport ? "default" : "text",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              {slide.title}
            </h2>
          )}

          {!isExport && editingBody === i ? (
            <textarea
              autoFocus
              value={slide.body}
              onChange={(e) => updateSlide(i, "body", e.target.value)}
              onBlur={() => setEditingBody(null)}
              style={{
                fontSize: w * 0.022,
                color: template.colors.body,
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: w * 0.69,
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${template.colors.accent}`,
                borderRadius: 4,
                padding: 4,
                resize: "none",
                fontFamily: currentFont.body,
                outline: "none",
                minHeight: 80,
              }}
            />
          ) : (
            <div
              {...(!isExport ? { onClick: () => setEditingBody(i) } : {})}
              style={{
                fontSize: w * 0.022,
                color: template.colors.body,
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: w * 0.69,
                wordBreak: "break-word",
                cursor: isExport ? "default" : "text",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              {slide.body}
            </div>
          )}

          {i === slides.length - 1 && (
            <div style={{ marginTop: w * 0.037, padding: `${w * 0.015}px ${w * 0.03}px`, background: template.colors.accent, borderRadius: template.borderRadius, fontSize: w * 0.019, fontWeight: 600, color: template.colors.accentText }}>
              Follow for more
            </div>
          )}

          <div style={{ position: "absolute", bottom: w * 0.037, left: w * 0.037, right: w * 0.037, height: 3, background: `${template.colors.accent} ${(slide.slideNumber / slides.length) * 100}%, ${template.colors.progressBg} ${(slide.slideNumber / slides.length) * 100}%`, borderRadius: 2 }} />
        </div>
      </div>
    );
  }, [format, template, currentFont, bgStyle, slides.length, editingTitle, editingBody, updateSlide]);

  const exportSlides = useCallback(async () => {
    if (!canvasRef.current) return;

    const btn = canvasRef.current.closest("[data-carousel-root]");
    if (btn) btn.setAttribute("data-exporting", "true");

    const slideEls = canvasRef.current.querySelectorAll("[data-slide-export]");
    for (const el of slideEls) {
      (el as HTMLElement).style.display = "block";
      (el as HTMLElement).style.position = "absolute";
      (el as HTMLElement).style.left = "-9999px";
      (el as HTMLElement).style.top = "0";
    }

    await new Promise((r) => setTimeout(r, 100));

    const { default: html2canvas } = await import("html2canvas-pro");
    const { default: jsPDF } = await import("jspdf");

    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [format.width, format.height] });

    for (let i = 0; i < slideEls.length; i++) {
      const el = slideEls[i] as HTMLElement;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL("image/png");
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, format.width, format.height);
    }

    for (const el of slideEls) {
      (el as HTMLElement).style.display = "";
      (el as HTMLElement).style.position = "";
      (el as HTMLElement).style.left = "";
      (el as HTMLElement).style.top = "";
    }

    if (btn) btn.removeAttribute("data-exporting");

    pdf.save(`${projectTitle || "carousel"}-slides.pdf`);
    onExport?.();
  }, [format, projectTitle, onExport]);

  return (
    <div data-carousel-root className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* LEFT PANEL — Slide thumbnails */}
      <div
        className="flex flex-col shrink-0 border-r overflow-hidden"
        style={{ width: 220, background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Slides</span>
          <button onClick={addSlide} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded" style={{ color: "var(--accent)", background: "rgba(129,140,248,0.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-2">
          {slides.map((slide, i) => {
            const bg = getBgStyle(bgStyle);
            return (
              <div
                key={i}
                onClick={() => setActiveSlide(i)}
                className="relative group cursor-pointer rounded-lg overflow-hidden transition-all"
                style={{
                  border: activeSlide === i ? `2px solid ${template.colors.accent}` : "2px solid transparent",
                  opacity: activeSlide === i ? 1 : 0.7,
                }}
              >
                <div className="pointer-events-none" style={{ transform: "scale(0.2)", transformOrigin: "top left", width: format.width, height: format.height }}>
                  <div
                    style={{
                      width: format.width,
                      height: format.height,
                      background: template.colors.background,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: format.width * 0.074,
                      fontFamily: currentFont.heading,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {bg.css && <div className="absolute inset-0" style={{ background: bg.css, backgroundSize: bg.size || "auto" }} />}
                    <h2 style={{ fontSize: format.width * 0.048, fontWeight: 800, color: template.colors.title, textAlign: "center", lineHeight: 1.2, maxWidth: format.width * 0.7 }}>
                      {slide.title}
                    </h2>
                  </div>
                </div>

                <div className="absolute bottom-1 left-1 flex items-center gap-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                    {i + 1}
                  </span>
                </div>

                {slides.length > 1 && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    {i > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveSlide(i, i - 1); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px]"
                        style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                      >
                        ↑
                      </button>
                    )}
                    {i < slides.length - 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveSlide(i, i + 1); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px]"
                        style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSlide(i); }}
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px]"
                      style={{ background: "rgba(239,68,68,0.8)", color: "#fff" }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER — Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{projectTitle || "Carousel"}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>{slides.length} slides</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={format.id}
              onChange={(e) => setFormat(CAROUSEL_FORMATS.find((f) => f.id === e.target.value) || CAROUSEL_FORMATS[0])}
              className="text-[11px] px-2 py-1 rounded border"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              {CAROUSEL_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>{f.label} ({f.width}×{f.height})</option>
              ))}
            </select>
            <button
              onClick={exportSlides}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Slide canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8" style={{ background: "var(--bg-primary)" }}>
          <div ref={canvasRef} className="relative">
            {slides.map((slide, i) => (
              <div
                key={i}
                data-slide-export
                style={{
                  display: i === activeSlide ? "block" : "none",
                }}
              >
                {renderSlideContent(slide, i, false)}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-center gap-2 py-2 border-t shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
          <button
            onClick={() => setActiveSlide((p) => Math.max(0, p - 1))}
            disabled={activeSlide === 0}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: "var(--text-muted)", background: "var(--bg-tertiary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-[11px] font-medium min-w-[60px] text-center" style={{ color: "var(--text-secondary)" }}>
            {activeSlide + 1} / {slides.length}
          </span>
          <button
            onClick={() => setActiveSlide((p) => Math.min(slides.length - 1, p + 1))}
            disabled={activeSlide === slides.length - 1}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: "var(--text-muted)", background: "var(--bg-tertiary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* RIGHT PANEL — Properties */}
      <div
        className="flex flex-col shrink-0 border-l overflow-hidden"
        style={{ width: 280, background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {([ "themes", "colors", "fonts", "backgrounds"] as DesignTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setDesignTab(tab)}
              className="flex-1 py-2 text-[11px] font-medium capitalize transition-colors"
              style={{
                color: designTab === tab ? "var(--accent)" : "var(--text-muted)",
                borderBottom: designTab === tab ? `2px solid var(--accent)` : "2px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {designTab === "themes" && (
            <div className="flex flex-col gap-2">
              {CAROUSEL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t)}
                  className="flex items-center gap-3 p-2.5 rounded-lg transition-all text-left"
                  style={{
                    background: template.id === t.id ? "rgba(129,140,248,0.1)" : "var(--bg-tertiary)",
                    border: template.id === t.id ? `1px solid ${t.colors.accent}` : "1px solid transparent",
                  }}
                >
                  <div className="flex gap-1 shrink-0">
                    <div className="w-5 h-5 rounded-full" style={{ background: t.colors.background.includes("gradient") ? t.colors.accent : t.colors.background }} />
                    <div className="w-5 h-5 rounded-full" style={{ background: t.colors.accent }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>{t.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {designTab === "colors" && (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Color Palettes</p>
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  onClick={() => applyColorPalette(palette)}
                  className="flex items-center gap-3 p-2 rounded-lg transition-all text-left"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <div className="flex gap-1 shrink-0">
                    {palette.colors.map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-full" style={{ background: c, border: "1px solid rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>{palette.name}</span>
                </button>
              ))}

              <div className="mt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Custom Colors</p>
                <div className="flex flex-col gap-2">
                  {(["background", "title", "body", "accent"] as const).map((field) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-[11px] capitalize" style={{ color: "var(--text-secondary)" }}>{field}</span>
                      <input
                        type="color"
                        value={template.colors[field].startsWith("linear") ? "#000000" : template.colors[field].length <= 7 ? template.colors[field] : "#ffffff"}
                        onChange={(e) => setTemplate((prev) => ({ ...prev, colors: { ...prev.colors, [field]: e.target.value } }))}
                        className="w-7 h-7 rounded cursor-pointer border-0"
                        style={{ background: "transparent" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {designTab === "fonts" && (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Font Pairs</p>
              {FONT_PAIRS.map((fp) => (
                <button
                  key={fp.id}
                  onClick={() => { setFontPair(fp); setTemplate((prev) => ({ ...prev, font: fp.heading })); }}
                  className="p-3 rounded-lg transition-all text-left"
                  style={{
                    background: fontPair.id === fp.id ? "rgba(129,140,248,0.1)" : "var(--bg-tertiary)",
                    border: fontPair.id === fp.id ? "1px solid var(--accent)" : "1px solid transparent",
                  }}
                >
                  <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: fp.heading }}>Aa {fp.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)", fontFamily: fp.body }}>The quick brown fox jumps</p>
                </button>
              ))}

              <div className="mt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Slide Shape</p>
                <div className="flex gap-2">
                  {[
                    { name: "Sharp", value: 0 },
                    { name: "Soft", value: 8 },
                    { name: "Rounded", value: 16 },
                    { name: "Pill", value: 9999 },
                  ].map((shape) => (
                    <button
                      key={shape.name}
                      onClick={() => setTemplate((prev) => ({ ...prev, borderRadius: shape.value }))}
                      className="flex-1 py-2 text-[10px] font-medium rounded-lg transition-colors"
                      style={{
                        background: template.borderRadius === shape.value ? "rgba(129,140,248,0.15)" : "var(--bg-tertiary)",
                        color: template.borderRadius === shape.value ? "var(--accent)" : "var(--text-muted)",
                        border: template.borderRadius === shape.value ? "1px solid var(--accent)" : "1px solid transparent",
                      }}
                    >
                      {shape.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {designTab === "backgrounds" && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Background Style</p>
              {Object.entries(BG_PATTERNS).map(([key, bg]) => (
                <button
                  key={key}
                  onClick={() => setBgStyle(key)}
                  className="p-2.5 rounded-lg transition-all text-left flex items-center gap-3"
                  style={{
                    background: bgStyle === key ? "rgba(129,140,248,0.1)" : "var(--bg-tertiary)",
                    border: bgStyle === key ? "1px solid var(--accent)" : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg shrink-0"
                    style={{
                      background: template.colors.background,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {bg.css && <div className="absolute inset-0" style={{ background: bg.css, backgroundSize: bg.size || "auto" }} />}
                  </div>
                  <span className="text-[11px] font-medium capitalize" style={{ color: "var(--text-primary)" }}>{key}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
