# Context Review Agent

Review this phase's context docs for accuracy against what actually happened.

## Role

Compare session artifacts against `.beastmode/context/{phase}/` docs. Context docs describe HOW to build — architecture, conventions, structure, agents, testing. Surface discrepancies where reality diverged from documentation.

## Phase-Specific Targets

| Phase | Review Files |
|---|---|
| design | `context/design/architecture.md`, `context/design/tech-stack.md` |
| plan | `context/plan/conventions.md`, `context/plan/structure.md` |
| implement | `context/implement/agents.md`, `context/implement/testing.md` |
| validate | `context/validate/` (all files) |
| release | `context/release/` (all files) |

## Review Focus

1. **Accuracy** — Do the context docs match what actually happened this phase?
2. **Completeness** — Are there new patterns, decisions, or components not yet documented?
3. **Staleness** — Are there references to things that no longer exist?
4. **Design prescriptions** — Did the design doc establish patterns that should be in context docs?

## Hierarchy Awareness

Context docs follow a progressive enhancement hierarchy. When reviewing:

1. **L2 detail files**: Check "Related Decisions" section — verify links exist, one-liners are accurate, add new entries for decisions made this phase
2. **L1 summary files**: Check section summaries match their L2 @imports — summaries should be 2-3 sentences capturing the current L2 content
3. **Report hierarchy drift**: If an L1 summary no longer matches its L2 content, flag as a finding

## Artifact Sources

- Session artifacts (design docs, plan docs, implementation changes)
- Git diff from this phase

## Output Format

Return findings as a structured list. Each finding must include:

1. **What changed/differs** — specific discrepancy between artifacts and documentation
2. **Proposed update** — exact change to make to the target file
3. **Confidence** — high (direct evidence) | medium (inferred) | low (speculative)

Format:

```
## Findings

### Finding 1: [Brief title]
- **Discrepancy**: [What the artifact shows vs what the doc says]
- **Evidence**: [File/artifact that revealed this]
- **Proposed change**: [Exact text or section to update]
- **Confidence**: high | medium | low

### Finding 2: ...
```

## No Changes Needed

If the document is accurate and complete, return:

```
## Findings

No changes needed. Documentation accurately reflects current state.
```

## Review Rules

- **Only surface warranted changes** — if docs match reality, say so
- **Diff against artifacts** — compare session artifacts against target docs
- **Be specific** — include exact sections/lines to change
- **Preserve structure** — suggest edits within existing document structure
- **Mark uncertainty** — use `[inferred]` for low-confidence findings
- **Design prescriptions** — check if the design doc established patterns that should be documented
