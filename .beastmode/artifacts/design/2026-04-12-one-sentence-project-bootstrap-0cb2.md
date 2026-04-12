---
phase: design
epic-id: bm-0cb2
epic-slug: one-sentence-project-bootstrap-0cb2
epic-name: One-Sentence Project Bootstrap
---

## Problem Statement

Getting Beastmode into a new project requires knowing about three separate commands (`npx beastmode install`, `/beastmode init`, `/beastmode setup-github`) and sequencing them correctly. New users have to read the README, find the install section, and figure out the order themselves. This friction kills adoption — the first 30 seconds should be effortless.

## Solution

A "Get the Party Started" section at the top of the README containing a single paragraph that humans paste into their Claude Code terminal. Claude reads the prose, recognizes the three commands, and executes them in sequence: install Beastmode, initialize the project skeleton, and configure GitHub integration interactively. No new CLI code — the existing commands are sufficient. The README also lists prerequisites inline so humans can verify before pasting.

## User Stories

1. As a developer new to Beastmode, I want to copy one paragraph from the README and paste it into Claude Code, so that my project is fully set up without me learning any commands.
2. As a developer setting up Beastmode, I want prerequisites listed clearly before the paste sentence, so that I know what to install before I start.
3. As a developer with an existing project, I want the bootstrap to install Beastmode, drop the skeleton, and configure GitHub integration in one flow, so that I don't have to chain three separate commands myself.

## Implementation Decisions

- The paste sentence is goal-oriented prose, not raw shell commands — Claude interprets the intent and runs the steps.
- The paste sentence explicitly names three steps: `npx beastmode install`, `/beastmode init` (skeleton only), and `/beastmode setup-github`.
- Init runs in skeleton-only mode — no heavy 5-phase discovery pass. Fast start, full discovery deferred.
- GitHub setup uses the existing interactive `/beastmode setup-github` flow — asks for repo owner/name, creates labels, project board.
- Prerequisites are listed as inline bullets directly below the section heading: macOS, Node.js >= 18, Claude Code CLI, Git, GitHub CLI (for GitHub integration), iTerm2 (optional, for pipeline dashboard).
- If a prerequisite is missing, Claude tells the user and stops gracefully — no auto-installation of prereqs.
- The new section replaces the existing "Install" section entirely — no duplicate installation instructions.
- Uninstall instructions are dropped from the README.
- The section goes after the title/banner line and tagline, before "The Problem" section.
- The rest of the README structure remains unchanged.
- No new CLI code, no new npx subcommands — this is purely a README change.

## Testing Decisions

- Manual testing: paste the sentence into Claude Code in a fresh project and verify all three steps complete.
- Verify Claude correctly interprets the prose and runs commands in the right order.
- Verify graceful failure when a prerequisite is missing (e.g., no `gh` CLI installed).
- Verify the README renders correctly on GitHub with the new section placement.

## Out of Scope

- New CLI commands or flags (e.g., `npx beastmode bootstrap`)
- Auto-installation of prerequisites
- Full 5-phase init discovery during bootstrap
- Non-interactive GitHub setup (auto-detect from git remote)
- Changes to the existing npx installer
- Changes to `/beastmode init` or `/beastmode setup-github` skills

## Further Notes

Inspired by [claude-memory-compiler](https://github.com/coleam00/claude-memory-compiler) which uses the same "paste prose into Claude Code" pattern for zero-friction setup.

## Deferred Ideas

None
