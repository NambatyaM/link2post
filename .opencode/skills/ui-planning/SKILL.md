---
name: ui-planning
description: "Use when planning UI redesigns, creating design systems, mapping user flows, or strategizing visual improvements. Covers audit workflows, design system creation, and visual strategy for SaaS applications."
---

# UI Planning & Design Strategy Skill

## Design Audit Workflow

### Step 1: Visual Inventory
Before any redesign, audit the current state:
1. List every page/route and its purpose
2. Identify all component types (cards, buttons, forms, navigation)
3. Map the color usage (accent, backgrounds, text, borders)
4. Document current spacing patterns
5. Note existing animations and transitions
6. Screenshot or describe each key screen

### Step 2: Pain Points Analysis
Identify specific issues:
- **Visual inconsistency**: Different border-radius, spacing, colors across pages
- **Flat hierarchy**: Everything looks the same weight/prominence
- **Missing motion**: No scroll reveals, no hover feedback, no page transitions
- **Dated patterns**: Gradient buttons, heavy shadows, cramped layouts
- **Accessibility gaps**: Poor contrast, no focus states, no reduced-motion support
- **Responsive issues**: Elements overflow on mobile, touch targets too small

### Step 3: Design System Definition
Create a coherent token system:

#### Color Palette
```
Primary:     #818CF8 (indigo-400) → actions, accents, active states
Secondary:   #A855F7 (purple-500) → gradients, highlights
Accent-2:    #EC4899 (pink-500) → tertiary accents in gradients
Success:     #10B981 (emerald-500) → confirmations, positive states
Error:       #EF4444 (red-500) → errors, destructive actions
Warning:     #F59E0B (amber-500) → warnings, attention

Dark BGs:    #0A0A0A → #111111 → #171717 → #1F1F1F → #262626
Light BGs:   #FFFFFF → #F9FAFB → #F3F4F6 → #E5E7EB
Dark Text:   #FAFAFA → #D4D4D4 → #A3A3A3 → #737373
Light Text:  #111827 → #374151 → #6B7280 → #9CA3AF
```

#### Typography Scale
```
Hero:        3.5rem / 700 / -0.02em tracking
H1:          2.5rem / 700 / -0.01em
H2:          1.875rem / 600
H3:          1.25rem / 600
Body Large:  1.125rem / 400 / 1.6 line-height
Body:        1rem / 400 / 1.5
Body Small:  0.875rem / 400 / 1.5
Caption:     0.75rem / 500 / 1.4
Micro:       0.625rem / 600 / 0.05em tracking (uppercase labels)
```

#### Spacing Scale (4px base)
```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
```

#### Border Radius
```
None:    0px
Sm:      6px (inputs, small elements)
Md:      8px (buttons, cards)
Lg:      12px (feature cards)
Xl:      16px (modals, large cards)
2xl:     24px (hero sections, pricing cards)
Full:    9999px (badges, avatars, pills)
```

### Step 4: Motion Strategy

#### Page Load
- Hero content: staggered fade-up entrance (0.12s intervals)
- Background gradient: continuous slow animation
- CTA buttons: subtle scale entrance

#### Scroll Reveals
- All sections: fade-up on scroll (once per section)
- Cards: staggered fade-up within grid
- Text blocks: fade-up with slight delay
- Images/mockups: fade-up with scale from 0.95 to 1

#### Hover Interactions
- Cards: translateY(-4px) + shadow increase
- Buttons: scale(1.02) + background lighten
- Links: color transition (150ms)
- Nav items: background tint + icon color change

#### Micro-Interactions
- Toggle switches: spring animation
- Dropdown menus: scale + fade entrance
- Toast notifications: slide-in from right
- Loading states: pulse or skeleton shimmer
- Progress bars: width transition with easing

### Step 5: Component Redesign Priority

#### High Priority (Visual Impact)
1. **Landing page hero** — first impression, needs stunning entrance
2. **Navigation** — sticky nav with glassmorphism, animated active states
3. **Pricing cards** — hover tilt effect, gradient highlights
4. **Workflow/pipeline** — animated step progression
5. **Dashboard mockup** — floating animation + glassmorphism

#### Medium Priority (UX Improvement)
6. **Sidebar** — animated collapse/expand, active indicator
7. **Header** — smooth breadcrumb transitions
8. **Cards everywhere** — consistent hover lift effect
9. **Feature gate/upgrade wall** — animated lock icon, gradient CTA
10. **Auth pages** — split layout with animated illustration

#### Lower Priority (Polish)
11. **Form inputs** — animated focus rings
12. **Loading states** — skeleton screens
13. **Error states** — animated error icons
14. **Empty states** — illustrated with animation
15. **Footer** — subtle entrance animation

## Visual Patterns for SaaS

### Glassmorphism
```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Gradient Borders
```css
.gradient-border {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 16px;
}
.gradient-border::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, #818CF8, #A855F7, #EC4899);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### Animated Gradient Text
```css
.gradient-text {
  background: linear-gradient(135deg, #818CF8, #A855F7, #EC4899);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 4s ease infinite;
}
```

### Floating Orb Decorations
```tsx
// Background orbs for hero sections
<div className="absolute inset-0 overflow-hidden pointer-events-none">
  <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-float"
    style={{ background: "#818CF8", top: "-10%", left: "20%" }} />
  <div className="absolute w-72 h-72 rounded-full blur-3xl opacity-15 animate-float"
    style={{ background: "#A855F7", bottom: "10%", right: "15%", animationDelay: "2s" }} />
</div>
```

### Noise Texture for Depth
```tsx
<div className="absolute inset-0 opacity-[0.03] pointer-events-none"
  style={{
    backgroundImage: `url("data:image/svg+xml,...")`,
    backgroundRepeat: "repeat"
  }} />
```

## Redesign Checklist

- [ ] Design tokens defined in CSS custom properties
- [ ] All existing animations preserved or enhanced
- [ ] New animations added with `prefers-reduced-motion` support
- [ ] Hover states on all interactive elements
- [ ] Focus states visible for keyboard navigation
- [ ] Scroll reveals on all major sections
- [ ] Consistent card hover effects across pages
- [ ] Gradient accents on hero sections and CTAs
- [ ] Glassmorphism on floating/nav elements
- [ ] Animated number counters for stats
- [ ] Staggered entrance animations for lists/grids
- [ ] Loading skeletons instead of spinners
- [ ] Mobile responsive at all breakpoints
- [ ] Dark/light mode both look polished
- [ ] No layout shift during animations
