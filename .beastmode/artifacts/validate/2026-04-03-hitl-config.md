---
phase: validate
slug: hitl-config
epic: hitl-config
status: passed
---

# Validation Report

## Status: PASS

### Tests

**HITL-specific tests: 46/46 PASS**

| Test file | Pass | Fail |
|-----------|------|------|
| hitl-log.test.ts | 18 | 0 |
| hitl-prompt.test.ts | 8 | 0 |
| hitl-settings.test.ts | 10 | 0 |
| config.test.ts | 10 | 0 |

**Full suite: 976/999 (23 failures)**

All 23 failures are pre-existing on `main` (21 failures) plus 2 test-isolation failures that only manifest when the full suite runs concurrently (shared temp dirs between `manifest-store.test.ts` and `config.test.ts`). Zero HITL-related regressions.

### Lint

Skipped — no lint command configured.

### Types

Skipped — no type-check command configured (TypeScript used via Bun runtime).

### Custom Gates

#### Gate 1: Config schema in config.yaml — PASS

- `HitlConfig` interface defined in `config.ts` with per-phase prose fields, model, timeout
- Init template (`skills/beastmode/assets/.beastmode/config.yaml`) seeds `hitl:` block with "always defer to human" defaults
- `loadConfig()` parses `hitl:` section with proper fallbacks to `DEFAULT_HITL_PROSE`

#### Gate 2: Prompt hook generation — PASS

- `hitl-prompt.ts` builds PreToolUse prompt hook entry targeting `AskUserQuestion`
- Prompt includes: HITL instructions, `$ARGUMENTS` input spec, all-or-nothing multi-question logic, fail-open rule, JSON response format
- `getPhaseHitlProse()` extracts phase-specific prose from config with fallback

#### Gate 3: Decision logging hook — PASS

- `hitl-log.ts` implements PostToolUse command hook for AskUserQuestion
- Reads `TOOL_INPUT`/`TOOL_OUTPUT` env vars, detects auto vs human tag
- Appends structured markdown to `.beastmode/artifacts/<phase>/hitl-log.md`
- Silent exit on any error (fail-open)

#### Gate 4: Skill contract enforcement — PASS

Three enforcement layers confirmed:
1. `BEASTMODE.md` L0 constraint: "All user input during phase sessions MUST use `AskUserQuestion`"
2. Guiding principle in all 5 skill files: "All user input via `AskUserQuestion` — freeform print-and-wait is invisible to HITL hooks"
3. Design context captures the rationale

#### Gate 5: Retro integration — PASS

- `agents/retro-context.md` section 4 "HITL Pattern Analysis" implemented
- Parses `hitl-log.md` entries, groups by question text
- Identifies repetitive human decisions (2+ same answer)
- Generates copy-paste `config.yaml` snippets for automation candidates

#### Gate 6: Cross-cutting consistency — PASS

- `.gitignore` includes `.claude/settings.local.json` — no git noise
- `settings.json` has Stop hook only; HITL hooks go to `settings.local.json` (PreToolUse/PostToolUse) — different events, no conflict
- `phase.ts` calls `cleanHitlSettings()` before `writeHitlSettings()` — no stale state between dispatches
- Watch loop dispatches via `beastmode <phase>` shell command, which goes through `phase.ts`, so all dispatch paths get HITL hooks
- Fail-open documented and implemented: hook errors → silent exit(0), prompt hook uncertainty → defer to human
