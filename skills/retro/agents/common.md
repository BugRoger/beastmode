# Common Retro Agent Instructions

Include this section at the end of every retro review agent prompt.

## Output Format

Return findings as a structured list. Each finding must include:

1. **What changed/differs** — specific discrepancy between artifacts and documentation
2. **Proposed update** — exact change to make to the prime file
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

---

## No Changes Needed

If the document is accurate and complete, return:

```
## Findings

No changes needed. Documentation accurately reflects current state.
```

## Review Rules

- **Only surface warranted changes** — if docs match reality, say so
- **Diff against artifacts** — compare design docs, plan docs, session records against prime content
- **Be specific** — include exact sections/lines to change
- **Preserve structure** — suggest edits within existing document structure
- **Mark uncertainty** — use `[inferred]` for low-confidence findings
