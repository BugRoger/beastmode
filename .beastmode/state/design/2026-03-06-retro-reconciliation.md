# Design: Retro Context Reconciliation

## Goal

Redesign the retro context walker from a 10-step exhaustive audit into a focused, artifact-scoped reconciliation that only checks and fixes docs affected by the new state artifact.

## Approach

Top-down reconciliation: L1 quick-check as fast exit, L2 deep check only if suspicious, new area recognition for undocumented concepts, single write gate, L1 recompute after changes. Meta walker untouched.

## Key Decisions

### Locked Decisions

1. **Context walker only** — Meta walker and meta gates remain untouched. This redesign only affects the context reconciliation path in retro.md and the context walker agent.

2. **Artifact-scoped trigger** — Walker takes the new state artifact as input, determines which L1/L2 files it could affect, and checks only those. No more scanning the entire phase tree on every checkpoint.

3. **Single write gate** — `retro.context-write` replaces both `retro.context-changes` and `retro.l2-write`. One approval covers all context doc writes (L2 edits + new L2 files + L1 recompute).

4. **Gap detection killed** — No more confidence-scored gap detection with accumulation thresholds. Replaced by lightweight "new area recognition": if the artifact introduces a concept with no L2 home, propose creating one. No scoring, no threshold counting.

### Claude's Discretion

- Exact heuristic for "L1 quick-check passes" (how much drift triggers L2 check)
- How to determine which L2 files are "relevant" to the new artifact (topic matching strategy)
- Seed content quality for new L2 file proposals
- Whether L1 recompute touches all L2s or only changed ones

## Components

### 1. Redesigned Context Walker Agent (`agents/retro-context.md`)

**Input**: Session context (phase, feature, artifact path, worktree root)

**Algorithm**:

1. **Scope resolution** — Read the new state artifact. Extract key concepts, decisions, and patterns introduced. Determine which L2 files under `context/{phase}/` are relevant based on topic overlap.

2. **L1 quick-check** — Read `context/{PHASE}.md`. For each section summary:
   - Does it already account for the artifact's concepts?
   - Does the summary wording still feel accurate?
   - If ALL sections pass → report "no changes needed", stop.
   - If ANY section feels stale or incomplete → flag it, continue to L2.

3. **L2 deep check** — For each flagged L2 file:
   - Read full content
   - Compare against artifact: accuracy, completeness, Related Decisions links
   - If accurate → skip
   - If stale → compute proposed edit (exact text change)

4. **New area recognition** — Does the artifact introduce a concept that has no L2 home?
   - Scan existing L2 filenames in `context/{phase}/`
   - If the artifact's primary topic doesn't map to any existing L2 → propose new L2 file with:
     - Filename: `context/{phase}/{domain}.md`
     - Seed content: extracted from the artifact
     - Parent L1 section to add

5. **Emit changes** — Structured list of proposed changes

**Output format**:

```
## Proposed Changes

### Change 1: [title]
- **Target**: [file path]
- **Action**: edit | create
- **Content**: [proposed text or diff]

### Change 2: ...

---
No changes needed. (if nothing to do)
```

### 2. Updated retro.md Orchestrator (Context Section)

Collapse steps 3/4/8/9/10 into a 4-step context flow:

1. **Spawn context walker** — Pass artifact path and session context
2. **Present findings** — Show proposed changes (if any)
3. **Gate** — `retro.context-write` (human/auto from config.yaml)
4. **Apply** — Write L2 changes, recompute L1 summaries from updated L2s

Meta walker steps remain unchanged.

### 3. L1 Recompute

After applying L2 changes:

1. List all L2 files in `context/{phase}/`
2. For each: read and extract a 2-3 sentence summary
3. Rewrite the corresponding L1 section
4. Rewrite the L1 top-level paragraph from all sections
5. Prune stale Related Decisions links in L2 files (verify targets exist)

This is the existing "bottom-up bubble" — just moved to be the final step of the simplified flow.

### 4. Config Changes

```yaml
gates:
  retro:
    context-write: human    # Single gate for all context doc writes
    # REMOVED: context-changes, l2-write (folded into context-write)
```

## Files Affected

| File | Change |
|------|--------|
| `agents/retro-context.md` | **Rewrite** — new algorithm: scope resolution, L1 quick-check, L2 deep check, new area recognition |
| `skills/_shared/retro.md` | **Major edit** — collapse steps 3/4/8/9/10 into 4-step context flow, keep meta section as-is |
| `.beastmode/config.yaml` | **Edit** — replace `context-changes` + `l2-write` with single `context-write` gate |

Files **NOT** changed:
- `agents/retro-meta.md` — untouched
- Meta-related gates and steps in retro.md — untouched

## Acceptance Criteria

- [ ] Context walker takes artifact path as input, not just phase name
- [ ] L1 quick-check can exit early when summary already accounts for artifact
- [ ] L2 deep check only runs on files flagged by L1 quick-check
- [ ] New area recognition proposes L2 files for concepts without an existing doc
- [ ] Single `retro.context-write` gate covers all proposed changes (edits + new files)
- [ ] L1 recompute runs after applying L2 changes
- [ ] Meta walker and meta gates remain untouched
- [ ] Old `retro.context-changes` and `retro.l2-write` gates removed from config
- [ ] Retro.md orchestrator context section is 4 steps max (spawn, present, gate, apply)

## Testing Strategy

- Run a design phase that produces a new state artifact and verify the context walker scopes to relevant L2 files only
- Verify L1 quick-check exits early when docs already account for the artifact
- Create a state artifact that introduces a new concept and verify new area recognition proposes an L2 file
- Verify the single `retro.context-write` gate fires for both edits and new file proposals
- Verify L1 recompute produces accurate summaries after L2 changes
- Verify meta walker still runs independently and produces unchanged output

## Deferred Ideas

- Meta walker redesign with same artifact-scoped pattern
- Cross-domain reconciliation (when context change implies meta update)
- Batch reconciliation mode for catching up after multiple phases without retro
