# Design: Init Asset Skeleton Update

## Goal

Update the init skeleton assets (`skills/beastmode/assets/.beastmode/`) to match the current reality of how `.beastmode/` directories look after evolution through 30+ releases. Additionally, clean up beastmode's own `meta/` to match the target pattern and move `research/` out of `state/`.

## Approach

Full sweep of all asset files. Rewrite templates to use current formats, add missing infrastructure files, restructure directories, remove dead weight. Derive the skeleton from a cleaned-up version of reality.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| config.yaml | Include in skeleton, all gates default to `human` | New projects should be conservative; users opt into auto |
| PRODUCT.md | Move to `context/design/product.md`, delete root | Matches evolved hierarchy; root was a vestige |
| L1 index format | Real format (section headers + path references) | No migration needed later; retro fills in ALWAYS/NEVER bullets |
| Meta file structure | Process / Workarounds | Matches what retro actually writes |
| BEASTMODE.md | Include minimal skeleton with section headers | L0 anchor should exist from day one |
| State directory | No L1 files, just empty phase subdirs with .gitkeep | State L1 "In Progress / Blocked" trackers were dead weight |
| L3 directories | Every L2 file gets a matching empty L3 dir with .gitkeep | Ready for retro to expand into sub-topics |
| Meta subdirectories | Full hierarchy: 5 phases x 2 domains | Consistent with context hierarchy |
| research/ | Move from state/research/ to .beastmode/research/ | Research isn't state; it's reference material |
| Content style | Minimal scaffolding, no project-specific content | Skeleton is generic; init and retro add substance |

### Claude's Discretion

- Exact section headings in L2 template files (must be reasonable for the domain)
- Wording of placeholder comments in meta L2 files
- Order of sections in config.yaml

## Component Breakdown

### 1. Skeleton Asset Files (skills/beastmode/assets/.beastmode/)

**New files:**
- `BEASTMODE.md` — L0 with Prime Directives / Persona / Workflow headers
- `config.yaml` — All gates default to human
- `research/.gitkeep`
- `context/validate/.gitkeep`
- `context/release/.gitkeep`
- `context/design/product.md` — Moved from root PRODUCT.md
- All L3 `.gitkeep` directories (7 context + 10 meta)
- `meta/{phase}/process.md` and `meta/{phase}/workarounds.md` (10 files)

**Rewritten files:**
- 5 context L1 files (DESIGN.md, PLAN.md, IMPLEMENT.md, VALIDATE.md, RELEASE.md)
- 7 context L2 files (product, architecture, tech-stack, conventions, structure, agents, testing)
- 5 meta L1 files

**Deleted files:**
- `PRODUCT.md` (root level)
- 5 state L1 files (DESIGN.md through RELEASE.md)

### 2. Reality Cleanup (beastmode's own .beastmode/)

- Move `state/research/` to `research/` at .beastmode root
- Delete `meta/design/DESIGN.md` (obsolete L1 duplicate)
- Migrate any loose narrative bullets in meta L2 to ALWAYS/NEVER format
- Add missing L3 directories with .gitkeep where absent
- Remove state L1 files if they exist

### 3. Init Skill References

The init skill (`skills/beastmode/subcommands/init.md`) references specific asset files. Changes needed:
- Remove references to root `PRODUCT.md`
- Greenfield mode writes to `context/design/product.md` instead of `BEASTMODE.md` product section
- Brownfield mode agent targets remain correct (they already target L2 files)
- Status reporting list needs updating

**Note:** Init flow changes are out of scope per locked scope decision. Document discrepancies for a follow-up.

## Files Affected

### Skeleton (skills/beastmode/assets/.beastmode/)

Full tree:

```
.beastmode/
├── BEASTMODE.md                    [NEW]
├── config.yaml                     [NEW]
├── research/
│   └── .gitkeep                    [NEW]
├── context/
│   ├── DESIGN.md                   [REWRITE]
│   ├── PLAN.md                     [REWRITE]
│   ├── IMPLEMENT.md                [REWRITE]
│   ├── VALIDATE.md                 [REWRITE]
│   ├── RELEASE.md                  [REWRITE]
│   ├── design/
│   │   ├── product.md              [NEW — from root PRODUCT.md]
│   │   ├── product/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── architecture.md         [REWRITE]
│   │   ├── architecture/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── tech-stack.md           [REWRITE]
│   │   └── tech-stack/
│   │       └── .gitkeep            [NEW]
│   ├── plan/
│   │   ├── conventions.md          [REWRITE]
│   │   ├── conventions/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── structure.md            [REWRITE]
│   │   └── structure/
│   │       └── .gitkeep            [NEW]
│   ├── implement/
│   │   ├── agents.md               [REWRITE]
│   │   ├── agents/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── testing.md              [REWRITE]
│   │   └── testing/
│   │       └── .gitkeep            [NEW]
│   ├── validate/
│   │   └── .gitkeep                [NEW]
│   └── release/
│       └── .gitkeep                [NEW]
├── meta/
│   ├── DESIGN.md                   [REWRITE]
│   ├── PLAN.md                     [REWRITE]
│   ├── IMPLEMENT.md                [REWRITE]
│   ├── VALIDATE.md                 [REWRITE]
│   ├── RELEASE.md                  [REWRITE]
│   ├── design/
│   │   ├── process.md              [NEW]
│   │   ├── process/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── workarounds.md          [NEW]
│   │   └── workarounds/
│   │       └── .gitkeep            [NEW]
│   ├── plan/
│   │   ├── process.md              [NEW]
│   │   ├── process/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── workarounds.md          [NEW]
│   │   └── workarounds/
│   │       └── .gitkeep            [NEW]
│   ├── implement/
│   │   ├── process.md              [NEW]
│   │   ├── process/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── workarounds.md          [NEW]
│   │   └── workarounds/
│   │       └── .gitkeep            [NEW]
│   ├── validate/
│   │   ├── process.md              [NEW]
│   │   ├── process/
│   │   │   └── .gitkeep            [NEW]
│   │   ├── workarounds.md          [NEW]
│   │   └── workarounds/
│   │       └── .gitkeep            [NEW]
│   └── release/
│       ├── process.md              [NEW]
│       ├── process/
│       │   └── .gitkeep            [NEW]
│       ├── workarounds.md          [NEW]
│       └── workarounds/
│           └── .gitkeep            [NEW]
└── state/
    ├── design/
    │   └── .gitkeep                [NEW]
    ├── plan/
    │   └── .gitkeep                [NEW]
    ├── implement/
    │   └── .gitkeep                [NEW]
    ├── validate/
    │   └── .gitkeep                [NEW]
    └── release/
        └── .gitkeep                [NEW]
```

### Reality cleanup (.beastmode/)
- Move `.beastmode/state/research/` → `.beastmode/research/`
- Delete `.beastmode/meta/design/DESIGN.md`
- Delete `.beastmode/state/DESIGN.md` through `RELEASE.md` (5 L1 files) — if they exist
- Migrate meta L2 bullets to ALWAYS/NEVER format
- Add missing L3 .gitkeep directories

## Acceptance Criteria

- [ ] Skeleton has BEASTMODE.md, config.yaml, research/ at root level
- [ ] PRODUCT.md removed from root, product.md exists at context/design/
- [ ] All 5 context L1 files use real format (section headers + path references)
- [ ] All 5 meta L1 files use Process/Workarounds format with path references
- [ ] State has no L1 files — only 5 phase subdirs with .gitkeep
- [ ] Every L2 file has a matching L3 directory with .gitkeep
- [ ] Meta has 5 phase subdirs, each with process.md + workarounds.md + L3 dirs
- [ ] config.yaml has all gates defaulting to human
- [ ] Content is minimal scaffolding — no beastmode-specific rules
- [ ] Beastmode's own meta/ cleaned up: obsolete files removed, L2 format migrated
- [ ] research/ moved from state/ to .beastmode/ root (both skeleton and reality)
- [ ] Init skill discrepancies documented for follow-up

## Testing Strategy

Manual verification:
- Count files in skeleton matches expected total
- Verify no placeholder patterns like `[e.g., ...]` remain in context L2 files (section headers only)
- Verify config.yaml parses as valid YAML
- Verify all .gitkeep files exist in expected L3 directories
- Diff skeleton structure against documented tree

## Deferred Ideas

- Update init skill flow to match new skeleton (greenfield wizard, brownfield agent targets, completion report)
- Add validate/ and release/ L2 domain files to skeleton when patterns stabilize
- Consider whether brownfield agents should also populate meta/ L2 files
