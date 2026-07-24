---
name: frontend-architecture
description: "Use when architecting React/Next.js components, managing state, optimizing performance, ensuring accessibility, or structuring a project. Covers component patterns, hooks, server components, and best practices."
---

# Frontend Architecture Skill

## Component Patterns

### Atomic Design for React
```
src/
├── components/
│   ├── atoms/        # Button, Input, Badge, Icon, Avatar
│   ├── molecules/    # SearchBar, CardHeader, FormField
│   ├── organisms/    # Sidebar, Header, PricingCard, PostEditor
│   └── templates/    # DashboardLayout, AuthLayout, LandingLayout
├── hooks/            # Custom hooks (usePlan, useScrollReveal, etc.)
├── lib/              # Utilities, API helpers, constants
├── providers/        # Context providers (Theme, Plan, Auth)
└── styles/           # Global CSS, design tokens
```

### Component Composition Patterns

#### Compound Components
```tsx
// Good: Compound pattern for flexible composition
<Card>
  <Card.Header>
    <Card.Title>My Card</Card.Title>
  </Card.Header>
  <Card.Body>Content here</Card.Body>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>

// Avoid: Monolithic component with too many props
<Card title="My Card" body="Content" action="Click" footer={true} />
```

#### Render Props for Logic Sharing
```tsx
function ScrollPosition({ children }: { children: (pos: number) => React.ReactNode }) {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return <>{children(scrollY)}</>;
}
```

#### Custom Hooks for Reusable Logic
```tsx
// useMediaQuery.ts
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
  return matches;
}

// Usage
const isMobile = useMediaQuery("(max-width: 768px)");
```

### Server vs Client Components (Next.js 13+)

#### Server Components (Default)
- Fetch data directly
- Access backend resources
- Keep sensitive logic (API keys, DB queries) on server
- Reduce client-side JavaScript bundle

```tsx
// Server Component (no "use client")
async function ProjectList() {
  const projects = await db.projects.findMany();
  return (
    <div>
      {projects.map(p => <ProjectCard key={p.id} project={p} />)}
    </div>
  );
}
```

#### Client Components ("use client")
- Interactivity (onClick, onChange, etc.)
- Browser APIs (localStorage, window)
- State hooks (useState, useEffect, useRef)
- Third-party client libraries (Framer Motion, etc.)

```tsx
"use client";
function InteractiveCard({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  return <motion.div onClick={() => setExpanded(!expanded)} />;
}
```

### State Management Patterns

#### Local State (useState/useReducer)
- UI state: modals, dropdowns, form inputs
- Component-specific state: loading, error, expanded

#### Context (for shared state)
- Theme preferences
- User/auth state
- Plan/subscription state
- Feature flags

```tsx
// Avoid prop drilling through many levels
// Use context for truly global state only
const PlanContext = createContext<PlanContextType | null>(null);

function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be inside PlanProvider");
  return ctx;
}
```

#### URL State (searchParams)
- Filters, sorting, pagination
- Modal states that should be shareable
- Tab selections

### Performance Optimization

#### Code Splitting
```tsx
// Dynamic import for heavy components
const CarouselEditor = dynamic(() => import("@/components/CarouselEditor"), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

#### Memoization
```tsx
// useMemo for expensive computations
const sortedPosts = useMemo(() => 
  posts.sort((a, b) => b.score - a.score), 
  [posts]
);

// useCallback for stable function references
const handleClick = useCallback(() => {
  setOpen(true);
}, []);

// React.memo for preventing re-renders
const PostCard = React.memo(function PostCard({ post }: { post: Post }) {
  return <div>{post.title}</div>;
});
```

#### Virtualization for Large Lists
```tsx
// Use react-window or similar for 100+ items
import { FixedSizeList } from "react-window";

<FixedSizeList height={600} itemCount={posts.length} itemSize={80}>
  {({ index, style }) => <PostRow post={posts[index]} style={style} />}
</FixedSizeList>
```

### Accessibility Checklist

- [ ] Semantic HTML elements (nav, main, article, section, aside)
- [ ] ARIA labels on icon-only buttons
- [ ] Skip navigation link
- [ ] Focus management for modals
- [ ] Keyboard navigation works for all interactive elements
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Form inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Images have alt text
- [ ] Reduced motion media query respected

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### File Naming Conventions
```
Component files:    PascalCase.tsx (PostEditor.tsx)
Hook files:         camelCase.ts (usePlan.ts)
Utility files:      camelCase.ts (formatDate.ts)
Type files:         PascalCase.ts (Post.types.ts)
Test files:         Component.test.tsx
```

### Error Handling Patterns
```tsx
// Error boundaries for component-level error handling
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  if (error) return <ErrorFallback error={error} />;
  return <ErrorBoundaryInner onError={setError}>{children}</ErrorBoundaryInner>;
}

// API error handling
async function apiCall() {
  try {
    const res = await fetch("/api/data");
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) {
      // Handle specific error codes
    }
    throw err; // Re-throw unexpected errors
  }
}
```

### Project Structure Best Practices
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Dashboard route group
│   └── api/               # API routes
├── components/
│   ├── shared/            # Reusable across all pages
│   ├── features/          # Feature-specific components
│   └── providers/         # Context providers
├── lib/                   # Utilities and helpers
├── services/              # External service integrations
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── trigger/               # Background job definitions
```
