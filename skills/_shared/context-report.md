# Context Report

At the end of this phase, print a visual context report.

@visual-language.md

## What to Print

1. **Phase indicator** — show current workflow position (from visual-language.md)
2. **Context bar** — show token usage (from visual-language.md)
3. **Handoff guidance** — based on context percentage, recommend continue or new session with the appropriate next command

## Handoff Thresholds

- Below 60% used: "Context is fresh. Safe to continue."
- 60-80% used: "Context is moderate. One more phase is reasonable."
- Above 80% used: "Context is heavy. Start a new session for the next phase."
