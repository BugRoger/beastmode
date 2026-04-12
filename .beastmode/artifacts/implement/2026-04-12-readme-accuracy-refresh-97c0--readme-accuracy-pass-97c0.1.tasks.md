# README Accuracy Pass — Implementation Tasks

## Goal

Update `README.md` to accurately reflect the v0.124 codebase. Six sections have drifted: Pipeline table, CLI commands, Dashboard description, Orchestration model, GitHub Integration state model, and Install instructions. High-level structure (headings, ordering, narrative arc) is preserved. No new sections added. No code changes. Single file target.

## Architecture Context

- **Store:** Single JSON file at `.beastmode/state/store.json`. Entities (epics, features) have typed statuses, dependency chains, and wave assignments. Store is the sole operational authority.
- **Implement model:** One agent per feature on the shared feature branch. Wave file isolation guarantees disjoint file sets — no per-feature worktrees, no merge step. Two-stage review per task.
- **Dashboard:** Fullscreen Ink/React TUI. Three-panel layout (epics, details, tree log). Heartbeat countdown timer. Persistent stats with session/all-time toggle. Phase-colored badges (Monokai Pro palette). Nyan rainbow focus border on active panel. Keyboard extensions: tab focus, phase filter cycling, blocked toggle, PgUp/PgDn scroll, filter search, cancel with confirmation.
- **GitHub sync:** Store is operational authority, GitHub is a one-way mirror. Label taxonomy: `type/epic`, `phase/*`, `status/*`. Project board (V2) status synced via GraphQL. Retry queue with exponential backoff. Commit ref annotation on phase checkpoints. Closing comments on release with version tag.
- **CLI commands:** `design`, `plan <slug>`, `implement <slug> [feature]`, `validate <slug>`, `release <slug>`, `done <slug>`, `cancelled <slug>`, `cancel <slug> [--force]`, `dashboard`, `compact`, `store <subcommand>`, `hooks <name> [phase]`, `help`. Flags: `-v`, `-vv`, `-vvv`.
- **Install:** Package name `beastmode` on npm. `npx beastmode install` / `npx beastmode uninstall`. Prerequisites: macOS, Node.js >= 18, Claude Code, Git, iTerm2, GitHub CLI (optional).

## File Structure

- **Modify:** `README.md` — all six section edits target this single file

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1, T2, T3, T4, T5, T6 | **README.md** (all tasks) | no | all tasks modify the same file |

---

## Tasks

### Task 1: Update Pipeline Table — Implement Row

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:54-60`

**Step 1: Read current Pipeline table**

Run: `sed -n '54,60p' README.md`
Expected output includes the line:
```
| Implement | `/implement` | Fan out one agent per feature in parallel worktrees. Two-stage review per task. |
```

- [x] **Step 2: Replace the Implement row**

In `README.md`, replace this exact line:

```markdown
| Implement | `/implement` | Fan out one agent per feature in parallel worktrees. Two-stage review per task. |
```

with:

```markdown
| Implement | `/implement` | Dispatch parallel agents on the shared feature branch with wave file isolation. Two-stage review per task. |
```

No other rows change. The table header and all other rows remain identical.

- [x] **Step 3: Verify the change**

Run: `sed -n '54,60p' README.md`
Expected: The Implement row now reads "Dispatch parallel agents on the shared feature branch with wave file isolation. Two-stage review per task." and all other rows are unchanged.

- [x] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): fix Pipeline table Implement row — shared branch, not worktrees"
```

---

### Task 2: Rewrite Orchestration Section

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `README.md:167-174`

- [x] **Step 1: Read current Orchestration section**

Run: `grep -n 'Orchestration' README.md` to confirm exact line numbers, then read lines 167-174.

The current section reads:

```markdown
### Orchestration

The pipeline is a state machine. Each epic tracks its phase, features, and artifacts in a manifest file. The CLI owns the full lifecycle:

- **Worktrees** — created at first phase, persisted through all phases, squash-merged and removed at release. Branch detection reuses `feature/<slug>` if it exists.
- **Parallel implement** — one agent per feature in isolated worktrees. After all agents finish, worktrees merge sequentially with pre-merge conflict simulation. Manifest verified for completeness.
- **Phase regression** — validation failures regress specific failing features back to implement with a dispatch budget. Blanket regression available as fallback. Phase tags mark reset points.
- **Recovery** — manifests are the recovery point. On startup, existing worktrees with uncommitted changes are detected and re-dispatched from last committed state.
```

- [x] **Step 2: Replace the Orchestration section**

Replace the entire block from `### Orchestration` through the `- **Recovery**` bullet (lines 167-174) with:

```markdown
### Orchestration

The pipeline is a state machine. A single JSON file store at `.beastmode/state/store.json` tracks epics and features with typed statuses, dependency chains, and wave assignments. The store is the sole operational authority.

- **Implement dispatch** — one agent per feature on the shared feature branch. Wave file isolation guarantees disjoint file sets across parallel tasks. No per-feature worktrees, no merge step.
- **Phase regression** — validation failures regress failing features to implement with a dispatch budget. Phase tags mark reset points for re-entry.
- **Recovery** — on startup, store state is loaded from disk. Pending operations resume from last saved state.
```

- [x] **Step 3: Verify no manifest references remain**

Run: `grep -i 'manifest' README.md`
Expected: No output (zero matches). All manifest references have been removed.

- [x] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): rewrite Orchestration — JSON file store, direct commits, no manifests"
```

---

### Task 3: Replace CLI Command Block with Complete Reference

**Wave:** 1
**Depends on:** Task 2

**Files:**
- Modify: `README.md:147-156`

- [x] **Step 1: Read current CLI section**

Run: `sed -n '147,156p' README.md`

The current section reads:

```markdown
## The CLI

Skills handle the work inside each phase. The `beastmode` CLI handles everything around it.

```
beastmode <phase> <slug>     # run a single phase
beastmode dashboard          # fullscreen pipeline monitor + orchestrator
beastmode cancel <slug>      # clean up a feature (worktree, branch, tags, artifacts, GitHub issue)
beastmode compact            # prune and promote the context tree
```
```

- [x] **Step 2: Replace the CLI command block**

Replace the entire block from the opening ` ``` ` through the closing ` ``` ` (the code fence containing `beastmode <phase> <slug>` through `beastmode compact`) with:

```
beastmode design                      Start a new design
beastmode plan <slug>                 Plan features for a design
beastmode implement <slug> [feature]  Implement features
beastmode validate <slug>             Run validation checks
beastmode release <slug>              Create a release
beastmode done <slug>                 Mark epic as done
beastmode cancelled <slug>            Mark epic as cancelled
beastmode cancel <slug> [--force]     Clean up an epic (branch, tags, artifacts, GitHub issues)
beastmode dashboard                   Fullscreen pipeline dashboard and orchestrator
beastmode compact                     Audit and compact the context tree
beastmode store <subcommand>          Structured task store operations
beastmode hooks <name> [phase]        Run a hook handler
beastmode help                        Show help

Flags: -v, -vv, -vvv                 Increase output verbosity
```

Keep the intro paragraph ("Skills handle the work...") unchanged. Keep it wrapped in a code fence (triple backticks).

- [x] **Step 3: Verify all commands are listed**

Run: `grep -c 'beastmode ' README.md` inside the CLI section to confirm all 13 command lines plus the Flags line are present.

Verify these commands appear: `design`, `plan`, `implement`, `validate`, `release`, `done`, `cancelled`, `cancel`, `dashboard`, `compact`, `store`, `hooks`, `help`.

- [x] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): complete CLI command reference — all 13 commands + verbosity flags"
```

---

### Task 4: Expand Dashboard Section

**Wave:** 1
**Depends on:** Task 3

**Files:**
- Modify: `README.md:158-166` (line numbers may have shifted from prior tasks — locate by `### Dashboard` heading)

- [x] **Step 1: Read current Dashboard section**

Run: `grep -n '### Dashboard' README.md` to find the heading, then read the section.

The current section reads:

```markdown
### Dashboard

`beastmode dashboard` is both the monitor and the orchestrator. It scans for epics that have a design but no release, and drives them through plan -> implement -> validate -> release automatically.

- Fullscreen terminal UI with epic list, detail panel, and live log stream
- Dispatches one terminal session per phase, one per feature during implement
- Keyboard navigation, phase and status filters, inline cancel with confirmation
- Color-coded phase badges, animated header, verbosity cycling
```

- [x] **Step 2: Replace the Dashboard section**

Replace the entire Dashboard section (from `### Dashboard` through the last bullet) with:

```markdown
### Dashboard

`beastmode dashboard` is both the monitor and the orchestrator. It scans for epics that have a design but no release, and drives them through plan -> implement -> validate -> release automatically.

- Fullscreen terminal UI with epic list, details panel, and hierarchical tree log (SYSTEM > epic > feature)
- Heartbeat countdown timer showing seconds until next poll cycle
- Persistent stats with session/all-time toggle (sessions, success rate, phase durations, retries)
- Phase-colored badges using Monokai Pro palette
- Keyboard extensions: tab focus between panels, phase filter cycling, blocked toggle, PgUp/PgDn scroll, filter search, cancel with confirmation
- Animated nyan rainbow focus border on active panel
```

- [x] **Step 3: Verify all required features are mentioned**

Grep the Dashboard section for each required term:
- `heartbeat countdown` — present
- `persistent stats` or `session/all-time` — present
- `tree log` or `hierarchical` — present
- `phase-colored badges` — present
- `keyboard extensions` — present
- `nyan rainbow focus border` — present

Run: `sed -n '/### Dashboard/,/### /p' README.md | head -10`

- [x] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): expand Dashboard — heartbeat, stats, tree log, keyboard, nyan border"
```

---

### Task 5: Rewrite GitHub Integration Section

**Wave:** 1
**Depends on:** Task 4

**Files:**
- Modify: `README.md:176-183` (line numbers may have shifted from prior tasks — locate by `### GitHub Integration` heading)

- [x] **Step 1: Read current GitHub Integration section**

Run: `grep -n '### GitHub Integration' README.md` to find the heading, then read the section.

The current section reads:

```markdown
### GitHub Integration

When `github.enabled: true` in config, the CLI mirrors pipeline state to GitHub:

- **Epic and feature issues** — created automatically, updated after each phase
- **Labels as source of truth** — phase, type, and status labels drive the state model
- **Project board sync** — issues appear on a GitHub Projects V2 board
- **Commit refs** — phase checkpoints and release merges annotate commit messages with issue numbers
```

- [x] **Step 2: Replace the GitHub Integration section**

Replace the entire GitHub Integration section (from `### GitHub Integration` through the last bullet) with:

```markdown
### GitHub Integration

When `github.enabled: true` in config, the store mirrors pipeline state to GitHub as a one-way sync:

- **Store as authority** — `.beastmode/state/store.json` is the operational source of truth. GitHub reflects store state, never the reverse.
- **Epic and feature issues** — created automatically, updated after each phase
- **Label taxonomy** — `type/epic`, `type/feature`, `phase/*`, `status/*` labels categorize issues
- **Project board sync** — V2 board status synced via GraphQL
- **Retry queue** — failed sync operations retry with exponential backoff
- **Commit refs** — phase checkpoints annotate commit messages with issue numbers
- **Release closing** — done epics receive a closing comment with version tag
```

- [x] **Step 3: Verify no "labels as source of truth" language remains**

Run: `grep -i 'labels as source' README.md`
Expected: No output (zero matches).

Run: `grep -i 'store as authority' README.md`
Expected: One match in the GitHub Integration section.

- [x] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): rewrite GitHub Integration — store as authority, GitHub as mirror"
```

---

### Task 6: Verify and Correct Install Section

**Wave:** 1
**Depends on:** Task 5

**Files:**
- Modify: `README.md:16-50` (line numbers may have shifted from prior tasks — locate by `## Install` heading)

- [x] **Step 1: Read current Install section**

Run: `grep -n '## Install' README.md` to find the heading, then read through line 50.

Verify against ground truth:
- Package name in `package.json` at root: `"name": "beastmode"` — correct
- Install command: `npx beastmode install` — correct
- Uninstall command: `npx beastmode uninstall` — correct
- Prerequisites: macOS, Node.js >= 18, Claude Code, Git, iTerm2, GitHub CLI optional — check each row

- [x] **Step 2: Verify prerequisites table**

Check each prerequisite row against the codebase:

| Prerequisite | README says | Code says | Match? |
|---|---|---|---|
| macOS | "Only supported platform" | iTerm2 dependency confirms macOS-only | Yes |
| Node.js >= 18 | ">= 18" | `package.json` engines: `"node": ">=18"` | Yes |
| Claude Code | AI coding assistant | Plugin system targets Claude Code | Yes |
| Git | "Worktree operations" | `cli/src/git/` exists, worktree.ts present | Yes |
| iTerm2 | "Pipeline orchestration" | `cli/src/dispatch/it2.ts` confirms iTerm2 dispatch | Yes |
| GitHub CLI | optional | `cli/src/github/cli.ts` wraps `gh` commands | Yes |

- [x] **Step 3: Fix Git prerequisite description if needed**

The current Git row says "Worktree operations" — but the system no longer uses worktrees for implementation. The Git requirement is for branch operations, commits, and version control. Replace:

```markdown
| [Git](https://git-scm.com/) | Worktree operations |
```

with:

```markdown
| [Git](https://git-scm.com/) | Branch and commit operations |
```

- [x] **Step 4: Verify init section accuracy**

The text after "Uninstall" (lines 44-50) describes `/beastmode init`. This is a skill command invoked inside Claude Code, not a CLI command. Verify it exists:

Run: `grep -r 'beastmode init' plugin/skills/` to confirm the skill exists.

The init description in the README should remain as-is — it accurately describes what init does (detects stack, bootstraps hierarchy).

- [x] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(readme): fix Install prerequisites — Git for branch ops, not worktree ops"
```

---

## Acceptance Criteria Mapping

| Criterion | Task |
|---|---|
| Pipeline table Implement row describes parallel agents on shared feature branch, not parallel worktrees | Task 1 |
| Orchestration section describes JSON file store, direct commits, wave file isolation, phase tag regression — no manifest references | Task 2 |
| CLI section lists all top-level commands: design, plan, implement, validate, release, done, cancelled, cancel, compact, dashboard, store, hooks, help | Task 3 |
| Dashboard mentions heartbeat countdown, persistent stats toggle, tree log hierarchy, phase-colored badges, keyboard extensions, nyan rainbow focus border | Task 4 |
| GitHub Integration identifies store as operational authority, GitHub as one-way mirror — no "labels as source of truth" | Task 5 |
| Install commands and package name correct, prerequisites accurate | Task 6 |
