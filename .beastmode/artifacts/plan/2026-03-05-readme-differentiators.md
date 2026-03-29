# README Differentiators Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add a prominent "What Makes It Different" section to the README with four equal-weight differentiators, and remove the redundant "Why This Works" section.

**Architecture:** Single-file edit to README.md. Insert new section after "What It Does", remove "Why This Works". Net change ~+30 lines (add ~40, remove ~10).

**Tech Stack:** Markdown

**Design Doc:** [readme-differentiators](../design/2026-03-05-readme-differentiators.md)

---

### Task 1: Add Differentiators Section and Remove Redundant Section

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:36-84`

**Step 1: Add "What Makes It Different" section after "What It Does"**

Insert the following after line 36 (after the closing line of "What It Does" section) and before "## Install":

```markdown
## What Makes It Different

**Structured context, not flat retrieval.**

Embedding-based retrieval treats your codebase as a flat bag of chunks. As the codebase grows, precision collapses — agents get noise instead of signal, spending tokens on irrelevant context.

Beastmode organizes project knowledge into four levels: product vision, domain summaries, detail files, and raw artifacts. Agents navigate curated summaries at each level, loading detail only when the current task requires it. Deterministic navigation through a known structure, not probabilistic search through a vector space.

[Read the full argument →](docs/progressive-hierarchy.md)

**Knowledge compounds.**

Most AI tools start every session from scratch. Mistakes repeat. Patterns are rediscovered. Nothing accumulates.

Beastmode captures learnings at the end of every phase. Retro agents classify findings into standard procedures, project-specific overrides, and session insights. Recurring patterns auto-promote to SOPs. Each cycle makes Claude smarter about *your* codebase — not just any codebase.

**Context survives sessions.**

New session, blank slate, explain the architecture again. This is the default experience with AI coding tools.

Beastmode writes artifacts to `.beastmode/` — design specs, implementation plans, validation records, release notes. All stored as markdown in git. No vector database to maintain, no embeddings to regenerate. Context survives sessions, branches, and collaborators because it's just files in your repo.

**Design before code.**

Ask an AI for a login form and you might get an entire auth system. Without structure, scope explodes and implementation goes sideways.

Beastmode provides five phases: design the approach, plan the tasks, implement in isolation, validate quality, release to main. Trivial change? Skip to implement. Complex feature? Run every phase. The structure scales to complexity without adding overhead to simple work.
```

**Step 2: Remove "Why This Works" section**

Delete the "Why This Works" section (the `## Why This Works` heading and all its content through the last bullet "No ceremony...").

**Step 3: Verify**

- Count total README lines — must be under 120
- Verify `docs/progressive-hierarchy.md` link is valid (file exists)
- Read the full README to confirm flow: What It Does → What Makes It Different → Install → Skills → How It Works → Credits
- No commit needed — unified commit at /release
