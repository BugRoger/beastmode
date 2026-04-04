---
phase: plan
slug: dashboard-polish
epic: dashboard-polish
feature: gradient-smooth
wave: 2
---

# Gradient Smooth

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-polish.md`

## User Stories

4. As a user, I want the banner gradient to use 256-step smooth interpolation between the nyan cat rainbow colors with wide bands, so the animation looks like a slow, buttery color wash instead of a flickering rainbow.

## What to Build

Replace the hard-switch 6-color palette in the nyan color engine with a 256-step interpolated palette:

- **Interpolation:** Linear RGB interpolation between adjacent nyan cat rainbow colors. With 6 colors and ~43 steps per transition, this produces a 256-entry lookup table where neighboring entries differ by only a few RGB units.

- **Mapping function:** The `nyanColor()` function changes from `palette[index % 6]` to `palette[(charIndex + tickOffset) % 256]`. The wider modulus naturally produces slow-drifting wide color bands.

- **Tick interval unchanged:** Keep the existing 80ms tick. The 256-step width means one full palette rotation takes ~20 seconds — slow enough to look like a buttery color wash.

- **Palette source colors unchanged:** The 6 nyan cat rainbow colors remain the interpolation anchors. Only the step resolution changes.

Update any existing tests that assert on palette size, color values, or the nyanColor modulus.

## Acceptance Criteria

- [ ] Interpolated palette has exactly 256 entries
- [ ] Adjacent palette entries differ by small RGB deltas (smooth transitions)
- [ ] `nyanColor()` uses modulo 256 instead of modulo 6
- [ ] Full palette rotation takes approximately 20 seconds at 80ms tick
- [ ] Existing nyan-colors tests updated to match new palette behavior
