# Meta Hierarchy Tightening

## Goal

Align META hierarchy format with CONTEXT hierarchy. Procedures-first, compaction follows L1/L2/L3 depth, rename domains for clarity.

## Approach

Big-bang migration: rename insights→process, upstream→workarounds across all levels. Reformat L1/L2 to mirror CONTEXT structure. Update retro agent templates and context doc vocabulary.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| L1 format | Mirror CONTEXT L1: summary + domain sections with inlined rules | Structural consistency across hierarchies |
| L2 domain names | process / workarounds | "Process" = how we work better; "Workarounds" = what we route around. Action-oriented. |
| L2 format | Mirror CONTEXT L2: sections per L3 topic with summary + rules | Compaction follows depth — L2 is more detailed than L1 but still structured |
| L3 format | Unchanged (observation records with confidence tags) | Already the right shape for meta |
| Retro agent | Update templates + rename references | Agent must target new format to maintain it |
| Migration strategy | Big bang (single task) | All changes are interdependent |

### Claude's Discretion

- Exact wording of L1/L2 summary sentences during migration
- Whether to collapse single-observation L3 topics into their L2 section or keep separate files

## Component Breakdown

### L1 Meta Files (5 files)

Template:
```markdown
# {Phase} Meta
{One dense summary sentence.}

## Process
{One summary sentence.}
1. ALWAYS/NEVER {rule} — {rationale}

## Workarounds
{One summary sentence or "None recorded."}
```

Rules dissolve into their domain section. No separate "Procedures" or "Domains" sections.

### L2 Meta Files (10 files: 5x process.md + 5x workarounds.md)

Template for process.md:
```markdown
# {Phase} Process
{Summary. Key themes and cluster count.}

## {Topic Name}
{1-2 sentence distillation.}
1. ALWAYS/NEVER {rule from observations}
```

Template for workarounds.md:
```markdown
# {Phase} Workarounds
{Summary. Issue count and area.}

## {Issue Name}
{What's broken. How to route around it.}
1. ALWAYS/NEVER {workaround rule}
```

Each section maps 1:1 to an L3 record. LOW-confidence single-observation topics get summary only, no rules.

### L3 Records (~15 files)

No content changes. Move from `insights/` → `process/`, `upstream/` → `workarounds/`.

### Retro Agent (1 file)

Update `retro-meta.md`:
- Replace "insights" → "process", "upstream" → "workarounds"
- L1 output template: domain sections instead of Procedures/Domains
- L2 output template: structured sections per L3 topic instead of prose paragraph
- L3 template unchanged

### Context Docs (~5 files)

Vocabulary update in:
- `context/design/architecture/data-domains.md`
- `context/design/architecture/knowledge-hierarchy.md`
- `context/design/architecture/retro-promotion.md`
- `context/design/architecture.md`
- `context/DESIGN.md`

## Files Affected

### Create
None

### Modify
- `.beastmode/meta/DESIGN.md` — reformat L1
- `.beastmode/meta/PLAN.md` — reformat L1
- `.beastmode/meta/IMPLEMENT.md` — reformat L1
- `.beastmode/meta/VALIDATE.md` — reformat L1
- `.beastmode/meta/RELEASE.md` — reformat L1
- `.beastmode/meta/design/process.md` — renamed from insights.md + reformat
- `.beastmode/meta/design/workarounds.md` — renamed from upstream.md + reformat
- `.beastmode/meta/plan/process.md` — renamed from insights.md + reformat
- `.beastmode/meta/plan/workarounds.md` — renamed from upstream.md + reformat
- `.beastmode/meta/implement/process.md` — renamed from insights.md + reformat
- `.beastmode/meta/implement/workarounds.md` — renamed from upstream.md + reformat
- `.beastmode/meta/validate/process.md` — renamed from insights.md + reformat
- `.beastmode/meta/validate/workarounds.md` — renamed from upstream.md + reformat
- `.beastmode/meta/release/process.md` — renamed from insights.md + reformat
- `.beastmode/meta/release/workarounds.md` — renamed from upstream.md + reformat
- `.beastmode/meta/design/process/` — L3 records moved from insights/
- `.beastmode/meta/implement/process/` — L3 records moved from insights/
- `.beastmode/meta/implement/workarounds/` — L3 records moved from upstream/
- `.beastmode/meta/plan/process/` — L3 records moved from insights/
- `.beastmode/meta/release/process/` — L3 records moved from insights/
- `agents/retro-meta.md` — template + reference updates
- `.beastmode/context/design/architecture/data-domains.md` — vocabulary
- `.beastmode/context/design/architecture/knowledge-hierarchy.md` — vocabulary
- `.beastmode/context/design/architecture/retro-promotion.md` — vocabulary
- `.beastmode/context/design/architecture.md` — vocabulary
- `.beastmode/context/DESIGN.md` — vocabulary

### Delete
- `.beastmode/meta/*/insights.md` (replaced by process.md)
- `.beastmode/meta/*/upstream.md` (replaced by workarounds.md)
- `.beastmode/meta/*/insights/` directories (replaced by process/)
- `.beastmode/meta/*/upstream/` directories (replaced by workarounds/)

## Acceptance Criteria

- [ ] All `insights.md` renamed to `process.md`, all `upstream.md` renamed to `workarounds.md`
- [ ] All `insights/` dirs renamed to `process/`, all `upstream/` dirs renamed to `workarounds/`
- [ ] All 5 L1 meta files follow new format (summary + Process section + Workarounds section)
- [ ] All 10 L2 meta files follow new format (structured sections per L3 topic)
- [ ] L3 records moved to new directories, content unchanged
- [ ] Retro agent references updated (no remaining "insights"/"upstream" strings)
- [ ] Context docs updated with new vocabulary
- [ ] No orphaned references to old domain names in `.beastmode/`

## Testing Strategy

Structural validation:
1. Grep for "insights.md", "upstream.md" in `.beastmode/` — must return zero hits
2. Verify all `process.md` and `workarounds.md` files exist for each phase
3. Verify L1 files have `## Process` and `## Workarounds` sections
4. Verify L2 files have `##` sections matching L3 record filenames
5. Verify L3 record content is byte-identical to pre-migration

## Deferred Ideas

None.
