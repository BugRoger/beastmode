---
phase: release
slug: npx-installer
epic: npx-installer
bump: minor
---

# Release: npx-installer

**Bump:** minor
**Date:** 2026-04-06

## Highlights

Adds `npx @anthropic-ai/claude-code-beastmode install` and `uninstall` commands for zero-friction plugin setup — no manual config editing required.

## Features

- feat(install-command): add CLI entry point
- feat(install-command): add install orchestrator
- feat(install-command): add JSON config merger
- feat(install-command): add bun auto-installer
- feat(install-command): add root package.json and version reader
- feat(install-command): add CLI linker
- feat(install-command): add verification module
- feat(install-command): add prerequisite checker
- feat(uninstall-command): add uninstall to CLI dispatcher
- feat(uninstall-command): add uninstall orchestrator
- feat(uninstall-command): add config remover
- feat(readme-update): add system requirements, npx install command, and uninstall section

## Full Changelog

design(npx-installer): checkpoint → plan(npx-installer): checkpoint → implement(npx-installer-readme-update): checkpoint → implement(npx-installer-install-command): checkpoint → implement(npx-installer-uninstall-command): checkpoint → validate(npx-installer): checkpoint
