# Release: handoff-link-fix

**Version:** v0.14.34
**Date:** 2026-03-08

## Highlights

Fixes a bug where checkpoint handoff links used file paths (e.g., `.beastmode/state/design/...`) instead of feature names, causing the receiving phase to reject them with a "looks like a file path" error.

## Fixes

- Removed contradictory "Next Step" section from `visual-language.md` that specified `<resolved-artifact-path>` format, conflicting with checkpoint templates that correctly use `<feature>` and worktree-manager's path rejection logic

## Full Changelog

- fix: remove "Next Step" section from visual-language.md (contradicts checkpoint handoff format)
