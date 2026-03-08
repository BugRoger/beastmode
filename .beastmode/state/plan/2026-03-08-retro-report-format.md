# Retro Report Format Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Replace opaque retro report templates with scannable, gate-aligned reports that show actual content for L1/L2 edits and one-sentence summaries for L3 records.

**Architecture:** Template replacement in `skills/_shared/retro.md` at steps 4, 7, 8, and 9. Visual prefixes (~, +, >>, ^, -) distinguish change types. Gate mechanics unchanged.

**Tech Stack:** Markdown templates (no runtime code)

**Design Doc:** `.beastmode/state/design/2026-03-08-retro-report-format.md`

---

### Task 0: Replace Context Changes template (Step 4)

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:50-61`

**Step 1: Replace the `[GATE-OPTION|human]` template for `retro.context-write`**

Replace lines 50-61 (the current `Review Context Changes` section) with:

```markdown
#### [GATE-OPTION|human] Review Context Changes

Present all proposed changes with actual content bullets:

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

**Prefix key:**
- `~` = edit existing file
- `+` = create new file / add content
- `-` with `→` = content being replaced
- Indented lines = actual content being written
```

**Step 2: Verify**

Read the modified file and confirm:
- Template uses `~` and `+` prefixes
- Template shows actual content with `-`/`→` for replacements
- Gate structure (`#### [GATE-OPTION|human]`) is preserved
- Auto-apply option unchanged

---

### Task 1: Replace Meta Review summary (Step 7)

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `skills/_shared/retro.md:106-118`

**Step 1: Replace step 7 "Present Meta Findings"**

Replace lines 106-118 (the current `Meta Review Results` block) with:

```markdown
### 7. Present Meta Findings

Show meta L2 edits inline, then flow into records and promotions sections.

If L2 edits exist:

```
### Retro: Meta Review

~ {target file}
  - "{old text}" → "{new text}"
  + Procedure: "{new rule text}"
```

If no L2 edits:

```
### Retro: Meta Review
```

If no findings at all (no L2 edits, no records, no promotions): print "Meta review: no changes needed." and skip gates 8-9.
```

**Step 2: Verify**

Read the modified file and confirm:
- L2 edits shown with actual content bullets
- No count-heavy summary block
- "No changes needed" fallback preserved

---

### Task 2: Replace Records template (Step 8)

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `skills/_shared/retro.md:125-136`

**Step 1: Replace the `[GATE-OPTION|human]` template for `retro.records`**

Replace lines 125-136 (the current `Review Records` section) with:

```markdown
#### [GATE-OPTION|human] Review Records

Present all proposed L3 records with one-sentence summaries:

```
#### Records ({N} proposed)

>> {existing file} — Observation {N} [{domain}] [{confidence}]
   {one-sentence summary}

+ {new file} [{domain}] [{confidence}]
   {one-sentence summary}

Apply records? [Y/n]
```

**Prefix key:**
- `>>` = append observation to existing record
- `+` = create new record file
- Indented line = one-sentence summary of the observation
- `[domain]` = process | workarounds
- `[confidence]` = LOW | MEDIUM | HIGH
```

**Step 2: Verify**

Read the modified file and confirm:
- Template uses `>>` for appends and `+` for new records
- Each record has a one-sentence summary line
- Domain and confidence tags present
- Gate structure preserved

---

### Task 3: Replace Promotions template (Step 9)

**Wave:** 1
**Depends on:** Task 2

**Files:**
- Modify: `skills/_shared/retro.md:150-161`

**Step 1: Replace the `[GATE-OPTION|human]` template for `retro.promotions`**

Replace lines 150-161 (the current `Review Promotions` section) with:

```markdown
#### [GATE-OPTION|human] Review Promotions

Present each proposed promotion with the actual rule:

```
#### Promotions ({N} candidates)

^ {entry title} — L3 → L1
  + Procedure: "{ALWAYS/NEVER rule text}"
  ({basis})

Apply promotions? [Y/n]
```

**Prefix key:**
- `^` = promote up hierarchy
- `+` = the rule being added to L1
- Indented `({basis})` = why this qualifies for promotion
```

**Step 2: Verify**

Read the modified file and confirm:
- Template uses `^` prefix for promotions
- Actual rule text shown with `+ Procedure:` line
- Basis shown in parentheses
- Gate structure preserved
