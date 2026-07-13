"use client";

import { useState, useCallback, useMemo } from "react";
import type { CarouselSlide } from "@/lib/types";
import type { CarouselTemplate, CarouselFormat } from "@/lib/templates";
import { CAROUSEL_TEMPLATES, CAROUSEL_FORMATS } from "@/lib/templates";
import SlideRenderer from "./SlideRenderer";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const PRESET_COLORS = [
  "#ffffff", "#10a37f", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#111827",
];

const FONTS = [
  { id: "system", label: "System", value: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Monospace", value: "'Courier New', monospace" },
  { id: "rounded", label: "Rounded", value: "'Nunito', 'Varela Round', sans-serif" },
];

export default function CarouselBuilder({
  initialSlides,
  videoTitle,
}: {
  initialSlides: CarouselSlide[];
  videoTitle: string;
}) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [template, setTemplate] = useState<CarouselTemplate>(CAROUSEL_TEMPLATES[0]);
  const [format, setFormat] = useState<CarouselFormat>(CAROUSEL_FORMATS[0]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Per-slide customization overrides
  const [titleColor, setTitleColor] = useState<string>("");
  const [bodyColor, setBodyColor] = useState<string>("");
  const [accentColor, setAccentColor] = useState<string>("");
  const [bgColor, setBgColor] = useState<string>("");
  const [fontOverride, setFontOverride] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeTemplate: CarouselTemplate = useMemo(() => ({
    ...template,
    colors: {
      ...template.colors,
      ...(bgColor ? { background: bgColor } : {}),
      ...(titleColor ? { title: titleColor } : {}),
      ...(bodyColor ? { body: bodyColor } : {}),
      ...(accentColor ? { accent: accentColor, accentText: isLightColor(accentColor) ? "#111827" : "#ffffff" } : {}),
    },
    font: fontOverride || template.font,
  }), [template, bgColor, titleColor, bodyColor, accentColor, fontOverride]);

  const updateSlide = useCallback((index: number, field: "title" | "body", value: string) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addSlide = useCallback(() => {
    setSlides((prev) => [
      ...prev,
      { slideNumber: prev.length + 1, title: "", body: "", notes: "" },
    ]);
    setActiveSlide(slides.length);
  }, [slides.length]);

  const removeSlide = useCallback((index: number) => {
    if (slides.length <= 3) return;
    setSlides((prev) => {
      const next = prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, slideNumber: i + 1 }));
      return next;
    });
    setActiveSlide((prev) => Math.min(prev, slides.length - 2));
  }, [slides.length]);

  const moveSlide = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    });
    setActiveSlide(target);
  }, [slides.length]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: format.width > format.height ? "landscape" : "portrait",
        unit: "px",
        format: [format.width, format.height],
      });

      for (let i = 0; i < slides.length; i++) {
        const el = document.getElementById(`pdf-slide-${i}`);
        if (!el) {
          console.warn(`Element pdf-slide-${i} not found`);
          continue;
        }

        // Temporarily make visible for capture
        el.style.position = "absolute";
        el.style.left = "-9999px";
        el.style.top = "0";
        el.style.display = "block";

        await new Promise((r) => setTimeout(r, 50));

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: activeTemplate.colors.background,
          logging: false,
          width: format.width,
          height: format.height,
        });

        el.style.display = "";

        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage([format.width, format.height], format.width > format.height ? "landscape" : "portrait");
        pdf.addImage(imgData, "PNG", 0, 0, format.width, format.height);
      }

      const safeName = (videoTitle || "carousel").replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 50);
      pdf.save(`carousel-${safeName}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [slides, videoTitle, activeTemplate, format]);

  const slide = slides[activeSlide];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Carousel Builder</h3>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{slides.length} slides · {format.width}×{format.height}px</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {exporting ? "Exporting..." : "Download PDF"}
        </button>
      </div>

      {/* Template + Format Picker */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {CAROUSEL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTemplate(t); setBgColor(""); setTitleColor(""); setBodyColor(""); setAccentColor(""); setFontOverride(""); }}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: template.id === t.id ? t.colors.accent : "var(--bg-tertiary)",
              color: template.id === t.id ? t.colors.accentText : "var(--text-muted)",
              border: `1.5px solid ${template.id === t.id ? t.colors.accent : "var(--border-light)"}`,
            }}
          >
            {t.name}
          </button>
        ))}
        <span className="shrink-0 w-px mx-1" style={{ background: "var(--border-light)" }} />
        {CAROUSEL_FORMATS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: format.id === f.id ? "var(--accent)" : "var(--bg-tertiary)",
              color: format.id === f.id ? "white" : "var(--text-muted)",
              border: `1.5px solid ${format.id === f.id ? "var(--accent)" : "var(--border-light)"}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Advanced Design Controls */}
      <div className="mb-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
        >
          {showAdvanced ? "Hide" : "Customize"} design {showAdvanced ? "▲" : "▼"}
        </button>

        {showAdvanced && (
          <div className="mt-2 p-3 rounded-xl grid grid-cols-2 gap-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)" }}>
            {/* Background Color */}
            <div>
              <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Background</label>
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(bgColor === c ? "" : c)}
                    className="w-5 h-5 rounded-md border transition-all"
                    style={{
                      background: c,
                      borderColor: bgColor === c ? "var(--accent)" : "var(--border)",
                      borderWidth: bgColor === c ? "2px" : "1px",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Title Color */}
            <div>
              <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Title color</label>
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTitleColor(titleColor === c ? "" : c)}
                    className="w-5 h-5 rounded-md border transition-all"
                    style={{
                      background: c,
                      borderColor: titleColor === c ? "var(--accent)" : "var(--border)",
                      borderWidth: titleColor === c ? "2px" : "1px",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Body Color */}
            <div>
              <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Body color</label>
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBodyColor(bodyColor === c ? "" : c)}
                    className="w-5 h-5 rounded-md border transition-all"
                    style={{
                      background: c,
                      borderColor: bodyColor === c ? "var(--accent)" : "var(--border)",
                      borderWidth: bodyColor === c ? "2px" : "1px",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Accent</label>
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.slice(1).map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(accentColor === c ? "" : c)}
                    className="w-5 h-5 rounded-md border transition-all"
                    style={{
                      background: c,
                      borderColor: accentColor === c ? "#fff" : "var(--border)",
                      borderWidth: accentColor === c ? "2px" : "1px",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Font */}
            <div className="col-span-2">
              <label className="block text-[10px] mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Font</label>
              <div className="flex gap-1.5">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontOverride(fontOverride === f.value ? "" : f.value)}
                    className="px-2.5 py-1 rounded-md text-[11px] transition-all"
                    style={{
                      fontFamily: f.value,
                      background: fontOverride === f.value ? "var(--accent)" : "var(--bg-tertiary)",
                      color: fontOverride === f.value ? "white" : "var(--text-muted)",
                      border: `1px solid ${fontOverride === f.value ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {/* Slide Thumbnails */}
        <div className="flex flex-col gap-1.5 shrink-0" style={{ width: "64px" }}>
          {slides.map((s, i) => (
            <button
              key={s.slideNumber}
              onClick={() => setActiveSlide(i)}
              className="w-full rounded-lg overflow-hidden transition-all"
              style={{
                border: activeSlide === i ? "2px solid var(--accent)" : "2px solid var(--border-light)",
                aspectRatio: `${format.width}/${format.height}`,
              }}
            >
              <div style={{
                transform: "scale(0.12)",
                transformOrigin: "top left",
                width: `${format.width}px`,
                height: `${format.height}px`,
              }}>
                <SlideRenderer slide={s} template={activeTemplate} format={format} totalSlides={slides.length} />
              </div>
              <div style={{
                width: "64px",
                height: `${64 * (format.height / format.width)}px`,
                marginTop: `-${format.height * 0.12 - 64 * (format.height / format.width)}px`,
              }} />
            </button>
          ))}
          <button
            onClick={addSlide}
            className="w-full rounded-lg text-[11px] font-medium py-1.5 transition-colors"
            style={{
              border: "1.5px dashed var(--border)",
              color: "var(--text-muted)",
              aspectRatio: `${format.width}/${format.height}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            + Add
          </button>
        </div>

        {/* Editor + Preview */}
        <div className="flex-1 min-w-0">
          {slide && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Slide {activeSlide + 1} of {slides.length}
                  {activeSlide === 0 && " · Hook"}
                  {activeSlide === slides.length - 1 && slides.length > 2 && " · CTA"}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => moveSlide(activeSlide, -1)} disabled={activeSlide === 0} className="p-1 rounded text-[11px] disabled:opacity-30" style={{ color: "var(--text-muted)" }}>←</button>
                  <button onClick={() => moveSlide(activeSlide, 1)} disabled={activeSlide === slides.length - 1} className="p-1 rounded text-[11px] disabled:opacity-30" style={{ color: "var(--text-muted)" }}>→</button>
                  {slides.length > 3 && (
                    <button onClick={() => removeSlide(activeSlide)} className="p-1 rounded text-[11px]" style={{ color: "#ef4444" }}>✕</button>
                  )}
                </div>
              </div>

              <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>Title</label>
              <input
                type="text"
                value={slide.title}
                onChange={(e) => updateSlide(activeSlide, "title", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                placeholder="Slide title..."
              />

              <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>Body</label>
              <textarea
                value={slide.body}
                onChange={(e) => updateSlide(activeSlide, "body", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)", minHeight: "80px" }}
                placeholder="Slide body text..."
              />
            </div>
          )}

          {/* Live Preview */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
            <div style={{
              transform: `scale(${Math.min(1, 500 / format.width)})`,
              transformOrigin: "top left",
              width: `${format.width}px`,
              height: `${format.height}px`,
            }}>
              <SlideRenderer slide={slides[activeSlide]} template={activeTemplate} format={format} totalSlides={slides.length} />
            </div>
            <div style={{ height: `${format.height * Math.min(1, 500 / format.width)}px` }} />
          </div>
        </div>
      </div>

      {/* OFF-SCREEN renderers for PDF capture (not display:none — html2canvas needs visible elements) */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }}>
        {slides.map((s, i) => (
          <div key={i} id={`pdf-slide-${i}`} style={{ width: `${format.width}px`, height: `${format.height}px`, overflow: "hidden" }}>
            <SlideRenderer slide={s} template={activeTemplate} format={format} totalSlides={slides.length} />
          </div>
        ))}
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
