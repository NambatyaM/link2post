"use client";

import { useState, useCallback } from "react";
import type { CarouselSlide } from "@/lib/types";
import type { CarouselTemplate, CarouselFormat } from "@/lib/templates";
import { CAROUSEL_TEMPLATES, CAROUSEL_FORMATS } from "@/lib/templates";
import SlideRenderer from "./SlideRenderer";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const TITLE_LIMIT = 100;
const BODY_LIMIT = 280;

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
        const el = document.getElementById(`builder-slide-${i}`);
        if (!el) continue;
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: template.colors.background,
          logging: false,
        });
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
  }, [slides, videoTitle, template, format]);

  const slide = slides[activeSlide];
  const titleChars = slide?.title.length || 0;
  const bodyChars = slide?.body.length || 0;

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

      {/* Template Picker */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {CAROUSEL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplate(t)}
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

      <div className="flex gap-4">
        {/* Slide Thumbnails */}
        <div className="flex flex-col gap-1.5 shrink-0" style={{ width: "64px" }}>
          {slides.map((s, i) => (
            <button
              key={s.slideNumber}
              onClick={() => setActiveSlide(i)}
              className="w-full rounded-lg overflow-hidden transition-all relative group"
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
                <SlideRenderer slide={s} template={template} format={format} />
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
          {/* Editor */}
          {slide && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Slide {activeSlide + 1} of {slides.length}
                  {activeSlide === 0 && " · Hook"}
                  {activeSlide === slides.length - 1 && slides.length > 2 && " · CTA"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveSlide(activeSlide, -1)}
                    disabled={activeSlide === 0}
                    className="p-1 rounded text-[11px] disabled:opacity-30"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => moveSlide(activeSlide, 1)}
                    disabled={activeSlide === slides.length - 1}
                    className="p-1 rounded text-[11px] disabled:opacity-30"
                    style={{ color: "var(--text-muted)" }}
                  >
                    →
                  </button>
                  {slides.length > 3 && (
                    <button
                      onClick={() => removeSlide(activeSlide)}
                      className="p-1 rounded text-[11px]"
                      style={{ color: "#ef4444" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>Title</label>
              <input
                type="text"
                value={slide.title}
                onChange={(e) => updateSlide(activeSlide, "title", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-1"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  border: `1px solid ${titleChars > TITLE_LIMIT ? "#ef4444" : "var(--border)"}`,
                }}
                placeholder="Slide title..."
              />
              <div className="flex justify-end mb-2">
                <span className="text-[10px]" style={{ color: titleChars > TITLE_LIMIT ? "#ef4444" : "var(--text-muted)" }}>
                  {titleChars}/{TITLE_LIMIT}
                </span>
              </div>

              <label className="block text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>Body</label>
              <textarea
                value={slide.body}
                onChange={(e) => updateSlide(activeSlide, "body", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-1"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  border: `1px solid ${bodyChars > BODY_LIMIT ? "#ef4444" : "var(--border)"}`,
                  minHeight: "80px",
                }}
                placeholder="Slide body text..."
              />
              <div className="flex justify-end">
                <span className="text-[10px]" style={{ color: bodyChars > BODY_LIMIT ? "#ef4444" : "var(--text-muted)" }}>
                  {bodyChars}/{BODY_LIMIT}
                </span>
              </div>
            </div>
          )}

          {/* Full Preview */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
            <div style={{
              transform: `scale(${Math.min(1, (500) / format.width)})`,
              transformOrigin: "top left",
              width: `${format.width}px`,
              height: `${format.height}px`,
            }}>
              <SlideRenderer slide={slides[activeSlide]} template={template} format={format} />
            </div>
            <div style={{ height: `${format.height * Math.min(1, 500 / format.width)}px` }} />
          </div>
        </div>
      </div>

      {/* Hidden renderers for PDF capture */}
      <div className="hidden">
        {slides.map((s, i) => (
          <div key={i} id={`builder-slide-${i}`}>
            <SlideRenderer slide={s} template={template} format={format} />
          </div>
        ))}
      </div>
    </div>
  );
}
