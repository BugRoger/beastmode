# Release v0.11.2

**Date:** 2026-03-05

## Highlights

ASCII art banner for session-start hook with random color themes and updated taglines.

## Features

- ASCII art banner using cfonts "tiny" half-block characters (`█▀▄`) replacing plain text `==========` banner
- Six random color themes per session: ice, sunset, emerald, purple, amber, and rainbow (full HSV hue sweep)
- Truecolor ANSI rendering with plain-text fallback for non-truecolor terminals
- Trailing `▄` dot decoration as visual separator on line 2
- 14 new taglines aligned with beastmode's workflow identity (replaced generic quotes)
- Banner art added to README.md header

## Full Changelog

- `hooks/session-start.sh`: Complete rewrite — ASCII art, Python-based truecolor renderer, random theme selection, new taglines
- `README.md`: Replaced `# beastmode` heading with ASCII art code block
