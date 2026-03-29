# Release: task-runner-adherence

**Version:** v0.14.34
**Date:** 2026-03-08

## Highlights

Tightened HARD-GATE contract across all 5 skill files to require TodoWrite as the first tool call, making task-runner execution verifiable and harder to skip.

## Features

- feat: rewrite HARD-GATE blocks in all 5 SKILL.md files to specify TodoWrite as mandatory first tool call
- feat: add "Do not skip this for simple tasks" anti-rationalization line to all HARD-GATE blocks

## Full Changelog

All changes are in `skills/*/SKILL.md` HARD-GATE blocks:
- "Read" → "Execute" (action verb, not comprehension verb)
- Added "Your FIRST tool call MUST be TodoWrite with parsed phases from below."
- Added "Do not output anything else first."
- Added "Do not skip this for 'simple' tasks."
- Per-skill constraint lines preserved in all files
