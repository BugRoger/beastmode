# Context Reconciliation Agent

Reconcile context docs against a new state artifact.

## Role

Given a new state artifact, determine which context docs it affects and propose changes to keep L1/L2 accurate. Work top-down: quick-check L1 first, deep-check L2 only if needed, recognize new areas.

## Input

The orchestrator provides a Session Context block:

- **Phase**: current phase (design/plan/implement/validate/release)
- **Feature**: feature name
- **Artifact**: path to the new state artifact
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **Worktree root**: current working directory

## Algorithm

### 1. Scope Resolution

Read the new state artifact. Extract:
- Key concepts, decisions, and patterns introduced
- Domain areas touched (architecture, testing, conventions, etc.)

List all `.md` files in `context/{phase}/` directory. For each, determine relevance based on topic overlap with the artifact. Irrelevant files are skipped entirely.

### 2. L1 Quick-Check

Read `context/{PHASE}.md`. For each section summary:
- Does it already account for the artifact's concepts?
- Does the summary wording still feel accurate given what the artifact introduces?

If ALL sections pass → report "No changes needed." and stop.
If ANY section feels stale or incomplete → flag it for L2 deep check.

### 3. L2 Deep Check

For each L2 file flagged by the L1 quick-check:

1. Read full content
2. Compare against artifact:
   - **Accuracy** — Does content still match reality?
   - **Completeness** — Are new decisions/patterns missing?
   - **Related Decisions** — Should a new link to this artifact be added?
3. If accurate → skip
4. If stale → compute proposed edit (exact text to change)

### Value-Add Gate

Before proposing any new L3 record, evaluate whether it adds at least one of:

1. **Rationale** not already captured in the L2 summary
2. **Constraints or edge cases** that narrow the L2 rule
3. **Source provenance** that would be lost without the record
4. **Dissenting context** where the rule was debated or overridden

If none apply, silently skip the L3 proposal — the L2 already covers the finding. No L2 enrichment occurs.

### 4. New Area Recognition

Does the artifact introduce a concept that has no L2 home?

1. List existing L2 filenames in `context/{phase}/`
2. If the artifact's primary topic doesn't map to any existing L2 → propose new L2 file:
   - Filename: `context/{phase}/{domain}.md`
   - Seed content: extracted from the artifact's key decisions and approach
   - Parent L1 section: heading + summary paragraph + numbered rules to add to `context/{PHASE}.md` (no L2 file path — L1 sections are self-contained)
3. For each section in the new L2 file, apply the **Value-Add Gate**. If the section passes (adds value beyond the L2 summary), propose a corresponding L3 record:
   - Directory: `context/{phase}/{domain}/`
   - Filename: `context/{phase}/{domain}/{section-name}.md`
   - Format: Context/Decision/Rationale/Source (standard L3 structure)
   - Source: the state artifact path

Every L2 section SHOULD have a corresponding L3 record, unless the L3 would be a pure restatement of the L2 content (see Value-Add Gate). L2 files without L3 records are acceptable when the L2 already captures all relevant context.

This is NOT gap detection. No confidence scoring, no accumulation thresholds. Just: "this concept has no doc home, here's a draft with L3 provenance."

### 5. L3 Completeness Check

For each existing L2 file flagged in step 3:

1. List sections (`##` headings) in the L2 file
2. List L3 records in the corresponding `context/{phase}/{domain}/` directory
3. If any L2 section has no matching L3 record, apply the **Value-Add Gate**. If the section passes, propose the missing L3:
   - Format: Context/Decision/Rationale/Source
   - Source: infer from the artifact or mark as "Source artifact unknown — backfill needed"
   If the section fails the gate (L3 would be a pure restatement), skip silently.

### 6. Emit Changes

Return a structured list of all proposed changes.

## Output Format

```
## Proposed Changes

### Change 1: [title]
- **Target**: [file path]
- **Action**: edit | create
- **Content**: [proposed text or diff]

### Change 2: ...
```

If nothing needs changing:

```
## Proposed Changes

No changes needed. L1 summaries already account for this artifact.
```

## Rules

- **Artifact-scoped** — only check docs relevant to the new artifact
- **L1 first** — use L1 as a fast exit before reading L2 files
- **L3 completeness** — every L2 section SHOULD have a corresponding L3 record with Source provenance, unless the gate filters it
- **Value-add gate** — new L3 proposals must pass the value-add check (rationale, constraints, provenance, or dissenting context beyond L2)
- **Be specific** — include exact sections/lines to change
- **Preserve structure** — suggest edits within existing document structure
- **No gap detection** — only recognize obvious new areas, don't scan for patterns
- **No confidence scoring** — propose changes or don't; no HIGH/MEDIUM/LOW
- **L1 format** — L1 sections contain heading + summary paragraph + numbered rules only. No L2 file paths, no @imports, no cross-level references of any kind
