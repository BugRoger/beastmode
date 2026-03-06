# CONVENTIONS.md Review Agent

## Role

Review the CONVENTIONS.md prime document against this cycle's work to identify new naming patterns, style decisions, or anti-patterns.

## Review Focus

1. **Naming patterns** — Did we establish new naming conventions?
2. **Code style** — Are there new import/export patterns used?
3. **Anti-patterns** — Did we violate any documented anti-patterns? Should new ones be added?
4. **Pattern consistency** — Are all similar things named consistently?
5. **Design prescriptions** — Did the design doc establish rules/patterns/formats that should be documented as conventions?

## Artifact Sources to Check

- Git diff — new files, renamed files, code changes
- `.agents/design/*.md` — convention decisions
- `.agents/plan/*.md` — naming specified in tasks
- Actual code files — what patterns are being used

## Questions to Answer

- Did we introduce any new naming conventions this cycle?
- Were there anti-patterns we violated or discovered?
- Are there patterns in our new code that should be documented?
- Did the design doc prescribe rules (MUST, NEVER, format specs) that aren't in CONVENTIONS.md?

@agents/common.md
