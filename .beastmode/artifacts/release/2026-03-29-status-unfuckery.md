# Release: status-unfuckery

**Version:** v0.35.0
**Date:** 2026-03-29

## Highlights

Fixes the status command to show accurate phase data. Manifest structural validation rejects malformed manifests, output.json-based phase detection replaces legacy artifact scanning, and the watch command no longer re-seeds stale pipeline state.

## Features

- **Manifest structural validation** — Scanner validates required fields (design, features, lastUpdated) with correct types; malformed manifests are skipped with a warning instead of silently corrupting status output
- **Output.json phase detection** — Phase derivation uses checkpoint output.json files (state/<phase>/YYYY-MM-DD-<slug>.output.json) instead of legacy directory artifact scanning; waterfall logic: release > validate > implement-done > implement > plan > design
- **Watch command cleanup** — Removed seedPipelineState function that copied stale manifests from state/plan/ into pipeline/; removed dead scanEpicsInline fallback; watch loop imports state-scanner directly

## Full Changelog

- 3f83a32 validate(status-unfuckery): checkpoint
- 9e85e43 implement(manifest-validation): checkpoint
- 895ff1a implement(manifest-validation): checkpoint
- b422cf8 implement(output-json-phase-detection): checkpoint
- 9740b24 implement(watch-command-cleanup): checkpoint
- b0dbde5 plan(status-unfuckery): checkpoint
- 9f6d5d2 design(status-unfuckery): checkpoint
