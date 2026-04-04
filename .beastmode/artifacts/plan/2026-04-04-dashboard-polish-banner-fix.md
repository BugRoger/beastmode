---
phase: plan
slug: dashboard-polish
epic: dashboard-polish
feature: banner-fix
wave: 2
---

# Banner Fix

**Design:** `.beastmode/artifacts/design/2026-04-04-dashboard-polish.md`

## User Stories

1. As a user, I want the banner to correctly spell "BEASTMODE" with trailing animated dots matching the README SVG, so the dashboard looks polished and consistent with the project branding.

## What to Build

Fix the ASCII banner text and add trailing animated dots:

- **Typo fix:** The BANNER_LINES constant has the block characters for "D" and "K" swapped — the "D" column currently renders K-shaped glyphs (`█▄▀/█▀▄`) and needs correction to D-shaped glyphs (`█▀▄/█▄▀`). Swap the appropriate character pairs so the banner reads "BEASTMODE" instead of "BEASTMOKE".

- **Trailing dots:** Append 15 `▄` characters (space-separated: `▄ ▄ ▄ ...`) to the second banner line. These dots animate with the same nyan gradient as the banner text — each dot gets a color from `nyanColor()` based on its character index and the current tick offset.

Update any existing tests that assert on BANNER_LINES content or banner text output.

## Acceptance Criteria

- [ ] Banner text reads "BEASTMODE" (not "BEASTMOKE")
- [ ] Second banner line has 15 trailing `▄` dot characters
- [ ] Trailing dots animate with the nyan gradient (same color engine as banner text)
- [ ] Existing banner tests updated to match corrected text
