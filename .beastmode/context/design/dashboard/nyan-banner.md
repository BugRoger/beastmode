# NyanBanner — Color Cycling and Rendering

## Context
The original dashboard header was a plain cyan `<Text>` "beastmode" label. flashy-dashboard replaced it with a 2-line ASCII block-character banner with continuously cycling rainbow colors.

## Decision
Pure function `getNyanColor(charIndex, tickOffset)` returns a hex color string from the 6-stripe palette based on `(charIndex + tickOffset) % 6`. Spaces return `undefined` (uncolored). Both banner lines receive the same `tickOffset`. A `useEffect` in `NyanBanner.tsx` increments `tickOffset` every 80ms via `setInterval`.

## Rationale
Separating the color engine (`nyan-colors.ts`) from the component (`NyanBanner.tsx`) enables pure unit testing of the cycling logic without mounting React. The 80ms tick matches the existing braille spinner interval — consistent animation cadence across the dashboard with no additional timer.

## Rendering Trick — Inline Border Title Overflow
For the inline panel border titles (`┌─ EPICS ──────┐`), the implementation emits `"─".repeat(200)` after the title text and relies on terminal clipping. This is a standard terminal rendering pattern — excess characters are never displayed, the visible portion is always correct. No dynamic width calculation needed.

## Rejected Alternative
`@mishieck/ink-titled-box` (community package) was specified in the design as the mechanism for inline panel titles. Evaluated at plan/tasks.md time and rejected: small abstraction, unverified Ink v6 compatibility, adds an npm dependency for ~5 lines of code. Direct implementation preferred.

## Source
- .beastmode/artifacts/implement/2026-04-04-flashy-dashboard-layout-polish.tasks.md
- .beastmode/artifacts/design/2026-04-04-flashy-dashboard.md
