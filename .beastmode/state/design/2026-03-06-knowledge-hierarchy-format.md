# Knowledge Hierarchy Format Standardization

## Goal

Standardize L1/L2/L3 context files as rule-lists with dense summaries, enforced by retro agents.

## Approach

Redefine format spec for each knowledge hierarchy level. Introduce L3 records for the context domain. Update BEASTMODE.md hierarchy table. Retro agents enforce the format.

## Key Decisions

### Locked Decisions

| Decision | Choice |
|----------|--------|
| L1 format | Dense summary per domain + numbered rules |
| L2 format | Detailed summary per record topic + domain-adapted rules |
| L3 format | Full record (context/decision/rationale/source) |
| L3 naming | Named by topic/decision, not originating feature |
| State artifacts | Not a hierarchy level — belongs to phases, not L0-L3 |
| @imports in L1/L2 | Removed — convention-based loading described in BEASTMODE.md |
| L1 grouping | By L2 domains |
| L2 grouping | By L3 records |
| Format enforcement | Lives in retro agent prompts |
| Hierarchy table update | L3 row becomes "Records" at `context/{phase}/{domain}/{record}.md` |

### Claude's Discretion

- Exact rule numbering within reworked files
- Which existing L2 content gets promoted to L3 records vs. stays as rules
- Retro agent prompt wording for format enforcement

## Format Specification

### L1 — `context/{PHASE}.md`

Rules grouped by L2 domains. Dense summary per domain that distills the essence of the L2.

Structure:
```
# {Phase} Context

{Top-level summary — information-heavy, distills full scope}

## {Domain}
{Dense summary — could almost stop reading here}

1. RULE
2. RULE
...
```

### L2 — `context/{phase}/{domain}.md`

Rules grouped by L3 record topics. Detailed summary per topic. Rules adapted to the specific domain — no generic restatements.

Structure:
```
# {Domain}

{Top-level summary — detailed domain overview}

## {Record Topic}
{Detailed summary of this topic area}

1. RULE (domain-specific)
2. RULE (domain-specific)
...
```

### L3 — `context/{phase}/{domain}/{record}.md`

Full record. Named by topic/decision, not originating feature.

Structure:
```
# {Record Title}

## Context
{Problem or situation that prompted the decision}

## Decision
{What was decided and how it works}

## Rationale
- {Why bullet 1}
- {Why bullet 2}
- {Why bullet 3 max}

## Source
state/{phase}/YYYY-MM-DD-{feature}.md
```

### Rule-Writing Principles

**Core (Always Apply):**
1. Use absolute directives — start with NEVER or ALWAYS for non-negotiable rules
2. Lead with why — rationale before solution (1-3 bullets max)
3. Be concrete — actual commands/code for project-specific patterns
4. Minimize examples — one clear point per code block
5. Bullets over paragraphs
6. Action before theory

**Optional Enhancements (Use Strategically):**
- Bad/Good examples: only when antipattern is subtle or common
- "Why" section: 1-3 bullets max
- "Warning Signs": only for gradual/easy-to-miss violations
- "General Principle": only when abstraction is non-obvious
- Decision trees: only for 3+ factor decisions

**Anti-Bloat:**
- No "Warning Signs" for obvious rules
- No bad examples for trivial mistakes
- No decision trees for binary choices
- No "General Principle" when section title already generalizes
- No paragraphs when bullets suffice
- No long "Why" — 3 bullets maximum

## BEASTMODE.md Update

Knowledge hierarchy table changes from:

```
| L3 | Dated artifacts | state/{phase}/YYYY-MM-DD-{topic}.md |
```

To:

```
| L3 | Records | context/{phase}/{domain}/{record}.md |
```

State remains in the Domains table as a separate domain, not a hierarchy level.

## Component Breakdown

### Files to Create/Modify

**BEASTMODE.md (L0):**
- Update knowledge hierarchy table (L3 = records, remove state from levels)
- Add convention path for L3 records

**All L1 context files** (`context/DESIGN.md`, `context/PLAN.md`, `context/IMPLEMENT.md`, `context/VALIDATE.md`, `context/RELEASE.md`):
- Rewrite to rule-list format with dense summaries
- Remove @imports, use convention paths

**All L2 context files** (e.g., `context/design/architecture.md`, `context/design/product.md`, `context/design/tech-stack.md`, etc.):
- Rewrite to rule-list format with domain-adapted rules
- Group by L3 record topics

**L3 context records** (new):
- Extract decisions from current L2 "Key Decisions" sections
- Create as `context/{phase}/{domain}/{record}.md`
- Name by topic, not originating feature

**Retro agent prompts:**
- Add format enforcement spec for L1/L2/L3 rule-list format
- Include rule-writing principles and anti-bloat rules

### Files Affected

- `.beastmode/BEASTMODE.md`
- `.beastmode/context/DESIGN.md`
- `.beastmode/context/PLAN.md`
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/context/VALIDATE.md`
- `.beastmode/context/RELEASE.md`
- `.beastmode/context/design/architecture.md`
- `.beastmode/context/design/product.md`
- `.beastmode/context/design/tech-stack.md`
- `.beastmode/context/plan/conventions.md`
- `.beastmode/context/plan/structure.md`
- `.beastmode/context/implement/testing.md`
- `.beastmode/context/implement/agents.md`
- `.beastmode/context/validate/quality-gates.md`
- `.beastmode/context/release/versioning.md`
- `.beastmode/context/design/architecture/*.md` (new L3 records)
- `.beastmode/context/design/product/*.md` (new L3 records)
- Retro agent prompt files

## Acceptance Criteria

- [ ] L1 files follow format: top summary + sections with domain summary + numbered rules
- [ ] L2 files follow format: top summary + sections with record summary + domain-adapted rules
- [ ] L3 context records exist at `context/{phase}/{domain}/{record}.md`
- [ ] BEASTMODE.md hierarchy table updated (L3 = records, state removed from levels)
- [ ] @imports removed from L1/L2 files
- [ ] Retro agent enforces the format spec
- [ ] Rule-writing principles documented in retro agent

## Testing Strategy

- Verify each reworked file matches format spec
- Verify L3 records extracted from existing Key Decisions sections
- Verify BEASTMODE.md hierarchy table is correct
- Run retro agent against a sample file to confirm enforcement

## Deferred Ideas

- Meta domain L1/L2 files could follow same rule-list format (currently out of scope — focus on context domain first)
- L2 meta files (sops.md, learnings.md, overrides.md) may need their own format spec
