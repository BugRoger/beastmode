# Step Renumbering Friction

## Observation 1
### Context
During github-phase-integration implementation, 2026-03-28. Every checkpoint file required inserting a "Sync GitHub" step between existing steps, which forced renumbering all downstream step headers.
### Observation
Inserting a step between existing numbered steps in checkpoint files always requires renumbering downstream steps. This is mechanical but error-prone — the release checkpoint had a pre-existing bug with duplicate step numbers (two "## 3" headers) that was discovered and fixed during this edit. Plans that insert steps should explicitly enumerate the renumbering cascade in task descriptions to prevent missed renumbers.
### Rationale
Step renumbering is a predictable side-effect of insertion that plans should account for. When plans say "add step N between existing steps," they should also say "renumber steps N+1 through M." The pre-existing duplicate numbering bug in release suggests this friction point has caused errors before.
### Source
skills/release/phases/3-checkpoint.md
### Confidence
[LOW] — first observation
