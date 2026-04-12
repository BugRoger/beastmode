# README Bootstrap Section — Implementation Tasks

## Goal

Replace the "Install" section of `README.md` (lines 15-51: Requirements table, One-Liner, Uninstall, Init subsections) with a new "Get the Party Started" section. The new section contains prerequisite bullets and a single prose paragraph that tells Claude Code to run three bootstrap commands in sequence. No new code. Single file target.

## Architecture Context

- **Target file:** `README.md` at repo root — the only file modified
- **Current structure:** Lines 1-8 are banner/tagline/phase diagram. Line 9 starts "The Problem". Lines 15-51 are the "Install" section. Line 52 starts "The Pipeline" section.
- **New section placement:** After the phase diagram code block (line 7-8), before "The Problem" (line 9). The new "Get the Party Started" section inserts between lines 8 and 9.
- **Deletion target:** The entire "Install" section (lines 15-51) is removed. No uninstall instructions remain.
- **No code changes** — this is purely a README documentation edit.

## File Structure

- **Modify:** `README.md` — delete "Install" section (lines 15-51), insert "Get the Party Started" section between the phase diagram block and "The Problem" section

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1 | **README.md** | n/a | single task |

---

## Tasks

### Task 1: Replace Install Section with Get the Party Started

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:8-51`

- [x] **Step 1: Verify current README structure**

Run: `head -55 README.md`

Confirm the following structure:
- Lines 1-8: Banner image, blank line, tagline, blank line, phase diagram code block, blank line
- Line 9: `## The Problem`
- Lines 15-51: `## Install` section (Requirements table, One-Liner, Uninstall, Init)
- Line 52: `## The Pipeline`

- [x] **Step 2: Insert "Get the Party Started" section and delete "Install" section**

The current README lines 1-8 look like this (keep unchanged):

```markdown
<img src="docs/assets/banner.svg" alt="beastmode" width="100%">

Turns Claude Code into a disciplined engineering partner. Five phases. Context that compounds. Patterns that stick.

```
/design -> /plan -> /implement -> /validate -> /release
```
```

After line 8 (the blank line after the closing code fence), insert the new section. Then delete the entire "Install" section (lines 15-51).

The result: replace everything from line 9 (`## The Problem`) through line 51 (end of Install section) with the new "Get the Party Started" section followed by "The Problem" section.

In `README.md`, find this exact block:

```markdown
## The Problem

Every AI coding session starts from scratch. You re-explain your architecture. Re-state your conventions. Re-describe decisions you made three sessions ago. The agent forgets everything between context windows, so you become the memory.

This works for quick fixes. It falls apart for anything that spans sessions.

## Install

### Requirements

| Prerequisite | Why |
|---|---|
| macOS | Only supported platform |
| [Node.js](https://nodejs.org/) >= 18 | Runtime for npx |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | AI coding assistant |
| [Git](https://git-scm.com/) | Branch and commit operations |
| [iTerm2](https://iterm2.com/) | Pipeline orchestration |
| [GitHub CLI](https://cli.github.com/) *(optional)* | Issue and project board sync |

### One-Liner

```bash
npx beastmode install
```

Installs the plugin, CLI, and all dependencies. Re-run to update.

### Uninstall

```bash
npx beastmode uninstall
```

Removes the plugin and CLI link. Project data in `.beastmode/` is preserved.

Initialize your project:

```bash
/beastmode init
```

Init detects your stack and bootstraps the full knowledge hierarchy — inventory, context writing, retro, and synthesis. Existing projects get 17 detected domains populated from your codebase. New projects get the skeleton and a nudge toward `/design`.
```

Replace it with:

```markdown
## Get the Party Started

**Prerequisites:**

- **macOS** — only supported platform (required)
- **[Node.js](https://nodejs.org/) >= 18** — runtime for npx (required)
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — AI coding assistant (required)
- **[Git](https://git-scm.com/)** — branch and commit operations (required)
- **[GitHub CLI](https://cli.github.com/)** — issue and project board sync (optional, for GitHub integration)
- **[iTerm2](https://iterm2.com/)** — pipeline dashboard terminal (optional, for pipeline dashboard)

**Paste this into Claude Code:**

> Install Beastmode into this project by running `npx beastmode install`. Once that finishes, initialize the project skeleton by running the `/beastmode init` skill in skeleton-only mode — skip full discovery, just lay down the directory structure and config files. Finally, set up GitHub integration by running the `/beastmode setup-github` skill, which will ask for the repository details and configure labels, project board, and issue sync.

## The Problem

Every AI coding session starts from scratch. You re-explain your architecture. Re-state your conventions. Re-describe decisions you made three sessions ago. The agent forgets everything between context windows, so you become the memory.

This works for quick fixes. It falls apart for anything that spans sessions.
```

- [x] **Step 3: Verify the new section exists and is correctly placed**

Run: `head -30 README.md`

Expected structure:
1. Line 1: Banner image tag
2. Line 3: Tagline paragraph
3. Lines 5-7: Phase diagram code block
4. Line 9: `## Get the Party Started`
5. Line 11: `**Prerequisites:**`
6. Lines 13-18: Six prerequisite bullets
7. Line 20: `**Paste this into Claude Code:**`
8. Lines 22-22: Blockquote paragraph with three bootstrap steps
9. Line 24: `## The Problem`

- [x] **Step 4: Verify the Install section is completely removed**

Run: `grep -n '## Install' README.md`
Expected: No output (zero matches). The "Install" heading no longer exists.

Run: `grep -n 'Uninstall' README.md`
Expected: No output (zero matches). No uninstall instructions remain.

Run: `grep -n '### Requirements' README.md`
Expected: No output (zero matches).

Run: `grep -n '### One-Liner' README.md`
Expected: No output (zero matches).

- [x] **Step 5: Verify prerequisite content**

Run: `grep -c 'required)' README.md`
Expected: 4 (macOS, Node.js, Claude Code, Git)

Run: `grep -c 'optional' README.md`
Expected: At least 2 (GitHub CLI and iTerm2 bullets contain "optional")

Verify each prerequisite bullet includes: name, purpose, and required/optional status.

- [x] **Step 6: Verify bootstrap paragraph content**

Run: `grep 'npx beastmode install' README.md`
Expected: One match inside the blockquote paragraph.

Run: `grep 'beastmode init' README.md`
Expected: At least one match inside the blockquote paragraph (the `/beastmode init` reference).

Run: `grep 'beastmode setup-github' README.md`
Expected: One match inside the blockquote paragraph.

Verify the paragraph is prose (not a code block with shell commands), goal-oriented, and names all three steps in sequence.

- [x] **Step 7: Verify rest of README is unchanged**

Run: `grep -n '## The Pipeline' README.md`
Expected: One match. "The Pipeline" section still exists after "The Problem".

Run: `grep -n '## Three Ideas' README.md`
Expected: One match.

Run: `grep -n '## License' README.md`
Expected: One match at the end of the file.

Run: `tail -5 README.md`
Expected: Ends with `MIT` and a trailing newline — same as before.

- [x] **Step 8: Commit**

```bash
git add README.md
git commit -m "docs(readme): replace Install with Get the Party Started bootstrap section"
```

---

## Acceptance Criteria Mapping

| Criterion | Task | Step |
|---|---|---|
| "Get the Party Started" section exists after banner/tagline and before "The Problem" | Task 1 | Steps 2, 3 |
| Prerequisites listed as inline bullets with purpose and required/optional status | Task 1 | Steps 2, 5 |
| Single prose paragraph names all three bootstrap steps in sequence | Task 1 | Steps 2, 6 |
| Prose paragraph is goal-oriented natural language, not raw shell commands | Task 1 | Steps 2, 6 |
| Existing "Install" section completely removed | Task 1 | Steps 2, 4 |
| No uninstall instructions anywhere in README | Task 1 | Step 4 |
| Rest of README structure unchanged | Task 1 | Step 7 |
| README renders correctly as GitHub-flavored markdown | Task 1 | Step 3 (structural verification) |
