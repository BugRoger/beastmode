# Release: remove-context-handling

**Version:** v0.14.36
**Date:** 2026-03-08

## Highlights

Removes all context window estimation, context reporting, status line workarounds, and threshold-based transition logic. Auto-transitions now chain unconditionally via Skill() calls. Simplifies the plugin by eliminating an entire subsystem that depended on unreliable heuristics.

## Chores

- Deleted `skills/_shared/context-report.md` and `skills/_shared/visual-language.md`
- Deleted `hooks/context-bridge-hook.sh` and `hooks/context-bridge-statusline.sh`
- Removed PostToolUse hook from `hooks/hooks.json`
- Removed phase indicator line from all 5 prime phases
- Removed context report step and simplified auto transitions in all 5 checkpoint phases
- Simplified `skills/_shared/transition-check.md` — removed threshold logic
- Simplified `skills/_shared/3-checkpoint-template.md` — removed context report step
- Removed `context_threshold` from both config.yaml files
- Removed phase indicator reference from both BEASTMODE.md files
- Updated L1/L2 knowledge hierarchy docs (DESIGN.md, phase-transitions.md, guidance-authority.md, workflow.md, core-directories.md)
- Deleted L2 docs: `context-threshold.md`, `context-reports.md`
- Removed Context Bridge section from README.md

## Full Changelog

35 files changed, 849 insertions, 422 deletions across 9 implementation tasks in 3 waves. 3 auto-fix deviations (stale knowledge hierarchy references).

## Artifacts

- Design: .beastmode/state/design/2026-03-08-remove-context-handling.md
- Plan: .beastmode/state/plan/2026-03-08-remove-context-handling.md
- Validate: .beastmode/state/validate/2026-03-08-remove-context-handling.md
