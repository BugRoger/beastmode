---
phase: release
slug: fix-hook-paths
epic: fix-hook-paths
bump: minor
---

# Release: fix-hook-paths

**Bump:** minor
**Date:** 2026-04-06

## Highlights

Replaces fragile shell `$(dirname "$0")` substitution in hook builders with Node.js `import.meta.dirname`, making hook paths absolute and portable. Removes the obsolete Stop hook from both project settings and plugin hooks manifest.

## Features

- Replace shell substitution with `import.meta.dirname` in HITL hook builders
- Replace shell substitution with `import.meta.dirname` in file-permission hook builder

## Fixes

- Remove Stop hook from project settings
- Remove Stop hook from plugin hooks manifest

## Full Changelog

- `2fd1ee3b` feat(fix-hook-paths): replace shell substitution with import.meta.dirname in HITL hook builders
- `48582347` feat(fix-hook-paths): replace shell substitution with import.meta.dirname in file-permission hook builder
- `c539f540` test(fix-hook-paths): add cucumber profile and restore BDD files for absolute hook paths
- `9060e401` test(fix-hook-paths): add BDD scenarios for absolute hook path resolution
- `a24e326c` fix(remove-static-hooks): remove Stop hook from project settings
- `06780f7f` fix(remove-static-hooks): remove Stop hook from plugin hooks manifest
- `7694a07c` test(remove-static-hooks): add integration test for static hook removal
- `d6e39481` implement(fix-hook-paths-absolute-hook-paths): checkpoint
- `e3e6a5f6` implement(fix-hook-paths-remove-static-hooks): checkpoint
- `932ee443` plan(fix-hook-paths): checkpoint
- `d60da5dc` design(fix-hook-paths): checkpoint
- `059ef9d8` validate(fix-hook-paths): checkpoint
