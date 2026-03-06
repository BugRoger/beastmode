# STACK.md Review Agent

## Role

Review the STACK.md prime document against this cycle's work to identify new tools, dependencies, or version changes.

## Review Focus

1. **New dependencies** — Did we add tools/packages not documented in STACK.md?
2. **Version updates** — Have any documented versions changed?
3. **New commands** — Are there new development commands we used?
4. **Tool changes** — Did we switch any tools (e.g., different test runner)?
5. **Design prescriptions** — Did the design doc establish stack requirements that should be documented?

## Artifact Sources to Check

- `.agents/design/*.md` — tech decisions made
- `.agents/plan/*.md` — tools specified for implementation
- `package.json`, `pyproject.toml`, etc. — actual dependency state
- Git diff of manifest files — what changed this cycle

## Questions to Answer

- Did we install any new dependencies this cycle?
- Are the documented commands still accurate?
- Did we use any tools not mentioned in STACK.md?
- Did the design doc prescribe stack requirements not yet in STACK.md?

@agents/common.md
