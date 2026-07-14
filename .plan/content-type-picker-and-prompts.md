# Plan: Content Type Picker + Combined Prompts + Unified Route

## Context

The app currently generates posts + articles together in one `/api/generate` call, then offers carousels and scripts as on-demand add-ons. There is no pre-generation content type selector. The user wants:

1. A picker so users choose what they want before generating
2. New streamlined prompts per content type that combine the improved writing style rules (direct voice, no hyphens, etc.) with the existing JSON output format
3. A unified API route that dispatches by content type

This is an **incremental refactor** — existing Supabase rate limiting, `providers.ts`, and separate endpoints stay untouched.

---

## Files to modify

| File | Change |
|------|--------|
| `src/lib/types.ts` | Expand `ContentType` to include `"carousel"` and `"script"` |
| `src/lib/prompts.ts` | Add `PROMPTS` record with 4 combined prompts |
| `src/components/TranscriptInput.tsx` | Add content type picker (4 pills) above textarea |
| `src/app/page.tsx` | Accept `contentType`, route to correct API, handle results |
| `src/app/api/generate/route.ts` | Accept `contentType` param, dispatch to correct prompt/handler |

No new files. No new dependencies.

---

## Step 1: Expand `ContentType` in `src/lib/types.ts`

```ts
// line 39, change from:
export type ContentType = "post" | "article";
// to:
export type ContentType = "post" | "article" | "carousel" | "script";
```

---

## Step 2: Add combined `PROMPTS` record to `src/lib/prompts.ts`

Add after imports, before existing prompt constants. The post and article prompts **combine** the new writing style rules with the existing JSON output format:

### Post prompt (combined)
- New rules: direct human voice, no hyphens, hook that stops scroll, 150-250 words, line breaks LinkedIn style, no emojis unless casual, never mention transcript/video
- Existing output format: JSON with `{ hook, body, imagePrompt }`
- Keeps: character count constraint (1000-1300 chars), no hashtags stacked, no engagement bait, first person voice

### Article prompt (combined)
- New rules: direct human voice, no hyphens, 500-800 words, 3-5 subheadings, no "In this video" framing, end with closing thought
- Existing output format: JSON with `{ title, body, imagePrompts[] }`
- Keeps: [IMAGE PROMPT N] markers, section structure, comparison tables

### Carousel prompt (new, plain text)
- Your carousel prompt as-is: 6-10 slides, max 25 words per slide, `Slide N: [text]` format
- No JSON needed — plain text output

### Script prompt (new, plain text)
- Your video script prompt as-is: 45-75 seconds, hook first line, [visual cue] brackets optional
- No JSON needed — plain text output

```ts
export const PROMPTS: Record<ContentType, string> = {
  post: `...combined post prompt...`,
  article: `...combined article prompt...`,
  carousel: `...carousel prompt...`,
  script: `...video script prompt...`,
};
```

These use `{transcript}` as a placeholder. The API route replaces it before sending.

Existing prompts (`SYSTEM_PROMPT`, `CAROUSEL_SYSTEM_PROMPT`, `VIDEO_SCRIPT_SYSTEM_PROMPT`, all `build*` functions) stay untouched — used by existing endpoints.

---

## Step 3: Add content type picker to `src/components/TranscriptInput.tsx`

Add a row of 4 pill buttons above the title input:

```
[ Post ]  [ Carousel ]  [ Article ]  [ Video Script ]
```

- "Post" selected by default
- Selected pill: `var(--accent)` background, white text
- Unselected: `var(--bg-tertiary)` background, `var(--text-muted)` text
- Small, rounded-full, px-3 py-1, text-xs

Update `onSubmit` prop signature:
```ts
onSubmit: (title: string, transcript: string, contentType: ContentType) => void
```

Import `ContentType` from `@/lib/types`.

---

## Step 4: Update `src/app/page.tsx`

State changes:
- Add `const [contentType, setContentType] = useState<ContentType>("post");`
- Pass `setContentType` to `TranscriptInput` (or manage via a callback)

`handleGenerate` changes:
- Accept `contentType` as third parameter
- Route based on type:

```
if (contentType === "post" || contentType === "article") {
  // Existing /api/generate flow — unchanged
  // Returns LinkedInResult with calendar
} else if (contentType === "carousel") {
  // Call existing /api/generate-carousel
  // Returns { slides: CarouselSlide[] }
} else if (contentType === "script") {
  // Call existing /api/generate-script
  // Returns { script: VideoScript }
}
```

View changes:
- post/article → existing `"calendar"` state (shows `ContentCalendar`)
- carousel → new state or reuse existing carousel display from `ContentCalendar` tabs
- script → new state or reuse existing script display from `ContentCalendar` tabs

For carousel/script results, the simplest approach: after generation, set `appState` to a view that shows the raw output. The existing `ContentCalendar` component already has carousel and script tabs — we can either extract those or show a simpler standalone view.

---

## Step 5: Update `/api/generate/route.ts`

Add `contentType` to the destructured request body:

```ts
const { videoInfo, timezone, audience, provider, model, stream, contentType } = await req.json();
```

Add early dispatch for carousel/script before the existing logic:

```ts
if (contentType === "carousel" || contentType === "script") {
  const prompt = PROMPTS[contentType].replace("{transcript}", videoInfo.transcript);
  // Use existing buildAttempts + fetchWithTimeout chain
  // Send as single user message (no system prompt)
  // Return plain text: { output: text }
  // Still apply rate limiting + recording
}
```

For post/article (or no contentType): fall through to existing logic unchanged.

---

## What stays the same

- `providers.ts` — all 8 providers, `buildAttempts()`, cooldown, `fetchWithTimeout()`
- `rate-limit.ts` — Supabase rate limiting, all plan tiers
- `/api/generate-carousel` and `/api/generate-script` — still work for on-demand from calendar
- Calendar view, content library, auth, referral, analytics
- `validate.ts`, `thinking-filter.ts`, `local-generator.ts`

---

## UI flow after changes

1. User pastes transcript, sees 4 content type pills, picks one (default: Post)
2. User clicks generate
3. Frontend routes to appropriate endpoint based on selection
4. **Post/Article**: existing calendar flow with validation, image prompts, posting schedule
5. **Carousel**: new combined prompt → plain text `Slide N: [text]` output displayed directly
6. **Script**: new prompt → plain text script output displayed directly

---

## Verification

1. `npm run build` — no type errors
2. `npm run test` — existing tests pass (check `prompts.test.ts` for PROMPTS imports)
3. Manual: paste transcript, try each content type, verify output format
4. Manual: verify existing on-demand carousel/script from calendar view still works
