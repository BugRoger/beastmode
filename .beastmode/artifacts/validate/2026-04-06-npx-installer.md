---
phase: validate
slug: npx-installer
epic: npx-installer
status: passed
---

# Validation Report: npx-installer

## Status: PASS

### Tests (npx-cli unit — `node --test`)

- **37 passed**, 0 failed
- Suites: bun-installer, cli-linker, config-merger, config-remover, plugin-copier, prereqs, verify

### Tests (npx-cli integration — `node --test`)

- **14 passed**, 0 failed
- Covers: fresh install, bun provisioning, bun skip, re-install update, post-install verification, verification failure, install failure diagnostics, uninstall removal, uninstall preserves data, uninstall when not installed, uninstall without bun

### Tests (CLI vitest — `bun --bun vitest run`)

- **98 files passed**, 4 file-level failures (pre-existing)
- **1522 individual tests passed**
- Pre-existing failures (baseline): `field-mapping-fix.integration.test.ts`, `reconciliation-loop.integration.test.ts`, `github-sync.test.ts`, `reconcile.test.ts` — all `globalThis.Bun` readonly assignment errors, not in scope

### Types (`bun x tsc --noEmit`)

- 5 errors — all pre-existing in untouched files (matches baseline)
  - `github-discovery.test.ts`: 4 unused declarations
  - `interactive-runner.test.ts`: 1 unused import

### Lint

Skipped — not configured.

### Custom Gates

None configured.
