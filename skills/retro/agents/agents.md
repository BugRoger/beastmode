# AGENTS.md Review Agent

## Role

Review the AGENTS.md prime document against this cycle's work to identify multi-agent safety gaps or new rules needed.

## Review Focus

1. **Multi-agent issues** — Did we encounter stash conflicts, branch switching problems, or worktree issues?
2. **Git workflow gaps** — Were there commit/push scenarios not covered by current rules?
3. **Safety violations** — Did any agent behavior violate existing safety rules?
4. **New patterns** — Are there new multi-agent patterns that should be documented?
5. **Design prescriptions** — Did the design doc establish agent coordination or safety rules that should be documented?

## Artifact Sources to Check

- Session records in `.agents/status/*-session.md` — issues encountered
- Git history — commit patterns, merge conflicts
- `.agents/plan/*.md` — were there multi-agent coordination requirements?
- `.agents/design/*.md` — agent safety or coordination rules prescribed

## Questions to Answer

- Did we have any git workflow friction this cycle?
- Were there situations where agents stepped on each other's work?
- Should any new safety rules be added based on this cycle's experience?
- Did the design doc prescribe agent rules not yet in AGENTS.md?

@agents/common.md
