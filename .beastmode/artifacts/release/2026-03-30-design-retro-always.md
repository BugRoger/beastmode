---
phase: release
slug: design-retro-always
bump: patch
---

# Release: design-retro-always

**Bump:** patch
**Date:** 2026-03-30

## Highlights

Design phase retro now always runs instead of being skipped by the Quick-Exit Check. A single blockquote directive in the design checkpoint ensures PRD decisions are always captured in the knowledge hierarchy.

## Features

- Design checkpoint now includes a `SKIP SECTION` directive that bypasses the Quick-Exit Check for retro, ensuring every design session produces L2/L3 knowledge records

## Full Changelog

- `adc82e6` design(design-retro-always): checkpoint
- `17abca3` plan(design-retro-always): checkpoint
- `b2e9278` implement(design-retro-always): checkpoint
