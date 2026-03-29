# Docs Refresh Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Sync ROADMAP, progressive-hierarchy, and retro-loop docs with beastmode v0.14.30 shipped state.

**Architecture:** Direct edits to three files. No new files, no structural changes. ROADMAP gets new "Now" entries and one "Later" update. Two essays get single-line fixes.

**Tech Stack:** Markdown

**Design Doc:** [.beastmode/state/design/2026-03-08-docs-refresh.md](.beastmode/state/design/2026-03-08-docs-refresh.md)

---

### Task 0: Update ROADMAP "Now" section

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `ROADMAP.md:6-19`

**Step 1: Add shipped features to "Now" section**

After the existing "Now" entries (after `- **Checkpoint restart** ...`), add:

```markdown
- **Unified `/beastmode` command** — `init`, `status`, and `ideas` subcommands in a single entry point
- **Deferred ideas capture** — ideas surfaced during any phase are captured and reconciled at release
- **Feature name arguments** — pass feature names directly to phase commands (e.g., `/plan docs-refresh`)
- **Conversational design flow** — one-question-at-a-time dialogue replaces upfront interrogation
- **Visual language spec** — `█▓░▒` block characters for phase indicators and progress display
- **Hierarchy format v2** — bullet format everywhere, replacing mixed prose/bullets in L1 summaries
- **Squash-per-release** — feature branches squash to main with archive tags preserving full history
- **Meta hierarchy rebuild** — L1/L2/L3 structure for meta domain, matching context domain layout
```

**Step 2: Fix brownfield line in "Now"**

Replace:

```markdown
- **Brownfield discovery** — `/beastmode init --brownfield` auto-populates context from existing codebases
```

With:

```markdown
- **Brownfield discovery** — `/beastmode init` auto-populates context from existing codebases
```

**Step 3: Verify**

Read `ROADMAP.md` and verify the "Now" section has 18 entries total, no duplicate entries, and consistent formatting.

---

### Task 1: Update ROADMAP "Later" section

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `ROADMAP.md:33`

**Step 1: Update Progressive Autonomy Stage 3 entry**

Replace:

```markdown
- **Progressive Autonomy Stage 3** — agent teams. Multiple agents pull features from a shared tasklist. Peers, not hierarchy. Each agent runs the full design → release pipeline independently.
```

With:

```markdown
- **Progressive Autonomy Stage 3** — agent teams. Claude Code now ships native team support (TeamCreate, SendMessage). Multiple agents pull features from a shared tasklist. Peers, not hierarchy. Each agent runs the full design → release pipeline independently.
```

**Step 2: Verify**

Read `ROADMAP.md` and confirm the "Later" entry references native Claude Code team support.

---

### Task 2: Fix L0 line count in progressive-hierarchy.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `docs/progressive-hierarchy.md:46-47`
- Modify: `docs/progressive-hierarchy.md:137`

**Step 1: Fix L0 description**

Replace:

```markdown
The sole autoloaded file (~80 lines). Contains hierarchy spec, persona definition,
```

With:

```markdown
The sole autoloaded file (~40 lines). Contains hierarchy spec, persona definition,
```

**Step 2: Fix "Why This Matters" section**

Replace:

```markdown
**Token efficiency.** Agents load L0 by default (~80 lines). L1 loaded during
```

With:

```markdown
**Token efficiency.** Agents load L0 by default (~40 lines). L1 loaded during
```

**Step 3: Verify**

Read `docs/progressive-hierarchy.md` and confirm both occurrences of "~80 lines" are now "~40 lines".

---

### Task 3: Fix brownfield reference in retro-loop.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `docs/retro-loop.md:97`

**Step 1: Remove --brownfield flag**

Replace:

```markdown
**Week 8:** A new team member runs `/beastmode init --brownfield` on their clone.
```

With:

```markdown
**Week 8:** A new team member runs `/beastmode init` on their clone.
```

**Step 2: Verify**

Read `docs/retro-loop.md` and confirm the brownfield flag is removed.
