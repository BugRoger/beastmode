---
phase: plan
slug: flashy-dashboard
epic: flashy-dashboard
feature: nyan-banner
wave: 1
---

# Nyan Banner

**Design:** .beastmode/artifacts/design/2026-04-04-flashy-dashboard.md

## User Stories

1. As a user, I want the beastmode ASCII banner displayed in the dashboard header with nyan cat rainbow colors scrolling across the characters, so that the dashboard has visual personality and is immediately recognizable.

2. As a user, I want the rainbow colors to shift across the banner every 80ms (matching the spinner tick rate), so that the banner has a smooth, continuous nyan-cat-trail animation effect.

## What to Build

A new `NyanBanner` React component that renders the 2-line beastmode ASCII block-character art with continuously cycling rainbow colors.

**Color cycling engine:** A pure function that maps each non-space character to one of 6 nyan cat stripe colors based on `(charIndex + tickOffset) % 6`. The 6 colors are Red (#FF0000), Orange (#FF9008), Yellow (#F6FF00), Green (#7CFF27), Cyan (#5FFBFF), Purple (#6400FF). Space characters pass through uncolored. Both banner lines share the same tick offset so vertical stripes stay coherent.

**Animation loop:** A React effect that increments the tick offset every 80ms (matching the existing spinner tick rate). The component re-renders each tick, applying the shifted color palette to every character.

**Banner text:** The 2-line ASCII art from the old session-start hook:
- Line 1: `█▄▄ █▀▀ ▄▀█ █▀▀ ▀█▀ █▀▄▀█ █▀█ █▄▀ █▀▀`
- Line 2: `█▄█ ██▄ █▀█ ▄▄█  █  █ ▀ █ █▄█ █▀▄ ██▄`

(Version suffix stripped per design decision.)

**Rendering:** Each character is wrapped in an Ink `<Text>` element with a hex `color` prop. Ink 6 + chalk 5 support truecolor natively. No fallback needed.

**Integration into ThreePanelLayout header:** The banner replaces the current plain cyan "beastmode" text. Watch status (green/red) and dimmed clock remain right-aligned on the first banner line.

## Acceptance Criteria

- [ ] Banner renders the 2-line ASCII block art in the dashboard header
- [ ] Each non-space character cycles through the 6 nyan rainbow colors
- [ ] Colors shift smoothly every 80ms with a visible wave/trail effect
- [ ] Space characters remain uncolored (no color bleed)
- [ ] Both lines use the same tick offset (vertical stripe coherence)
- [ ] Watch status and clock remain right-aligned on the first banner line
- [ ] Unit tests cover: color assignment per character index, offset wrapping at palette boundary, space-skipping behavior
