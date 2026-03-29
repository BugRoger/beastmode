# Documentation Refresh — README, ROADMAP, docs/

## Goal

Sync README, ROADMAP, and docs/ essays with the current state of beastmode at v0.14.30.

## Approach

Direct edits to four files. No structural changes. ROADMAP gets the bulk of updates (missing shipped features). README stays as-is. Two stale details fixed in docs/ essays.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ROADMAP "Now" | Add ~8 shipped features missing since last sync | Changelog shows features shipped since v0.14.20 not reflected in ROADMAP |
| ROADMAP "Later" agent teams | Update to reference native Claude Code team support | Claude Code now ships TeamCreate/SendMessage natively |
| README | Leave as-is | Audit found it current — skills table, three domains, install command all accurate |
| docs/ essays | Fix 2 stale details | L0 line count wrong (~80 vs ~40), brownfield flag removed |

### Claude's Discretion

- Exact wording of new ROADMAP "Now" entries (match existing entry style)
- Whether to reorder ROADMAP "Now" entries chronologically or by category

## Component Breakdown

### ROADMAP.md

Add to "Now":
- Unified `/beastmode` command with `init`, `status`, `ideas` subcommands
- Deferred ideas capture and reconciliation
- Feature name arguments for phase transitions
- Conversational design flow (one-question-at-a-time)
- Visual language spec (`█▓░▒` progress indicators)
- Hierarchy format v2 (bullet format everywhere)
- Squash-per-release with archive tags
- Meta hierarchy rebuild (L1/L2/L3 for meta domain)

Update in "Later":
- Progressive Autonomy Stage 3 — note native Claude Code team support

### docs/progressive-hierarchy.md

Fix L0 description: "~80 lines" → "~40 lines"

### docs/retro-loop.md

Fix brownfield reference: `/beastmode init --brownfield` → `/beastmode init`

## Files Affected

| File | Action |
|------|--------|
| `ROADMAP.md` | Edit — add shipped features to Now, update Later |
| `docs/progressive-hierarchy.md` | Edit — fix L0 line count |
| `docs/retro-loop.md` | Edit — fix brownfield flag reference |

## Acceptance Criteria

- [ ] ROADMAP "Now" includes all features shipped through v0.14.30
- [ ] ROADMAP "Later" progressive autonomy item updated
- [ ] `progressive-hierarchy.md` L0 line count corrected
- [ ] `retro-loop.md` brownfield flag reference removed
- [ ] No structural changes to README

## Testing Strategy

- Read each modified file after editing to verify changes are accurate
- Verify no broken markdown formatting

## Deferred Ideas

- None
