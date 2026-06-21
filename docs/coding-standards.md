# Coding Standards

## Language & Tooling

- **TypeScript** — strict mode, no `any` types
- **React 19** — functional components only, hooks for state/effects
- **Tailwind CSS 4** — utility-first, no custom CSS classes unless necessary
- **ESLint** — default Vite + React config

## File Naming

- Components: `PascalCase.tsx` (e.g., `SurveyForm.tsx`)
- Utilities/hooks: `camelCase.ts` (e.g., `useGeolocation.ts`, `exportCsv.ts`)
- Types: `camelCase.ts` in `types/` directory

## Component Structure

```tsx
// 1. Imports (external → internal → types)
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { addVisit } from '../db/database';
import type { HouseholdVisit } from '../types/survey';

// 2. Types/Interfaces for this component
interface Props {
  onSaved: () => void;
}

// 3. Component export
export function ComponentName({ onSaved }: Props) {
  // hooks first
  // handlers
  // render
}

// 4. Helper components (private to this file)
function HelperComponent({ label }: { label: string }) {
  return <span>{label}</span>;
}
```

## State Management

- **Local state** via `useState` for component-level data
- **IndexedDB** (Dexie.js) for persistent data — no Redux, no context for data
- **Props** for parent-child communication
- **Callback props** (e.g., `onSaved`) for child-to-parent events

## Styling Guidelines

- Use Tailwind utility classes directly on elements
- Avoid `@apply` — compose in JSX instead
- Use semantic color names: `slate-800` for primary, `emerald-700` for success, `red-600` for destructive
- Mobile-first: base styles are mobile, use `sm:` / `md:` for larger screens
- Ensure minimum 4.5:1 contrast ratio for text (WCAG AA)

## Icons

- Use **Lucide React** exclusively — no emojis, no other icon libraries
- Import individual icons to enable tree-shaking:
  ```tsx
  import { MapPin, User, Home } from 'lucide-react';
  ```
- Standard sizes: 14px (inline), 16px (form fields), 18px (cards), 20px (nav)

## Database

- All CRUD operations go through `src/db/database.ts` helper functions
- Never access `db.visits` directly from components
- Use `put()` over `add()` for reliability with explicit keys (upsert behavior)
- Always set `id` before saving (UUID v4)
- Edit flow: load record into form state → modify → put() overwrites by ID

## Form Patterns

- Multi-step wizard pattern with validation per step
- `CardSelect` for enum/option fields (visual, tap-friendly)
- `NumberStepper` for numeric fields (no raw number inputs)
- `ToggleCard` for boolean fields (accessible toggle switches)
- `FormInput` with icon prefix for text fields
- Auto-calculated fields (e.g., totalMembers = males + females)
- Edit mode: pre-fill form from existing record, show "Editing" state

## Map Patterns

- Numbered pins using `L.divIcon` with flexbox-centered index number
- Overlap handling: offset markers at same coordinates by ~15m diagonally
- `zIndexOffset` ensures later markers are clickable on top
- PDF export: render hidden 1800x1800 Leaflet map, screenshot at 3x scale

## Error Handling

- Wrap async DB operations in try/catch
- Show user-facing error messages via component state
- Never swallow errors silently — at minimum log to console

## Accessibility

- All interactive elements must be keyboard accessible
- Use `aria-label` on icon-only buttons
- Use `role="switch"` on custom toggle components
- Color is never the only indicator — always pair with text/icon
- Focus states visible via `focus:ring-2`
