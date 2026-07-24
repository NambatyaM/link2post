---
name: motion-graphics
description: "Use when adding animations, transitions, scroll effects, micro-interactions, or motion graphics to a React/Next.js project. Covers Framer Motion, CSS animations, scroll-triggered effects, and performance best practices."
---

# Motion Graphics & Animation Skill

## Framer Motion (Primary Library)

### Installation
```bash
npm install framer-motion
```

### Core Concepts

#### Basic Animations
```tsx
import { motion } from "framer-motion";

// Fade in
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
/>

// Scale entrance
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
/>
```

#### Scroll-Triggered Animations
```tsx
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

function AnimatedSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

#### Stagger Children
```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => <motion.li key={i} variants={item} />)}
</motion.ul>
```

#### Hover & Tap Interactions
```tsx
<motion.button
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>

// Card lift on hover
<motion.div
  whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
  transition={{ duration: 0.2 }}
/>
```

#### Path Drawing Animation
```tsx
<motion.svg viewBox="0 0 100 100">
  <motion.path
    d="M10 80 C 40 10, 65 10, 95 80"
    fill="transparent"
    stroke="var(--accent)"
    strokeWidth="2"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 1.5, ease: "easeInOut" }}
  />
</motion.svg>
```

#### Parallax Effects
```tsx
import { motion, useScroll, useTransform } from "framer-motion";

function Parallax({ speed = 0.5 }: { speed?: number }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 300 * speed]);
  
  return <motion.div style={{ y }}>Content</motion.div>;
}
```

#### Animated Number Counter
```tsx
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  
  return <motion.span>{display}</motion.span>;
}
```

#### Layout Animations
```tsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
    />
  )}
</AnimatePresence>
```

## CSS-Only Animations (No JS Required)

### Floating Animation
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
.animate-float { animation: float 6s ease-in-out infinite; }
```

### Gradient Shift (Animated Background)
```css
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animate-gradient {
  background-size: 200% 200%;
  animation: gradientShift 8s ease infinite;
}
```

### Glow Pulse
```css
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(129,140,248,0.2); }
  50% { box-shadow: 0 0 40px rgba(129,140,248,0.4); }
}
.animate-glow { animation: glowPulse 3s ease-in-out infinite; }
```

### Subtle Border Glow on Hover
```css
.glow-on-hover {
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}
.glow-on-hover:hover {
  box-shadow: 0 0 24px rgba(129,140,248,0.15);
  border-color: rgba(129,140,248,0.3);
}
```

### Text Gradient Animation
```css
@keyframes textGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.text-gradient-animated {
  background: linear-gradient(135deg, #818CF8, #A855F7, #EC4899, #818CF8);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textGradient 6s ease infinite;
}
```

### Shimmer Loading Effect
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

### Typing Effect
```css
@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}
.typing-text {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid var(--accent);
  animation: typing 2s steps(30) forwards, blink 0.8s step-end infinite;
}
```

### Noise Texture Overlay
```css
.noise-overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}
```

### Mesh Gradient Background
```css
.mesh-bg {
  background: 
    radial-gradient(ellipse at 20% 50%, rgba(129,140,248,0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 80%, rgba(236,72,153,0.08) 0%, transparent 50%);
  animation: meshShift 15s ease-in-out infinite;
  background-size: 200% 200%;
}
```

## Performance Rules

1. **Always use `transform` and `opacity`** — never animate `width`, `height`, `top`, `left`, `margin`, `padding`
2. **Use `will-change: transform`** for elements that animate frequently
3. **Prefer CSS animations** for simple loops (float, pulse, rotate) — less JS overhead
4. **Use Framer Motion** for scroll-triggered, gesture-based, or layout animations
5. **Batch state updates** — don't trigger re-renders on every scroll pixel
6. **Use `useInView` with `once: true`** for scroll reveals to disconnect observer
7. **Limit concurrent animations** — max 3-4 animated elements visible at once
8. **Use `layoutId`** for shared layout animations between routes

## Common Patterns for SaaS Landing Pages

### Hero Entrance Sequence
```tsx
// Staggered entrance: badge → headline → subtitle → CTAs → visual
const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } }
};
```

### Scroll Progress Indicator
```tsx
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return <motion.div style={{ scaleX: scrollYProgress, transformOrigin: "0%" }} />;
}
```

### Magnetic Button Effect
```tsx
function MagneticButton({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  };
  
  const handleMouseLeave = () => { x.set(0); y.set(0); };
  
  return (
    <motion.button style={{ x, y }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children}
    </motion.button>
  );
}
```

### Tilt Card Effect
```tsx
function TiltCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}
```

### Text Reveal Animation
```tsx
function RevealText({ text }: { text: string }) {
  return (
    <motion.span
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {text}
    </motion.span>
  );
}
```
