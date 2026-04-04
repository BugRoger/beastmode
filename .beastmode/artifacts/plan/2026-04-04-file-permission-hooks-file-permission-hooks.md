---
phase: plan
slug: fe70d5
epic: file-permission-hooks
feature: file-permission-hooks
wave: 3
---

# File Permission Hooks

**Design:** .beastmode/artifacts/design/2026-04-04-fe70d5.md

## User Stories

2. As a user, I want Claude Code's permission dialog for `.claude/` file writes to be interceptable by a prompt hook so that the pipeline can auto-allow or auto-deny based on my prose instructions.

## What to Build

PreToolUse prompt hooks for Write and Edit tools with `if`-field path filtering, written to `settings.local.json` at dispatch time alongside HITL hooks.

**Hook generation:** Two new builder functions that produce `HookEntry` objects for Write and Edit tools respectively. Each hook entry includes:
- `matcher`: the tool name ("Write" or "Edit")
- `if`: permission-rule syntax filtering to `.claude/**` paths (e.g., `Write(.claude/**)`)
- `hooks`: array with a single prompt hook entry containing the user's category prose injected into a file-permission-specific prompt

**Prompt construction:** A new prompt builder (analogous to `buildPrompt()` for HITL) that instructs the LLM to evaluate file permission decisions. The prompt receives `$ARGUMENTS` (full tool input — file path and content/diff) and the user's category prose. Three possible outcomes: `permissionDecision: "allow"` (auto-allow), `permissionDecision: "deny"` (hard deny), or `permissionDecision: "allow"` with no `updatedInput` (defer to native dialog).

**Hook lifecycle integration:** Extend `writeHitlSettings()` (or create a parallel `writeFilePermissionSettings()`) to write the Write/Edit hooks alongside AskUserQuestion hooks. Extend `cleanHitlSettings()` (or create a parallel cleaner) to remove file-permission hooks between dispatches using the Write/Edit matchers as identifiers.

**Dispatch integration:** Update the pipeline runner and manual dispatch paths to read `file-permissions` config and write file-permission hooks at Step 3 (alongside HITL hooks). The hooks use the same `claudeDir` target and atomic write pattern.

**Path mapping:** Hardcoded per category. `claude-settings` maps to `.claude/**`. The category-to-path mapping lives in the CLI, not in config.

## Acceptance Criteria

- [ ] PreToolUse hook entries generated for Write and Edit tools with correct `if` conditions
- [ ] Hook prompt includes user's category prose and defines three-outcome decision model
- [ ] Hooks written to `settings.local.json` at dispatch time alongside HITL hooks
- [ ] Hooks cleaned between dispatches (Write/Edit matchers removed)
- [ ] Non-file-permission hooks preserved during clean/write cycles
- [ ] Pipeline runner, phase command, and watch command all write file-permission hooks
- [ ] Unit tests cover hook generation, prompt construction, lifecycle, and coexistence
