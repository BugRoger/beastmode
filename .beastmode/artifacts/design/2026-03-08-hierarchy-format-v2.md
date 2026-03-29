# Hierarchy Format v2

## Goal

Align L0-L2 format to minimal bullet style. No prose. Scannable. Consistent across Context and Meta domains.

## Approach

Drop all prose paragraphs from L0/L1/L2. Convert to dash-bullet format. L2 adds rationale suffix per bullet. Meta and Context use identical format at every level. L3 unchanged.

## Key Decisions

### Locked Decisions

| Decision | Choice |
|----------|--------|
| L0 format | Full bullet conversion, no prose |
| L1 format | `## Section` + bullets only, no paragraphs |
| L2 format | Bullets with rationale after dash |
| L3 format | Keep current structured format (Context/Decision/Rationale/Source for context; Observation sections for meta) |
| Meta vs Context | Identical format at L1 and L2 |

### Claude's Discretion

- Exact wording when converting prose paragraphs to bullets
- Ordering of bullets within sections
- Whether to merge redundant bullets during conversion

## Format Spec

### L0 — System Manual (autoloaded)

```markdown
# Beastmode

- [directive bullet]
- [directive bullet]

## Section
- [bullet]
- [bullet]
```

No prose. No sub-headings deeper than `##`. Pure bullets under section headers.

### L1 — Phase Summaries (loaded at prime)

```markdown
# {Phase} Context  |  # {Phase} Meta

## {Topic}
- [bullet — rule or fact]
- [bullet — rule or fact]
```

No summary paragraphs. No description paragraphs. `## Section` + bullets. Same format for both Context and Meta L1 files.

### L2 — Full Detail (on-demand)

```markdown
# {Topic}

## {Sub-topic}
- [bullet with rationale — explains why after the dash]
- [bullet with rationale]
```

Same bullet structure but each bullet carries its rationale after a dash. No prose paragraphs. More bullets per section than L1. Same format for Context and Meta L2 files.

### L3 — Records (linked from L2)

Unchanged.

- **Context L3**: Context / Decision / Rationale / Source
- **Meta L3**: Context / Observation / Rationale / Source / Confidence

## Files Affected

- **L0**: `.beastmode/BEASTMODE.md` (1 file)
- **L1 Context**: `DESIGN.md`, `IMPLEMENT.md`, `PLAN.md`, `RELEASE.md`, `VALIDATE.md` (5 files)
- **L1 Meta**: `DESIGN.md`, `IMPLEMENT.md`, `PLAN.md`, `RELEASE.md`, `VALIDATE.md` (5 files)
- **L2 Context**: ~30 files across `context/{phase}/{topic}.md`
- **L2 Meta**: ~10 files across `meta/{phase}/process.md` and `meta/{phase}/workarounds.md`
- **L3**: No changes

## Acceptance Criteria

- [ ] L0 has zero prose paragraphs — only bullets under section headers
- [ ] L1 files have zero prose paragraphs — `## Section` + bullets pattern
- [ ] L2 files have zero prose paragraphs — bullets carry rationale after dash
- [ ] L3 files unchanged
- [ ] Meta L1/L2 format identical to Context L1/L2 format
- [ ] No information loss — every rule/fact survives migration

## Testing Strategy

Visual inspection. Grep for multi-sentence paragraphs in L0/L1/L2 files post-migration.

## Deferred Ideas

None.
