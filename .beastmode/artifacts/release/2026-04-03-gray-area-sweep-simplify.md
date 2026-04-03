---
phase: release
slug: gray-area-sweep-simplify
epic: gray-area-sweep-simplify
bump: minor
---

# Release: gray-area-sweep-simplify

**Bump:** minor
**Date:** 2026-04-03

## Highlights

Simplified the gray-area sweep in the design skill from a multi-select batch loop to a single-question-at-a-time serial flow. Gray areas are now presented one at a time in priority order (most ambiguous first), with bail-out via the built-in Other field instead of dedicated skip options.

## Features

- Replaced multi-select batch presentation with single-question serial flow for gray area sweep
- Added ambiguity-based priority ordering for gray area presentation
- Simplified bail-out mechanism — Other field replaces dedicated "Skip" and "You decide" options
- Removed loop re-confirmation overhead between batches

## Full Changelog

v0.65.0...feature/gray-area-sweep-simplify
