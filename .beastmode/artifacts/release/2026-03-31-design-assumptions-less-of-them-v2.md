---
phase: release
slug: design-assumptions-less-of-them-v2
bump: minor
---

# Release: design-assumptions-less-of-them-v2

**Version:** v0.48.0
**Date:** 2026-03-31

## Highlights

Design phase no longer requires a slug argument upfront. The skill starts with a blank slate, walks the decision tree, and derives the slug collaboratively at the end. The CLI handles post-dispatch rename of worktree, branch, manifest, and artifacts.

## Features

- Slugless design entry: `beastmode design` takes no arguments, generates random hex temp slug, asks "What are you trying to solve?" before any codebase exploration
- Slug proposal gate: design checkpoint proposes a slug after decision tree completion, user confirms or overrides via gated decision
- Post-dispatch rename: CLI reads real slug from output.json and renames worktree dir, git branch, manifest file, manifest internals, and PRD artifact
- Auto-suffix collision handling: `-v2` through `-v99` when slug collides with existing worktree/branch
- Graceful rename failure: system continues under hex name if rename fails

## Fixes

- Renamed artifacts from `slugless-design` to `design-assumptions-less-of-them-v2` for consistency

## Full Changelog

- `49736f1` design(slugless-design): checkpoint
- `fa57084` plan(slugless-design): checkpoint
- `367adf7` fix: rename artifacts from slugless-design to design-assumptions-less-of-them-v2
- `d0c5a67` implement(slug-proposal-gate): checkpoint
- `825270c` implement(slugless-entry): checkpoint
- `4c30edb` implement(post-dispatch-rename): checkpoint
- `45742be` validate(design-assumptions-less-of-them-v2): checkpoint
