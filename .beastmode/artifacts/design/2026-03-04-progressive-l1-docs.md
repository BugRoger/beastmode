# Design: Progressive L1 Docs

## Goal

Fix the broken meta layer (never loaded into sessions) and restructure all UPPERCASE L1 files as progressive enhancements — a fractal pattern where each level contains a summary of its children and @imports the next level down, with full detail only at the deepest level.

## Approach

Introduce `.beastmode/CLAUDE.md` as a pure manifest (@imports only). Restructure every L1 file across all three domains (context, meta, state) to follow the progressive pattern: summary paragraph + section summaries per child + @imports. L2 detail files gain a "Related Decisions" section with one-liner links to L3 state artifacts. Retro phases maintain the hierarchy via bottom-up bubble updates.

## Key Decisions

### Locked Decisions

- **`.beastmode/CLAUDE.md` is a pure manifest** — Contains only @import lines, no prose. Imports PRODUCT.md + all L1 files from context, meta, and state domains. This is the single hub that root CLAUDE.md references.

- **Root `CLAUDE.md` simplification** — Removes direct context imports. Single `@.beastmode/CLAUDE.md` reference + Prime Directives. No other content.

- **PRODUCT.md is the true L0** — The richest standalone summary of the project. Describes the overall concept. CLAUDE.md is just wiring, PRODUCT.md carries the knowledge.

- **Fractal progressive enhancement at every level** — Same pattern at every level: summary + section summaries of children + @imports. Gets progressively more detailed as you descend:
  - L0 (PRODUCT.md): Richest standalone project summary
  - L1 (context/DESIGN.md): Domain summary + section summaries per L2 + @imports
  - L2 (design/architecture.md): Topic detail + one-liner list linking to L3 artifacts
  - L3 (state/design/*.md): Raw artifacts

- **All three domains get progressive treatment** — Context, Meta, and State L1 files all follow the same progressive pattern. No domain is excluded.

- **Bottom-up retro bubble** — 3-checkpoint retro walks L2 → L1 → L0: update detail, then re-summarize parent, then re-summarize grandparent. Link + content check: verify linked files exist, prune stale entries, add new.

### Claude's Discretion

- Exact wording of summaries at each level
- How many one-liners per L2 section (aim for key decisions, not exhaustive)
- L2 "Related Decisions" section format details
- Retro agent prompt wording for bottom-up bubble

## Components

### New: `.beastmode/CLAUDE.md` (Manifest)

Pure @imports file. No prose. Imports:
- PRODUCT.md
- All 5 context L1 files (context/DESIGN.md through context/RELEASE.md)
- All 5 meta L1 files (meta/DESIGN.md through meta/RELEASE.md)
- All 5 state L1 files (state/DESIGN.md through state/RELEASE.md)

### Edit: Root `CLAUDE.md`

Replace current imports:
```
@.beastmode/PRODUCT.md
@.beastmode/context/DESIGN.md
@.beastmode/context/PLAN.md
@.beastmode/context/IMPLEMENT.md
```

With:
```
@.beastmode/CLAUDE.md

## Prime Directives
- When you see SessionStart hook output...
```

### Edit: PRODUCT.md (Enrich as L0)

Currently sparse. Enrich with comprehensive project overview that stands alone as the full project summary.

### Edit: All L1 Files (Progressive Format)

Template:
```markdown
# {Domain} {Phase}

{Summary paragraph — captures intent and key takeaways}

## {L2 Topic A}
{2-3 sentence summary of topic A content}
@{phase}/{topic-a}.md

## {L2 Topic B}
{2-3 sentence summary of topic B content}
@{phase}/{topic-b}.md
```

Applies to 15 files across context/, meta/, state/.

### Edit: All L2 Detail Files (Add Related Decisions)

Add "Related Decisions" section at the bottom of each L2 file:
```markdown
## Related Decisions
- {One-liner summary}. See [{feature}](../../state/{phase}/{date}-{feature}.md)
```

### Edit: Retro Agents (Bottom-Up Bubble)

Update 3-checkpoint retro logic to:
1. Update L2: add/remove one-liners, verify links, prune stale
2. Update L1: re-summarize sections based on updated L2s
3. Update L0: re-summarize PRODUCT.md based on updated L1s

### Edit: Architecture Docs

Update knowledge architecture section in architecture.md to reflect new progressive model.

## Files Affected

| File | Change Type |
|------|-------------|
| `.beastmode/CLAUDE.md` | **New** — manifest of @imports |
| Root `CLAUDE.md` | **Edit** — single import + Prime Directives |
| `.beastmode/PRODUCT.md` | **Edit** — enrich as L0 |
| `.beastmode/context/DESIGN.md` | **Edit** — progressive format |
| `.beastmode/context/PLAN.md` | **Edit** — progressive format |
| `.beastmode/context/IMPLEMENT.md` | **Edit** — progressive format |
| `.beastmode/context/VALIDATE.md` | **Edit** — progressive format |
| `.beastmode/context/RELEASE.md` | **Edit** — progressive format |
| `.beastmode/meta/DESIGN.md` | **Edit** — progressive format |
| `.beastmode/meta/PLAN.md` | **Edit** — progressive format |
| `.beastmode/meta/IMPLEMENT.md` | **Edit** — progressive format |
| `.beastmode/meta/VALIDATE.md` | **Edit** — progressive format |
| `.beastmode/meta/RELEASE.md` | **Edit** — progressive format |
| `.beastmode/state/DESIGN.md` | **Edit** — progressive format |
| `.beastmode/state/PLAN.md` | **Edit** — progressive format |
| `.beastmode/state/IMPLEMENT.md` | **Edit** — progressive format |
| `.beastmode/state/VALIDATE.md` | **Edit** — progressive format |
| `.beastmode/state/RELEASE.md` | **Edit** — progressive format |
| `.beastmode/context/design/architecture.md` | **Edit** — add related decisions, update knowledge architecture |
| `.beastmode/context/design/tech-stack.md` | **Edit** — add related decisions |
| `.beastmode/context/plan/conventions.md` | **Edit** — add related decisions |
| `.beastmode/context/plan/structure.md` | **Edit** — add related decisions |
| `.beastmode/context/implement/agents.md` | **Edit** — add related decisions |
| `.beastmode/context/implement/testing.md` | **Edit** — add related decisions |
| Retro agents (`agents/retro-context.md`, `agents/retro-meta.md`) | **Edit** — add bottom-up bubble logic |
| `skills/_shared/retro.md` | **Edit** — add bottom-up bubble orchestration |

## Acceptance Criteria

- [ ] Root CLAUDE.md contains single `@.beastmode/CLAUDE.md` import + Prime Directives only
- [ ] `.beastmode/CLAUDE.md` exists as pure manifest with @imports for all L1 files
- [ ] Meta L1 files are loaded into sessions (the original bug)
- [ ] State L1 files are loaded into sessions
- [ ] Every L1 file follows progressive format: summary + section summaries + @imports
- [ ] Every L2 detail file has "Related Decisions" section with one-liner links
- [ ] PRODUCT.md is enriched as comprehensive L0 standalone summary
- [ ] Retro 3-checkpoint performs bottom-up bubble: L2 → L1 → L0
- [ ] Stale entries detected and pruned during retro (link + content check)

## Testing Strategy

- Verify root CLAUDE.md @imports chain resolves correctly (all L1 files loaded)
- Verify meta learnings appear in session context after restart
- Run a design cycle and check that retro updates L2 → L1 → L0
- Spot-check L1 summaries match their L2 content
- Verify stale link detection works (temporarily rename a state file, run retro)

## Deferred Ideas

None.
