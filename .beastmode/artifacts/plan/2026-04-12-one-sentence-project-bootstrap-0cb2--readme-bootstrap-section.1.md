---
phase: plan
epic-id: bm-0cb2
epic-slug: one-sentence-project-bootstrap-0cb2
feature-name: README Bootstrap Section
wave: 1
---

# README Bootstrap Section

**Design:** .beastmode/artifacts/design/2026-04-12-one-sentence-project-bootstrap-0cb2.md

## User Stories

1. As a developer new to Beastmode, I want to copy one paragraph from the README and paste it into Claude Code, so that my project is fully set up without me learning any commands.
2. As a developer setting up Beastmode, I want prerequisites listed clearly before the paste sentence, so that I know what to install before I start.
3. As a developer with an existing project, I want the bootstrap to install Beastmode, drop the skeleton, and configure GitHub integration in one flow, so that I don't have to chain three separate commands myself.

## What to Build

Replace the entire "Install" section of README.md (Requirements table, One-Liner, Uninstall, Init subsections) with a new "Get the Party Started" section positioned after the title/banner and tagline block, before "The Problem" section.

The new section contains two parts:

**Prerequisites** — an inline bulleted list of what the user needs before starting. Each bullet names the prerequisite, its purpose, and whether it's required or optional. Items: macOS, Node.js >= 18, Claude Code CLI, Git, GitHub CLI (optional, for GitHub integration), iTerm2 (optional, for pipeline dashboard).

**Bootstrap paragraph** — a single prose paragraph written in goal-oriented natural language (not raw shell commands). The paragraph tells Claude Code to execute three steps in sequence: install Beastmode via `npx beastmode install`, initialize the project skeleton via `/beastmode init` (skeleton-only mode, no full discovery), and configure GitHub integration via `/beastmode setup-github`. The prose should be clear enough that Claude interprets the intent and runs the commands, and clear enough that a human reading it understands what will happen.

**Removals** — the existing "Install" section (including Requirements table, One-Liner code block, Uninstall code block, and Init code block with description) is deleted entirely. No uninstall instructions in the new README. No duplicate installation paths.

The rest of the README structure remains unchanged.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] "Get the Party Started" section exists after the banner/tagline block and before "The Problem" section
- [ ] Prerequisites are listed as inline bullets with purpose and required/optional status
- [ ] A single prose paragraph names all three bootstrap steps in sequence
- [ ] The prose paragraph is goal-oriented natural language, not raw shell commands
- [ ] The existing "Install" section (Requirements, One-Liner, Uninstall, Init) is completely removed
- [ ] No uninstall instructions exist anywhere in the README
- [ ] The rest of the README structure is unchanged
- [ ] README renders correctly as GitHub-flavored markdown
