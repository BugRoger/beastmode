# Design: Dynamic Retro Walkers

## Goal

Replace hardcoded retro agents with structure-walking agents that dynamically discover what to review, extend, and suggest — making the retro system self-adapting as documentation evolves.

## Approach

Two domain-specific walkers (context, meta) that read L1 summaries, follow @imports to L2 files, and for each concept: verify accuracy, propose extensions, and suggest new documentation. State domain excluded — it's tracking, not documentation.

## Key Decisions

### Locked Decisions

1. **Structure-walking over hardcoded targets** — Agents read L1 files, parse `@import` references, follow them to L2, and review each section dynamically. The hardcoded phase-to-files table in retro-context.md is removed.

2. **Two walkers: context + meta** — Each domain gets its own walker with domain-appropriate review focus. Context walker checks accuracy/extensions/gaps. Meta walker checks learnings/patterns/overrides.

3. **No state walker** — State domain is kanban tracking, not documentation. Deferred ideas bubble-up is a future feature.

4. **Same output format** — Findings still use the existing structured format (discrepancy, evidence, proposed change, confidence). No output format changes.

5. **Gap detection as first-class behavior** — Walkers don't just check what exists; they actively look for undocumented patterns in session artifacts and suggest new L2 sections when warranted.

### Claude's Discretion

- Exact prompt wording for structure-walking instructions
- How walkers handle L1 files with no L2 @imports (e.g., current meta files)
- Threshold for "suggest new L2 file" vs "extend existing L2 section"

## Components

### 1. Redesigned Context Walker (`agents/retro-context.md`)

Remove the hardcoded phase-to-files mapping table. Replace with:
- Read `context/{PHASE}.md` (L1 for current phase)
- Parse sections and `@` import paths
- For each @imported L2 file:
  - Read and compare against session artifacts
  - Check: accuracy, completeness, staleness, new patterns
  - Check "Related Decisions" links exist and are accurate
- For L1 itself:
  - Do section summaries still match L2 content?
  - Are there L2 files not @imported? (orphans)
  - Should new L2 files be created for undocumented concepts?

### 2. Redesigned Meta Walker (`agents/retro-meta.md`)

Currently a flat "capture learnings" prompt. Upgrade to structure-walking:
- Read `meta/{PHASE}.md` (L1 for current phase)
- Parse existing sections (Defaults, Project Overrides, Learnings)
- Compare session outcomes against existing learnings:
  - Are existing learnings still accurate?
  - Are there new patterns worth capturing?
  - Should any learning be promoted from per-feature to general?
- If L2 files exist under `meta/{phase}/`, walk them too (future-proof)

### 3. Updated `_shared/retro.md` orchestrator

- Remove phase-specific file lists from agent prompts
- Instead, pass: current phase name, the L1 file path, and session artifacts
- Agents discover their own review targets from the L1 structure
- Keep: parallel spawning, findings presentation, approval flow, bottom-up bubble

## Files Affected

| File | Change |
|------|--------|
| `agents/retro-context.md` | **Rewrite** — structure-walking, remove hardcoded table |
| `agents/retro-meta.md` | **Rewrite** — structure-walking, dynamic section review |
| `skills/_shared/retro.md` | **Edit** — update agent prompt assembly to pass L1 paths instead of file lists |

## Acceptance Criteria

- [ ] Context walker discovers review targets from L1 @imports, not a hardcoded table
- [ ] Context walker detects orphaned L2 files (exist on disk but not @imported)
- [ ] Context walker suggests new L2 files for undocumented concepts
- [ ] Meta walker reviews existing learnings for staleness
- [ ] Meta walker captures new patterns without duplicating existing entries
- [ ] Both walkers handle L1 files with zero @imports gracefully
- [ ] retro.md passes L1 paths to agents, not hardcoded file lists
- [ ] Output format unchanged (findings with confidence levels)
- [ ] Bottom-up bubble still works (L2 → L1 summary propagation)

## Testing Strategy

- Run a design phase and verify the context walker finds L2 files by following @imports from context/DESIGN.md
- Verify the meta walker reads meta/DESIGN.md and checks existing learnings
- Add a new L2 file without @importing it and verify the walker flags it as orphaned
- Check that the findings format is unchanged from the current agent output

## Deferred Ideas

- **State domain walker** — for deferred ideas aggregation and status tracking accuracy
- **Cross-domain pattern detection** — when a learning in meta/ matches a gap in context/, suggest cross-pollination
- ~~**Auto-promotion of learnings to SOPs** — after a learning appears in 3+ sessions, suggest promoting to context/ doc~~ (implemented: 2026-03-08)
