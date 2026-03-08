# Output Format

**Date:** 2026-03-08
**Source:** state/design/2026-03-08-init-l2-expansion.md

## Context
Init agents previously produced their own output format, separate from what retro agents produce. This created format inconsistency -- init-written L2 files looked different from retro-written ones.

## Decision
Unify init and retro output formats. Writers produce ALWAYS/NEVER bullets in L2 files and Context/Decision/Rationale/Source records in L3. Synthesize agent produces L1 files with summary paragraph + ALWAYS/NEVER bullets + path reference. L2 templates use `[Populated by init or retro]` placeholders.

## Rationale
Single format across the system means retro can append to init-written files without reformatting. L1 format matches what retro's synthesize step produces, ensuring consistency whether context was bootstrapped by init or evolved by retro.
