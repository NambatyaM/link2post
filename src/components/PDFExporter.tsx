"use client";

import { useState, useCallback } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import type { CarouselSlide } from "@/lib/types";

const SLIDE_SIZE = 1080;

function SlideRenderer({ slide, slideRef }: { slide: CarouselSlide; slideRef?: React.RefObject<HTMLDivElement | null> }) {
  const isFirst = slide.slideNumber === 1;
  const isLast = slide.slideNumber === 10;

  return (
    <div
      ref={slideRef}
      id={`carousel-slide-${slide.slideNumber}`}
      style={{
        width: `${SLIDE_SIZE}px`,
        height: `${SLIDE_SIZE}px`,
        background: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "40px",
          left: "40px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#6366f1",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {slide.slideNumber} / 10
      </div>

      {isFirst && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "40px",
            fontSize: "12px",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          Swipe to read →
        </div>
      )}

      <h2
        style={{
          fontSize: isFirst ? "52px" : "40px",
          fontWeight: 800,
          color: "white",
          textAlign: "center",
          lineHeight: 1.2,
          marginBottom: "24px",
          maxWidth: "800px",
        }}
      >
        {slide.title}
      </h2>

      <p
        style={{
          fontSize: "24px",
          color: "rgba(255,255,255,0.75)",
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: "750px",
        }}
      >
        {slide.body}
      </p>

      {isLast && (
        <div
          style={{
            marginTop: "40px",
            padding: "16px 32px",
            background: "#6366f1",
            borderRadius: "12px",
            fontSize: "20px",
            fontWeight: 600,
            color: "white",
          }}
        >
          Follow for more
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "40px",
          right: "40px",
          height: "3px",
          background: `linear-gradient(to right, #6366f1 ${(slide.slideNumber / 10) * 100}%, rgba(255,255,255,0.1) ${(slide.slideNumber / 10) * 100}%)`,
          borderRadius: "2px",
        }}
      />
    </div>
  );
}

export default function PDFExporter({ slides, videoTitle }: { slides: CarouselSlide[]; videoTitle: string }) {
  const [exporting, setExporting] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [SLIDE_SIZE, SLIDE_SIZE] });

      for (let i = 0; i < slides.length; i++) {
        const el = document.getElementById(`carousel-slide-${i + 1}`);
        if (!el) continue;

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#1a1a2e",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage([SLIDE_SIZE, SLIDE_SIZE], "landscape");
        pdf.addImage(imgData, "PNG", 0, 0, SLIDE_SIZE, SLIDE_SIZE);
      }

      const safeName = videoTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 50);
      pdf.save(`carousel-${safeName}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [slides, videoTitle]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>LinkedIn Carousel</h3>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{slides.length} slides · 1080×1080px</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {exporting ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2" style={{ scrollbarWidth: "thin" }}>
        {slides.map((slide, i) => (
          <button
            key={slide.slideNumber}
            onClick={() => setPreviewSlide(i)}
            className="shrink-0 rounded-xl overflow-hidden transition-all"
            style={{
              border: previewSlide === i ? "2px solid var(--accent)" : "2px solid var(--border-light)",
              width: "180px",
            }}
          >
            <div style={{ transform: "scale(0.167)", transformOrigin: "top left", width: `${SLIDE_SIZE}px`, height: `${SLIDE_SIZE}px` }}>
              <SlideRenderer slide={slide} />
            </div>
            <div style={{ width: "180px", height: `${180 * (SLIDE_SIZE / SLIDE_SIZE) - 180}px`, marginTop: `-${SLIDE_SIZE * 0.167 - 180}px` }} />
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
        <div style={{ transform: "scale(0.45)", transformOrigin: "top left", width: `${SLIDE_SIZE}px`, height: `${SLIDE_SIZE}px` }}>
          <SlideRenderer slide={slides[previewSlide]} />
        </div>
        <div style={{ height: `${SLIDE_SIZE * 0.45}px` }} />
      </div>

      <div className="hidden">
        {slides.map((slide) => (
          <SlideRenderer key={slide.slideNumber} slide={slide} />
        ))}
      </div>
    </div>
  );
}
