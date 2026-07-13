import type { CarouselSlide } from "@/lib/types";
import type { CarouselTemplate, CarouselFormat } from "@/lib/templates";

export default function SlideRenderer({
  slide,
  template,
  format,
  totalSlides = 10,
}: {
  slide: CarouselSlide;
  template: CarouselTemplate;
  format: CarouselFormat;
  totalSlides?: number;
}) {
  const c = template.colors;
  const isFirst = slide.slideNumber === 1;
  const isLast = slide.slideNumber === totalSlides;

  return (
    <div
      style={{
        width: `${format.width}px`,
        height: `${format.height}px`,
        background: c.background,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: `${format.width * 0.074}px`,
        boxSizing: "border-box",
        fontFamily: template.font,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Slide number */}
      <div
        style={{
          position: "absolute",
          top: `${format.width * 0.037}px`,
          left: `${format.width * 0.037}px`,
          fontSize: `${format.width * 0.013}px`,
          fontWeight: 600,
          color: c.accent,
          letterSpacing: "0.05em",
          textTransform: "uppercase" as const,
        }}
      >
        {slide.slideNumber} / {totalSlides}
      </div>

      {/* Swipe hint on first slide */}
      {isFirst && (
        <div
          style={{
            position: "absolute",
            top: `${format.width * 0.037}px`,
            right: `${format.width * 0.037}px`,
            fontSize: `${format.width * 0.011}px`,
            color: `${c.title}40`,
          }}
        >
          Swipe to read →
        </div>
      )}

      {/* Title */}
      <h2
        style={{
          fontSize: isFirst ? `${format.width * 0.048}px` : `${format.width * 0.037}px`,
          fontWeight: 800,
          color: c.title,
          textAlign: "center" as const,
          lineHeight: 1.2,
          marginBottom: `${format.width * 0.022}px`,
          maxWidth: `${format.width * 0.74}px`,
          wordBreak: "break-word" as const,
        }}
      >
        {slide.title}
      </h2>

      {/* Body — scrollable if overflows */}
      <div
        style={{
          fontSize: `${format.width * 0.022}px`,
          color: c.body,
          textAlign: "center" as const,
          lineHeight: 1.6,
          maxWidth: `${format.width * 0.69}px`,
          maxHeight: `${format.height * 0.55}px`,
          overflow: "auto",
          wordBreak: "break-word" as const,
          padding: "2px",
        }}
      >
        {slide.body}
      </div>

      {/* CTA button on last slide */}
      {isLast && (
        <div
          style={{
            marginTop: `${format.width * 0.037}px`,
            padding: `${format.width * 0.015}px ${format.width * 0.03}px`,
            background: c.accent,
            borderRadius: `${format.width * 0.011}px`,
            fontSize: `${format.width * 0.019}px`,
            fontWeight: 600,
            color: c.accentText,
          }}
        >
          Follow for more
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: `${format.width * 0.037}px`,
          left: `${format.width * 0.037}px`,
          right: `${format.width * 0.037}px`,
          height: "3px",
          background: `${c.progress} ${(slide.slideNumber / totalSlides) * 100}%, ${c.progressBg} ${(slide.slideNumber / totalSlides) * 100}%`,
          borderRadius: "2px",
        }}
      />
    </div>
  );
}
