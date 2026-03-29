# Retro Report Format

## Goal

Make retro reports scannable and decision-friendly by showing what changes, why, and where — not just counts and one-liners.

## Approach

Redesign presentation templates in `skills/_shared/retro.md` to use a unified gate-aligned report with action-prefixed bullet lines. L1/L2 edits show actual content being changed. L3 records show one-sentence summaries.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grouping | Gate-aligned (context, records, promotions) | Mirrors approval flow — read in the order you approve |
| Detail level: L1/L2 | Actual content bullets (no prose) | Can't approve what you can't read |
| Detail level: L3 | One-sentence summary | L3 records are low-stakes, summary is sufficient |
| Report structure | Unified report with inline gates | Single top-to-bottom read, no jumping between steps |
| Approval granularity | Blanket Y/n per section | Less friction; improved detail makes blanket approval meaningful |

### Claude's Discretion

- Exact heading levels (### vs ####)
- Whether to use `---` separators between sections
- Wording of "Apply?" prompts

## Component Breakdown

### 1. Context Changes Section (Step 4)

Template for `retro.context-write` gate:

```
### Context Changes ({N} edits, {N} new)

~ {target file}
  - "{old text}" → "{new text}"
  + Section: "{new section title}"
  + "{new content being added}"

+ {target file} — new file
  + Section: "{section title}"

Apply context changes? [Y/n]
```

### 2. Meta Review Header (Step 7)

Replace the count-heavy "Meta Review Results" block with a section header that leads into detail sections.

If L2 edits exist, show them first:

```
### Retro: Meta Review

~ {target file}
  - "{old text}" → "{new text}"
  + Procedure: "{new rule text}"
```

If no L2 edits, just show the header:

```
### Retro: Meta Review
```

### 3. Records Section (Step 8)

Template for `retro.records` gate:

```
#### Records ({N} proposed)

>> {existing file} — Observation {N} [{domain}] [{confidence}]
   {one-sentence summary}

+ {new file} [{domain}] [{confidence}]
   {one-sentence summary}

Apply records? [Y/n]
```

### 4. Promotions Section (Step 9)

Template for `retro.promotions` gate:

```
#### Promotions ({N} candidates)

^ {entry title} — L3 → L1
  + Procedure: "{ALWAYS/NEVER rule text}"
  ({basis})

Apply promotions? [Y/n]
```

If none: `(none)` — skip the gate entirely.

## Visual Conventions

| Prefix | Meaning |
|--------|---------|
| `~` | Edit existing file |
| `+` | Create new file / add content |
| `>>` | Append to existing record |
| `^` | Promote up hierarchy |
| `-` | Line being changed (with `→` showing replacement) |
| `→` | Replacement indicator |

Indented lines under a prefix = the actual content or summary.

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/retro.md` | Replace presentation templates at steps 4, 7, 8, 9 |

No changes to:
- `agents/retro-meta.md` (agent output format unchanged)
- `agents/retro-context.md` (agent output format unchanged)
- `.beastmode/config.yaml` (gate mechanics unchanged)

## Acceptance Criteria

- [ ] Context changes show actual content being added/changed as bullets
- [ ] Meta L2 edits show actual content as bullets
- [ ] Meta L3 records show one-sentence summaries
- [ ] Promotions show the actual rule being promoted
- [ ] Report reads top-to-bottom without jumping between steps
- [ ] No changes to agent output formats
- [ ] No changes to gate mechanics
- [ ] Visual prefixes (~, +, >>, ^, -) used consistently

## Testing Strategy

Manual verification: run a retro cycle and confirm the output matches the new format. No automated tests — this is a template change.

## Deferred Ideas

None.
