---
phase: release
slug: gray-area-sweep-simplify
epic: gray-area-sweep-simplify
bump: patch
---

# Release: gray-area-sweep-simplify

**Version:** v0.66.1
**Date:** 2026-04-03

## Highlights

Simplified the design skill's gray-area sweep from a batched multi-select loop to a serial one-at-a-time flow, reducing interaction friction and removing unnecessary confirmation steps.

## Chores

- Replaced multi-select `AskUserQuestion` gray-area loop with serial single-question presentation
- Removed dedicated "Skip" and "You decide" options — built-in Other field covers both
- Gray areas now presented in priority order (most ambiguous first)
- Sweep terminates naturally when no gray areas remain, no extra confirmation needed

## Full Changelog

- `ba3be67` design(gray-area-sweep-simplify): checkpoint
- `d0db10c` design(gray-area-sweep-simplify): checkpoint
- `7fe74c3` plan(gray-area-sweep-simplify): checkpoint
- `6852a92` implement(gray-area-sweep-simplify-sweep-rewrite): checkpoint
- `a91bb24` validate(gray-area-sweep-simplify): checkpoint
