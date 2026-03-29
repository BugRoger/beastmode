# Directory Rename

**Design:** .beastmode/state/design/2026-03-29-manifest-file-management.md

## User Stories

5. As an operator, I want .beastmode/artifacts/ for committed skill outputs and .beastmode/state/ for gitignored pipeline manifests, so that the directory names explain what they contain.

## What to Build

Atomic directory restructure that separates committed skill artifacts from gitignored pipeline state:

**Rename `.beastmode/state/` to `.beastmode/artifacts/`** — This directory holds committed skill outputs (PRDs, feature plans, implementation reports, validation reports, release notes). The name "artifacts" accurately describes immutable outputs of each phase.

**Rename `.beastmode/pipeline/` to `.beastmode/state/`** — This directory holds gitignored pipeline manifests. The name "state" accurately describes mutable runtime state owned by the CLI.

**Update .gitignore** — Add `.beastmode/state/` (new location for gitignored manifests). Remove `.beastmode/pipeline/` entry.

**Delete orphan manifests** — Remove ~20 legacy `.manifest.json` files that currently live in `artifacts/plan/` (formerly `state/plan/`). These are dead copies from before the CLI owned manifest lifecycle.

**Update all path references** — Every CLI source file, skill phase file, context doc, and meta doc that references `state/<phase>/` or `pipeline/` must be updated to the new paths. The PRD identifies ~49 context docs plus all skill checkpoint files and CLI source modules.

This is a big-bang migration in one atomic commit. No backwards compatibility shims — clean cut.

## Acceptance Criteria

- [ ] `.beastmode/artifacts/` exists with all former `state/` contents (design/, plan/, implement/, validate/, release/, research/)
- [ ] `.beastmode/state/` exists with all former `pipeline/` contents (manifest JSON files)
- [ ] `.gitignore` ignores `.beastmode/state/` and no longer references `.beastmode/pipeline/`
- [ ] No `.manifest.json` files exist in `artifacts/plan/`
- [ ] Zero references to `.beastmode/pipeline/` in CLI source or skills
- [ ] All CLI source path constants use `artifacts/` for skill outputs
- [ ] All skill checkpoint files reference `artifacts/<phase>/` not `state/<phase>/`
- [ ] Context and meta docs use updated vocabulary
