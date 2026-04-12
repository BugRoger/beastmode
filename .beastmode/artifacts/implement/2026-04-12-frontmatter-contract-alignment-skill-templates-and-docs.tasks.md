# skill-templates-and-docs

## Goal

Rename frontmatter fields in all 5 phase skill SKILL.md templates to use the unified naming convention (`epic-id`, `epic-slug`, `feature-slug`, `feature-id`, `failed-features`), remove content fields from frontmatter (`problem`, `solution`, `description`), and create a new contract documentation file at `.beastmode/context/design/frontmatter-contract.md`.

## Architecture

- 5 skill files contain YAML frontmatter templates in their checkpoint/reference sections
- Field renames align frontmatter with env var and metadata-in naming conventions
- Contract doc becomes the single source of truth for the frontmatter contract
- No code changes — pure markdown/YAML template edits and documentation

## Tech Stack

- Markdown with YAML frontmatter templates
- No runtime dependencies

## File Structure

- Modify: `plugin/skills/design/SKILL.md` — rename `slug` to `epic-id`, `epic` to `epic-slug` in PRD template frontmatter; no `problem`/`solution` in frontmatter (they stay as body sections, which is already the case)
- Modify: `plugin/skills/plan/SKILL.md` — rename `slug` to `epic-id`, `epic` to `epic-slug`, `feature` to `feature-slug` in feature plan template frontmatter; no `description` in frontmatter
- Modify: `plugin/skills/implement/SKILL.md` — rename `slug` to `epic-id`, `epic` to `epic-slug`, `feature` to `feature-slug` in checkpoint frontmatter; add `feature-id: <feature-id>`
- Modify: `plugin/skills/validate/SKILL.md` — rename `slug` to `epic-id`, `epic` to `epic-slug`, `failedFeatures` to `failed-features` in checkpoint frontmatter
- Modify: `plugin/skills/release/SKILL.md` — rename `slug` to `epic-id`, `epic` to `epic-slug` in release notes YAML frontmatter
- Create: `.beastmode/context/design/frontmatter-contract.md` — canonical contract documentation

---

### Task 1: Update design/SKILL.md frontmatter template

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `plugin/skills/design/SKILL.md`

- [x] **Step 1: Update PRD template frontmatter**

In the PRD Template section (Reference), replace the frontmatter block:

```yaml
---
phase: design
slug: <epic-id>
epic: <epic-name>
---
```

with:

```yaml
---
phase: design
epic-id: <epic-id>
epic-slug: <epic-name>
---
```

The `## Problem Statement` and `## Solution` sections already exist as body sections in the template (not as frontmatter fields), so no removal is needed there.

- [x] **Step 2: Verify no other frontmatter references in design/SKILL.md**

Search the file for any remaining occurrences of `slug:` or `epic:` in YAML frontmatter context that were not updated. Verify the two occurrences of the PRD template (one in the template block, one in the Feature Plan Format reference if any) are both updated.

- [x] **Step 3: Commit**

```bash
git add plugin/skills/design/SKILL.md
git commit -m "feat(skill-templates-and-docs): rename design frontmatter to epic-id/epic-slug"
```

---

### Task 2: Update plan/SKILL.md frontmatter template

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `plugin/skills/plan/SKILL.md`

- [x] **Step 1: Update all frontmatter blocks**

The plan SKILL.md has frontmatter templates in TWO locations:

1. **Phase 3: Checkpoint, Step 1** (around line 288-298) — the checkpoint frontmatter block
2. **Reference: Feature Plan Format** (around line 341-380) — the template example

In BOTH locations, replace:

```yaml
---
phase: plan
slug: <epic-id>
epic: <epic-name>
feature: <feature-name>
wave: <N>
---
```

with:

```yaml
---
phase: plan
epic-id: <epic-id>
epic-slug: <epic-name>
feature-slug: <feature-name>
wave: <N>
---
```

No `description` field exists in the current frontmatter (it's already a body section), so no removal needed.

- [x] **Step 2: Verify consistency**

Confirm both frontmatter blocks in plan/SKILL.md use identical field names. Grep for any remaining `slug:`, `epic:`, or `feature:` that should have been renamed.

- [x] **Step 3: Commit**

```bash
git add plugin/skills/plan/SKILL.md
git commit -m "feat(skill-templates-and-docs): rename plan frontmatter to epic-id/epic-slug/feature-slug"
```

---

### Task 3: Update implement/SKILL.md frontmatter template

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `plugin/skills/implement/SKILL.md`

- [x] **Step 1: Update checkpoint frontmatter block**

In Phase 3: Checkpoint, Step 1 (around line 398-408), replace:

```yaml
---
phase: implement
slug: <epic-id>
epic: <epic-name>
feature: <feature-name>
status: completed
---
```

with:

```yaml
---
phase: implement
epic-id: <epic-id>
epic-slug: <epic-name>
feature-id: <feature-id>
feature-slug: <feature-name>
status: completed
---
```

Note: `feature-id: <feature-id>` is a new field (identity echo).

- [x] **Step 2: Verify no other frontmatter references missed**

Search for remaining `slug:`, `epic:`, `feature:` in YAML frontmatter context. The `.tasks.md` file is explicitly noted as having NO frontmatter, so only the checkpoint block should have frontmatter.

- [x] **Step 3: Commit**

```bash
git add plugin/skills/implement/SKILL.md
git commit -m "feat(skill-templates-and-docs): rename implement frontmatter, add feature-id"
```

---

### Task 4: Update validate/SKILL.md frontmatter template

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `plugin/skills/validate/SKILL.md`

- [x] **Step 1: Update checkpoint frontmatter block**

In Phase 3: Checkpoint, Step 1 (around line 139-148), replace:

```yaml
---
phase: validate
slug: <epic-id>
epic: <epic-name>
status: passed
failedFeatures: feat-a,feat-b
---
```

with:

```yaml
---
phase: validate
epic-id: <epic-id>
epic-slug: <epic-name>
status: passed
failed-features: feat-a,feat-b
---
```

- [x] **Step 2: Verify surrounding prose uses new field name**

Check the prose around the frontmatter (lines 150-155) that describes `failedFeatures`. Update any prose references to use `failed-features` consistently.

- [x] **Step 3: Commit**

```bash
git add plugin/skills/validate/SKILL.md
git commit -m "feat(skill-templates-and-docs): rename validate frontmatter to epic-id/epic-slug/failed-features"
```

---

### Task 5: Update release/SKILL.md frontmatter template

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `plugin/skills/release/SKILL.md`

- [x] **Step 1: Update release notes YAML frontmatter**

In Phase 3: Checkpoint, Step 4 (around line 206-214), replace:

```yaml
---
phase: release
slug: <epic-id>
epic: <epic-name>
bump: minor
---
```

with:

```yaml
---
phase: release
epic-id: <epic-id>
epic-slug: <epic-name>
bump: minor
---
```

- [x] **Step 2: Verify no other frontmatter blocks in release/SKILL.md**

Search for any other YAML frontmatter blocks containing `slug:` or `epic:` that need updating.

- [x] **Step 3: Commit**

```bash
git add plugin/skills/release/SKILL.md
git commit -m "feat(skill-templates-and-docs): rename release frontmatter to epic-id/epic-slug"
```

---

### Task 6: Create frontmatter contract documentation

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5

**Files:**
- Create: `.beastmode/context/design/frontmatter-contract.md`

- [x] **Step 1: Create the contract documentation file**

Create `.beastmode/context/design/frontmatter-contract.md` with the following content:

```markdown
# Frontmatter Contract

## Pipeline Loop Architecture

The five-step loop that governs all phase execution:

1. CLI reads the store, picks the next work item
2. session-start primes context into the Claude session (env vars + metadata)
3. Skill does the work, writes markdown with frontmatter
4. session-stop translates frontmatter into output.json (dumb pass-through)
5. CLI detects the JSON, updates the store (reconcile), advances phase, loops

Session-stop is a translator. Reconcile is the brain.

## Unified Field Naming

All layers use the same names:

| Env var | Metadata-in | Frontmatter | output.json |
|---|---|---|---|
| `BEASTMODE_PHASE` | `phase` | `phase` | `phase` (implicit) |
| `BEASTMODE_EPIC_ID` | `epic-id` | `epic-id` | `epic-id` |
| `BEASTMODE_EPIC_SLUG` | `epic-slug` | `epic-slug` | `epic-slug` |
| `BEASTMODE_FEATURE_ID` | `feature-id` | `feature-id` | `feature-id` |
| `BEASTMODE_FEATURE_SLUG` | `feature-slug` | `feature-slug` | `feature-slug` |

## Per-Phase Field Tables

Fields marked **DECISION** are produced by the skill. All others are identity echoes.

### design

```yaml
phase: design
epic-id: <hex>                    # echo
epic-slug: <skill-proposed-slug>  # DECISION — may differ from env var
```

### plan (per feature file)

```yaml
phase: plan
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
feature-slug: <name>             # DECISION
wave: <N>                        # DECISION
```

### implement

```yaml
phase: implement
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
feature-id: <id>                 # echo
feature-slug: <slug>             # echo
status: completed|error          # DECISION
```

### validate

```yaml
phase: validate
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
status: passed|failed            # DECISION
failed-features: a,b             # DECISION (only when status: failed)
```

### release

```yaml
phase: release
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
bump: major|minor|patch          # DECISION
```

## Removed Fields

These old field names are removed from frontmatter:

| Old field | Replacement | Migration |
|---|---|---|
| `slug` | `epic-id` | Direct rename |
| `epic` | `epic-slug` | Direct rename |
| `feature` | `feature-slug` | Direct rename |
| `id` | `epic-id` | Direct rename (was legacy fallback) |
| `failedFeatures` | `failed-features` | Kebab-case alignment |
| `problem` | Body `## Problem Statement` | Content extraction by reconcile |
| `solution` | Body `## Solution` | Content extraction by reconcile |
| `description` | Body `## What to Build` | Content extraction by reconcile |

## Content Extraction Pattern

Reconcile reads content from artifact markdown body sections, not from frontmatter or output.json:

- `## Problem Statement` + `## Solution` → `epic.summary` (design phase)
- Feature description → `feature.description` (plan phase)

GitHub sync reads these from the store as before. No change to GitHub sync's data source.

## Session-Stop Behavior

Session-stop is a dumb pass-through:
- Scans `artifacts/<phase>/` for `.md` files with YAML frontmatter
- Writes all frontmatter fields verbatim to output.json
- For plan phase: aggregates multiple plan artifacts into `features[]` array
- No env var comparison, no identity/decision distinction, no rename logic
```

- [x] **Step 2: Verify contract doc matches skill templates**

Cross-reference the per-phase field tables in the contract doc against the actual frontmatter blocks in all 5 SKILL.md files (updated by Tasks 1-5). Verify field names and field sets match exactly.

- [x] **Step 3: Commit**

```bash
git add .beastmode/context/design/frontmatter-contract.md
git commit -m "feat(skill-templates-and-docs): create frontmatter contract documentation"
```
