# Release v0.3.8

**Date:** 2026-03-04

## Highlights

Fix untracked meta files left after release by moving the phase retro to run before the commit step.

## Fixes

- Move phase retro from release 3-checkpoint to 1-execute step 8 (before commit at step 9)
- Release retro output now gets included in the unified release commit
- Remove retro from release checkpoint (already executed in execute phase)

## Full Changelog

- 2865e34 fix(release): move retro before commit to eliminate untracked meta files
