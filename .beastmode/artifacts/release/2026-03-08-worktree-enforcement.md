# Release: worktree-enforcement

**Version:** v0.14.32
**Date:** 2026-03-08

## Highlights

Three-layer worktree enforcement prevents Claude from rationalizing its way out of mandatory worktree creation. HARD-GATE blocks in all five phase files, L0 prime directive, and anti-rationalization context in Assert Worktree.

## Features

- **HARD-GATE worktree enforcement** — `<HARD-GATE>` blocks before worktree steps in all 5 phase files (design/1-execute, plan/implement/validate/release 0-prime) explicitly state there are no "lightweight" exceptions
- **L0 worktree rule** — BEASTMODE.md Workflow section now includes `NEVER skip worktree creation` as a prime directive
- **Assert Worktree anti-rationalization** — worktree-manager.md documents the known failure mode where Claude judges tasks as "lightweight" and skips worktree creation

## Full Changelog

- `.beastmode/BEASTMODE.md` — Added worktree rule to Workflow section
- `skills/design/phases/1-execute.md` — Added HARD-GATE before worktree creation step
- `skills/plan/phases/0-prime.md` — Added HARD-GATE before worktree discovery step
- `skills/implement/phases/0-prime.md` — Added HARD-GATE before worktree discovery step
- `skills/validate/phases/0-prime.md` — Added HARD-GATE before worktree discovery step
- `skills/release/phases/0-prime.md` — Added HARD-GATE before worktree discovery step
- `skills/_shared/worktree-manager.md` — Added known failure mode context to Assert Worktree
