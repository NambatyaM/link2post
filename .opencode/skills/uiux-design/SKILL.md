---
name: uiux-design
description: "Use when creating, reviewing, or improving website UI/UX designs. Covers modern design principles, layout, typography, color, responsive design, accessibility, and component patterns."
---

# UI/UX Design Skill

## Core Design Principles

### Visual Hierarchy
- Use size, weight, and color to establish clear information hierarchy
- Primary actions should be the most visually prominent element
- Use white space intentionally — it's not empty, it's breathing room
- F-pattern and Z-pattern scanning for content-heavy layouts

### Typography
- Use fluid typography with `clamp()` for responsive sizing
- Limit to 2-3 font weights maximum per font family
- Line height: 1.5-1.6 for body text, 1.1-1.2 for headlines
- Letter spacing: slightly tighten headlines (-0.02em), loosen small caps (0.05em)
- Measure: 45-75 characters per line for optimal readability

### Color System
- Use CSS custom properties for all colors (themeable)
- Minimum 4.5:1 contrast ratio for text (WCAG AA)
- Limit palette to 5-7 colors including neutrals
- Use opacity and subtle tints for depth instead of adding more colors
- Accent colors: one primary, one secondary maximum
- Semantic colors: success (green), error (red), warning (amber), info (blue)

### Spacing & Layout
- Use a consistent spacing scale: 4px base (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96)
- Grid-based layouts with consistent gutters (16-24px)
- Max content width: 1200px for desktop, 100% with padding for mobile
- Card padding: 16-24px depending on card size
- Section padding: 64-96px vertical, 24-48px horizontal

### Component Patterns

#### Buttons
- Primary: solid fill, high contrast, rounded-lg (8-12px radius)
- Secondary: outlined or ghost, lower visual weight
- Hover: lighten background or add subtle shadow, never just color change
- Active/pressed: slightly darker or scale down 0.98
- Disabled: 50% opacity, no pointer events
- Minimum touch target: 44x44px for mobile

#### Cards
- Subtle border + shadow for elevation
- Hover: lift effect (translateY(-2-4px)) + shadow increase
- Background: slightly elevated from page background
- Rounded corners: 12-16px for modern feel
- Consistent padding within card types

#### Forms
- Labels above inputs, not placeholders
- Focus states: ring/outline with accent color + subtle glow
- Error states: red border + helper text below
- Input height: 40-48px
- Border radius: 8px matching design system

#### Navigation
- Active state: background tint + accent color text/icon
- Hover: subtle background transition
- Group related items with dividers or spacing
- Collapse sidebar on mobile to hamburger or bottom nav
- Breadcrumbs for deep navigation

### Responsive Design
- Mobile-first approach: design for 320px, enhance upward
- Breakpoints: sm(640), md(768), lg(1024), xl(1280), 2xl(1536)
- Stack layouts vertically on mobile
- Hide secondary UI elements on small screens
- Touch-friendly: larger tap targets, swipe gestures

### Dark Mode Best Practices
- Don't just invert colors — redesign for dark backgrounds
- Use darker surfaces (#0A0A0A to #1A1A1A range)
- Reduce contrast slightly for text (softer whites: #FAFAFA not #FFFFFF)
- Borders should be subtle (#262626 range)
- Shadows are less visible on dark — use borders for elevation instead
- Accent colors may need to be lighter/more saturated for dark backgrounds

### Micro-interactions
- Hover states on all interactive elements
- Focus ring for keyboard navigation
- Smooth transitions (150-300ms ease)
- Loading states for async operations
- Skeleton screens instead of spinners for content loading
- Toast notifications for success/error feedback

### Animation Timing
- Micro-interactions: 150-200ms ease-out
- Page transitions: 300-400ms ease-in-out
- Scroll animations: 500-700ms with stagger
- Spring animations for playful elements
- Never animate layout properties (width, height) — use transform/opacity

### Accessibility
- Semantic HTML: nav, main, article, section, aside, header, footer
- ARIA labels for icon-only buttons
- Skip navigation link
- Focus management for modals and dynamic content
- Color is never the only indicator of state
- Keyboard navigation for all interactive elements

### Performance
- Use CSS transforms for animations (GPU accelerated)
- Avoid layout thrashing: batch DOM reads/writes
- Lazy load below-fold content
- Use `will-change` sparingly for known animations
- Prefer `transform` and `opacity` over `top/left/width/height`
- Use `content-visibility: auto` for off-screen sections

## Design System Token Structure

```css
:root {
  /* Colors */
  --color-bg-primary: #0A0A0A;
  --color-bg-secondary: #171717;
  --color-bg-tertiary: #1F1F1F;
  
  /* Typography */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;
  
  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
  --shadow-glow: 0 0 24px rgba(129,140,248,0.15);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
```
