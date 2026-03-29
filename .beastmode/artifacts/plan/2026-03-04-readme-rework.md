# README Rework Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Rewrite beastmode's README to follow high-star GitHub patterns — centered hero, outcome tagline, early install, personality, no credibility killers.

**Architecture:** Single-file rewrite of `README.md`. Research identified 8 priorities from analyzing 6 repos with 11k-73k stars. The rewrite addresses all 8 in a structured top-to-bottom pass. Demo visual is a placeholder (requires user to record a terminal session separately).

**Tech Stack:** Markdown, shields.io badges, HTML center-align tags

**Research Doc:** `.beastmode/state/research/2026-03-04-readme-star-patterns.md`

---

### Task 0: Create Demo Visual Placeholder

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `assets/demo-placeholder.md`

**Step 1: Create assets directory and placeholder**

Create `assets/demo-placeholder.md` explaining how to record the demo later:

```markdown
# Demo Recording Guide

Record a terminal session showing beastmode in action:
1. Install asciinema: `brew install asciinema`
2. Record: `asciinema rec demo.cast`
3. Run a quick /design → /plan → /implement cycle
4. Convert to SVG: `npx svg-term-cli --in demo.cast --out assets/demo.svg`

Place the resulting `demo.svg` in this directory and update README.md.
```

**Step 2: Verify**

Confirm `assets/demo-placeholder.md` exists and has recording instructions.
No commit needed — unified commit at /release.

---

### Task 1: Rewrite README.md

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `README.md:1-134`

**Step 1: Write the complete new README**

Replace the entire `README.md` with the following structure. The content below is the exact file to write:

````markdown
<div align="center">

# beastmode

**Turn Claude Code into a disciplined engineering partner.**

Opinionated workflow patterns that survived contact with reality.

[![GitHub stars](https://img.shields.io/github/stars/BugRoger/beastmode?style=flat-square)](https://github.com/BugRoger/beastmode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.0-blue?style=flat-square)](https://github.com/BugRoger/beastmode)

</div>

---

```bash
claude plugin add beastmode@beastmode-marketplace
```

<!-- TODO: Replace with assets/demo.svg when recorded -->
<!-- ![beastmode demo](assets/demo.svg) -->

## What It Does

Claude Code is powerful. But without structure, you re-explain your project every session, get inconsistent implementations, and lose work between context windows.

Beastmode fixes this. Five phases. Context persists. Patterns compound.

```
/design → /plan → /implement → /validate → /release
```

**Quick fix?** Implement, done.
**New feature?** Design the approach. Plan the tasks. Implement. Validate. Release.
**Multi-session?** Each phase writes artifacts to `.beastmode/`. Next session picks up where you left off.

## Install

```bash
claude plugin add beastmode@beastmode-marketplace
```

Then initialize your project:

```bash
/beastmode install                # scaffold .beastmode/ structure
/beastmode init --brownfield      # auto-discover existing codebase
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/design` | Brainstorm and create design specs through collaborative dialogue |
| `/plan` | Turn designs into bite-sized implementation tasks |
| `/implement` | Execute plans in isolated git worktrees |
| `/validate` | Quality gate — tests, lint, type checks |
| `/release` | Changelog, version bump, merge to main |
| `/status` | Track project state and milestones |
| `/beastmode` | Project initialization and discovery |

## How It Works

Every phase writes artifacts to `.beastmode/` — design specs, implementation plans, validation records, release notes. Your root `CLAUDE.md` imports the project context. Next session, Claude starts with full knowledge of your project.

The `.beastmode/` folder organizes four domains:
- **Product** — what you're building (vision, goals)
- **Context** — how to build it (architecture, conventions, testing)
- **State** — where features are in the workflow (design → release)
- **Meta** — what you've learned (phase retros that improve future sessions)

Knowledge compounds. After each cycle, learnings feed back into your project context. Claude gets smarter about *your* codebase over time.

## Why This Works

**Proven workflow.** Design before code. Plan before build. Old wisdom, applied to AI coding.

**Context survives sessions.** No lost work. No repeated explanations. Artifacts persist in git.

**Scales to complexity.** Trivial change? Skip to implement. Complex feature? Run every phase.

**No ceremony.** No sprint planning. No story points. No standups. Just you, Claude, and the work.

## Credits

Built on ideas from [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done).

## License

MIT
````

**Key changes from current README:**
1. Centered header with badges (Priority 2, 6)
2. Install command in first screen (Priority 7)
3. Demo visual placeholder with HTML comment (Priority 1)
4. "What It Does" with personality — names the pain (Priority 5)
5. Status table removed entirely (Priority 3)
6. Folder tree replaced with prose explanation (Priority 4)
7. Skills table reflects actual v0.5.0 skills (no /prime, /retro, /research)
8. Credits tightened to one line (was full sentences)
9. File naming section removed (internal docs, not marketing)
10. "Phase Research" paragraph removed (implementation detail)

**Step 2: Verify structure**

Verify the new README has these sections in order:
1. Centered header with tagline + badges
2. One-line install (first code block)
3. Demo placeholder comment
4. "What It Does" (problem + solution)
5. Install section (expanded)
6. Skills table
7. "How It Works" (prose, not tree)
8. "Why This Works"
9. Credits
10. License

**Step 3: Verify no credibility killers**

Grep the new file and confirm:
- No 🚧 emoji
- No status table with incomplete items
- No directory tree
- No references to deprecated skills (/prime, /retro, /research)

No commit needed — unified commit at /release.

---

### Task 2: Final Verification

**Wave:** 3
**Depends on:** Task 1

**Files:**
- Read: `README.md`
- Read: `assets/demo-placeholder.md`

**Step 1: Line count check**

Count lines in new README. Target: 80-120 lines. The research showed shortest READMEs (superpowers 157, claude-code 68) have the most stars.

**Step 2: First-10-lines test**

Read the first 10 lines and verify they contain:
- Centered title
- Tagline
- Badges
- Install command

Nothing else. No explanation, no workflow details.

**Step 3: Verify badge URLs resolve**

Check that shield.io badge URLs use the correct repository path (`BugRoger/beastmode`).

No commit needed — unified commit at /release.
