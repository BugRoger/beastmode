---
phase: release
slug: fe70d5
epic: file-permission-hooks
bump: minor
---

# Release: file-permission-hooks

**Bump:** minor
**Date:** 2026-04-04

## Highlights

Adds a file-permission system that generates Claude Code hooks from declarative config, controlling which files each phase can touch. Includes permission logging for Write/Edit operations and full integration test coverage.

## Features

- Config parsing for `file-permissions` section with category prose getter
- Seed `file-permissions` in init template
- Hook builders and prompt constructor for permission enforcement
- Integration with watch, phase, and pipeline runner dispatch
- Lifecycle and coexistence tests for hook management
- Integration test suite with cucumber scenarios (config parsing, hook generation, decision logging, lifecycle)
- Write/Edit log entry detection and formatting
- Unified PostToolUse event routing for file permission logging

## Fixes

- Atomic clean write and removal of type casts in hook builders
- Index signature for TypeScript compatibility in config types
- Mock module removal to prevent cross-file test pollution

## Full Changelog

- `f7c8d7d` design(file-permission-hooks): checkpoint
- `6b351a4` plan(file-permission-hooks): checkpoint
- `873ead1` implement(file-permission-hooks-integration-tests): checkpoint
- `86e9f38` feat: add config parsing integration scenarios
- `52612af` feat: add hook generation integration scenarios
- `cbc4449` feat: add decision logging integration scenarios
- `bb1d708` feat: add lifecycle integration scenarios
- `c24ea26` feat: add cucumber profile for file-permission integration tests
- `b436753` feat: add step definitions for integration tests
- `c745d50` feat: add FilePermissionsConfig type and extend BeastmodeConfig
- `a5db2d0` test: add config parsing tests for file-permissions section
- `ae8e03b` feat: add getCategoryProse getter function
- `cb59bad` feat: seed file-permissions section in init template
- `557fdcc` implement(file-permission-hooks-file-permission-config): checkpoint
- `1f3d30a` feat: add hook builders and prompt constructor
- `5f6eabc` fix: atomic clean write, remove type casts
- `b961059` test: add lifecycle and coexistence tests
- `b696de8` feat: integrate with watch command dispatch
- `b961059` feat: integrate with phase command dispatch
- `f22ed95` feat: integrate with pipeline runner dispatch
- `0d6492b` fix: add index signature for TypeScript compatibility
- `31dd184` fix: remove mock.module for hook modules to prevent cross-file pollution
- `6c8edc8` feat: add detection and formatting for Write/Edit log entries
- `e81ffa0` feat: route Write/Edit PostToolUse events through unified entry point
- `b6f45f4` implement(file-permission-hooks-file-permission-logging): checkpoint
- `7c5a727` validate(file-permission-hooks): checkpoint
