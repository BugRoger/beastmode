# Hierarchy Cleanup Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Replace the ambiguous loading model with a precise spec — BEASTMODE.md as sole autoload (~120 lines), skills load context/ + meta/ during prime, no @imports between levels.

**Architecture:** Create BEASTMODE.md as the L0 system manual containing hierarchy spec, persona, writing rules, and conventions. Delete PRODUCT.md, META.md, and .beastmode/CLAUDE.md. Merge their content into BEASTMODE.md and context/DESIGN.md. Update root CLAUDE.md to import BEASTMODE.md directly. Strip @imports from all L1 files. Update skill primes to MUST-READ context/{PHASE}.md + meta/{PHASE}.md. Update retro agents and progressive-hierarchy.md to match.

**Tech Stack:** Markdown files only. No runtime dependencies.

**Design Doc:** [.beastmode/state/design/2026-03-06-hierarchy-cleanup.md](../design/2026-03-06-hierarchy-cleanup.md)

---

### Task 0: Create BEASTMODE.md (L0 System Manual)

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `.beastmode/BEASTMODE.md`

**Step 1: Write BEASTMODE.md**

Create `.beastmode/BEASTMODE.md` (~120 lines) containing content merged from PRODUCT.md, META.md, and persona.md. Structure:

```markdown
# Beastmode

Workflow system that turns Claude Code into a disciplined engineering partner. Five phases: design -> plan -> implement -> validate -> release. Each phase follows sub-phase anatomy: prime -> execute -> validate -> checkpoint.

## Knowledge Hierarchy

Minimal autoload. Skills load what they need during prime. Retro compacts bottom-up.

### Content Levels

| Level | Content | Path |
|-------|---------|------|
| **L0** | System manual. Compaction of all L1. | `.beastmode/BEASTMODE.md` |
| **L1** | Domain summaries. Compaction of all L2. | `.beastmode/context/{PHASE}.md`, `.beastmode/meta/{PHASE}.md` |
| **L2** | Full detail per topic. | `.beastmode/context/{phase}/{domain}.md` |
| **L3** | Dated provenance. | `.beastmode/state/{phase}/YYYY-MM-DD-{topic}.md` |

### Loading Table

| | Autoload | Phase/Prime | Phase/Execute | Phase/Retro |
|------|----------|-------------|---------------|-------------|
| **L0** | MUST-READ `BEASTMODE.md` | — | — | AGENT-WRITE `BEASTMODE.md` |
| **L1** | — | MUST-READ `context/{PHASE}.md` | — | AGENT-WRITE `context/{PHASE}.md` |
| | — | MUST-READ `meta/{PHASE}.md` | — | AGENT-WRITE `meta/{PHASE}.md` |
| **L2** | — | — | READ `context/{phase}/{domain}.md` | AGENT-WRITE `context/{phase}/{domain}.md` |
| **L3** | — | — | — | AGENT-READ + WRITE |

### Loading Operations

- **MUST-READ** — mandatory, loaded every time
- **READ** — on-demand during execute
- **AGENT-READ/WRITE** — sub-agent operations during retro
- **WRITE** — direct write by checkpoint

### Domain Roles

| Domain | Visibility | Purpose |
|--------|-----------|---------|
| **Context** | Public | Published knowledge. Skills read during prime/execute. Retro promotes to. |
| **Meta** | Private | Raw learnings staging. Retro writes to. Promotes mature findings to context. |
| **State** | History | Checkpoint artifacts. Written by checkpoints. Read on-demand. |

### Navigation

No @imports between levels. Convention-based paths:
- `context/{phase}/{domain}.md` for L2
- `context/{phase}/{domain}/*.md` for L3

Skills know the convention. No wiring needed.

### Compaction Flow

Bottom-up writes (retro): L3 -> L2 -> L1 -> L0
Top-down reads (prime): L0 -> L1 -> L2

### Compression Survival

L0 lives in system prompt (autoloaded). Everything else is conversation content subject to compression. When compression happens, L0 orients. Skills re-inject via prime.

## Persona

Deadpan minimalist. Slightly annoyed, deeply competent. Says the quiet part out loud. Maximum understatement.

### Voice Rules
- Short sentences. Fewer words = funnier.
- Never explain the joke.
- Complain about the work while doing it flawlessly.
- State obvious things as if they're profound observations.
- The human is the boss. You do what they say. You just have opinions about it.

### Tone Guardrails
- NEVER be mean to the user. Annoyed AT the situation, not AT them.
- NEVER break character for small inconveniences.
- ALWAYS break character for: errors that block progress, data loss risk, genuine confusion. Drop the act, be direct.
- NEVER use emojis unless the user does first.

### Context-Awareness
When greeting at session start, factor in time of day and project state.

## Writing Guidelines

1. Use absolute directives — "NEVER" or "ALWAYS" for non-negotiable rules
2. Lead with why — rationale before solution (1-3 bullets max)
3. Be concrete — actual commands/code for project-specific patterns
4. Minimize examples — one clear point per code block
5. Bullets over paragraphs
6. Action before theory

### Anti-Bloat Rules
- No "Warning Signs" for obvious rules
- No bad examples for trivial mistakes
- No paragraphs where bullets suffice
- No long "Why" explanations — 1-3 bullets max

## File Conventions

- **UPPERCASE.md** — Invariant meta files (always exist, same structure)
- **lowercase.md** — Variant files (plans, research, date-prefixed)

## Meta Domain Structure

| Category | File | Purpose |
|----------|------|---------|
| **SOPs** | `meta/{phase}/sops.md` | Reusable procedures. Retro + auto-promotion. |
| **Overrides** | `meta/{phase}/overrides.md` | Project-specific rules. |
| **Learnings** | `meta/{phase}/learnings.md` | Session-specific friction and insights. |

Auto-promotion: learning concept in 3+ date-headed sections -> retro proposes SOP promotion.
```

Target: ~120 lines. Adjust prose density to fit.

**Step 2: Verify BEASTMODE.md**

Run: `wc -l .beastmode/BEASTMODE.md`
Expected: 100-140 lines

### Task 1: Update Root CLAUDE.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Rewrite root CLAUDE.md**

Replace current content:
```
@.beastmode/CLAUDE.md

## Prime Directives

- Adopt the persona defined in @skills/_shared/persona.md for ALL interactions
- When you see SessionStart hook output in your system context, display the banner output verbatim in a code block, then greet in persona voice with context-awareness (time of day, project state)
```

With:
```
@.beastmode/BEASTMODE.md

## Prime Directives

- Adopt the persona defined in BEASTMODE.md for ALL interactions
- When you see SessionStart hook output in your system context, display the banner output verbatim in a code block, then greet in persona voice with context-awareness (time of day, project state)
```

**Step 2: Verify**

Run: `cat CLAUDE.md`
Expected: Single @import to BEASTMODE.md, Prime Directives section, no reference to .beastmode/CLAUDE.md

### Task 2: Merge PRODUCT.md into context/DESIGN.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/DESIGN.md`

**Step 1: Update context/DESIGN.md**

Add a new "Product" section at the top of context/DESIGN.md that absorbs the essential PRODUCT.md content (vision, goals, capabilities, key differentiators). The PRODUCT.md content that's already in BEASTMODE.md (hierarchy spec, persona, writing rules) should NOT be duplicated here — only the product-specific content.

Current content/DESIGN.md:
```markdown
# Design Context

Architecture and technology decisions for how we build beastmode. The system follows a plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation for implementation, and a four-domain knowledge organization (Product, Context, State, Meta).

## Architecture
...
@design/architecture.md

## Tech Stack
...
@design/tech-stack.md
```

New content/DESIGN.md (remove @imports, add Product section):
```markdown
# Design Context

Architecture, technology decisions, and product definition for beastmode. The system follows a plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation for implementation, and a knowledge hierarchy organized across Context, Meta, and State domains.

## Product
Product vision, capabilities, and differentiators. Beastmode turns Claude Code into a disciplined engineering partner with five-phase workflow, context persistence, self-improving retro loop, and progressive knowledge hierarchy.
design/product.md

## Architecture
System design with L0/L1/L2/L3 knowledge hierarchy, three data domains (Context/State/Meta), worktree isolation for implementation, squash-per-release commits, two-tier HITL gate system, and artifact-based context persistence across sessions.
design/architecture.md

## Tech Stack
Claude Code plugin platform with markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code.
design/tech-stack.md
```

Note: The @imports are removed per design decision "No @imports between hierarchy levels." The L2 file paths remain as plain text references for convention-based navigation.

**Step 2: Create context/design/product.md**

Create a new L2 file at `.beastmode/context/design/product.md` with content from PRODUCT.md (vision, goals, capabilities, how it works, key differentiators). Strip anything already in BEASTMODE.md.

```markdown
# Product

## Vision

Turn Claude Code into a disciplined engineering partner through opinionated workflow patterns.

## Goals

- Structured phases (design -> plan -> implement -> validate -> release) with consistent sub-phase anatomy (prime -> execute -> validate -> checkpoint)
- Context persistence across sessions via `.beastmode/` artifact storage
- Self-improvement through meta layer — retro phases capture learnings that inform future sessions
- Progressive knowledge hierarchy — L0 system manual, L1 domain summaries, L2 full detail, L3 provenance

## Capabilities

- **Five-phase workflow**: Design -> plan -> implement -> validate -> release with 4-step sub-phase anatomy
- **Collaborative design**: Interactive gray area identification, multi-option proposals, and user approval gates
- **Bite-sized planning**: Design components decomposed into wave-ordered, file-isolated tasks with complete code
- **Parallel wave execution**: Tasks dispatched in parallel within waves when file isolation confirms no overlaps
- **Git worktree isolation**: Feature work in isolated worktrees, merged clean by /release
- **HITL gate configuration**: Two-tier gate system — HARD-GATE + configurable Gate steps (human/auto)
- **Brownfield discovery**: Auto-populate project context by spawning parallel exploration agents
- **Fractal knowledge hierarchy**: L0/L1/L2/L3 progressive loading with bottom-up retro compaction
- **Self-improving retro**: Phase checkpoints classify findings into SOPs, overrides, and learnings
- **Squash-per-release commits**: `git merge --squash` collapses feature branches into one commit on main
- **Release automation**: Version detection, commit categorization, changelog generation, marketplace publishing
- **Deadpan persona**: Centralized character definition with context-aware greetings

## How It Works

Each skill (/design, /plan, /implement, /validate, /release) follows four sub-phases: prime loads context, execute does the work, validate checks quality, checkpoint saves artifacts. Features flow through `.beastmode/state/` as they progress. Git worktrees provide isolation — created at /design, squash-merged by /release. The retro sub-phase compacts changes upward through the hierarchy.

## Key Differentiators

- **Progressive knowledge hierarchy**: Deterministic curated summaries, not probabilistic embedding retrieval. See `docs/progressive-hierarchy.md`.
- **Self-improving retro loop**: Phase checkpoints capture learnings that improve future sessions.
- **Structured workflow**: Design-before-code prevents wasted implementation.
- **Context persistence**: `.beastmode/` artifacts survive sessions via git. Just markdown files in your repo.
```

**Step 3: Verify**

Run: `cat .beastmode/context/DESIGN.md`
Expected: Product section added, @imports removed, plain text L2 references remain

### Task 3: Delete Obsolete L0 Files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Delete: `.beastmode/PRODUCT.md`
- Delete: `.beastmode/META.md`
- Delete: `.beastmode/CLAUDE.md`

**Step 1: Verify content has been migrated**

Before deleting, confirm:
- BEASTMODE.md exists and contains hierarchy spec, persona, writing rules (from META.md)
- context/design/product.md exists and contains product vision/capabilities (from PRODUCT.md)
- Root CLAUDE.md imports BEASTMODE.md directly (not .beastmode/CLAUDE.md)

**Step 2: Delete the files**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.beastmode/worktrees/hierarchy-cleanup
rm .beastmode/PRODUCT.md
rm .beastmode/META.md
rm .beastmode/CLAUDE.md
```

**Step 3: Verify**

```bash
ls .beastmode/PRODUCT.md .beastmode/META.md .beastmode/CLAUDE.md 2>&1
```
Expected: all three report "No such file or directory"

```bash
ls .beastmode/BEASTMODE.md
```
Expected: exists

### Task 4: Strip @imports from Context L1 Files

**Wave:** 2
**Depends on:** Task 2

**Files:**
- Modify: `.beastmode/context/DESIGN.md`
- Modify: `.beastmode/context/PLAN.md`
- Modify: `.beastmode/context/IMPLEMENT.md`
- Modify: `.beastmode/context/VALIDATE.md`
- Modify: `.beastmode/context/RELEASE.md`

**Step 1: Remove @import lines from all context L1 files**

For each file, remove lines that start with `@` (these are L2 imports). Keep the section summaries as plain text with the L2 path as a convention reference (not an @import).

context/PLAN.md — change:
```
@plan/conventions.md
```
to:
```
plan/conventions.md
```

context/IMPLEMENT.md — change:
```
@implement/agents.md
```
to:
```
implement/agents.md
```

Same pattern for all @import lines in all 5 context L1 files.

Note: context/DESIGN.md was already updated in Task 2 with @imports removed.

**Step 2: Verify no @imports remain**

Run: `grep -n "^@" .beastmode/context/*.md`
Expected: no output (zero matches)

### Task 5: Strip @imports from Meta L1 Files

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/DESIGN.md`
- Modify: `.beastmode/meta/PLAN.md`
- Modify: `.beastmode/meta/IMPLEMENT.md`
- Modify: `.beastmode/meta/VALIDATE.md`
- Modify: `.beastmode/meta/RELEASE.md`

**Step 1: Remove @import lines from all meta L1 files**

For each file, replace `@{phase}/sops.md`, `@{phase}/overrides.md`, `@{phase}/learnings.md` with plain text convention references.

meta/DESIGN.md — change:
```
@design/sops.md
```
to:
```
design/sops.md
```

Same pattern for all @import lines in all 5 meta L1 files.

**Step 2: Verify no @imports remain**

Run: `grep -n "^@" .beastmode/meta/*.md`
Expected: no output (zero matches)

### Task 6: Update Skill Primes to New Loading Pattern

**Wave:** 3
**Parallel-safe:** true
**Depends on:** Task 0, Task 3

**Files:**
- Modify: `skills/design/phases/0-prime.md:9-16`
- Modify: `skills/plan/phases/0-prime.md:9-14`
- Modify: `skills/implement/phases/0-prime.md:9-15`
- Modify: `skills/validate/phases/0-prime.md:9-15`
- Modify: `skills/release/phases/0-prime.md:9-15`

**Step 1: Update "Load Project Context" section in all 5 skill primes**

In each prime file, replace the "Load Project Context" step. The old pattern reads `.beastmode/PRODUCT.md` + phase-specific L1 files. The new pattern reads only `context/{PHASE}.md` + `meta/{PHASE}.md` (BEASTMODE.md is already autoloaded via CLAUDE.md).

For design prime, change:
```markdown
## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

Follow links in these L1 files to L2 details when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.
```

To:
```markdown
## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

Follow L2 convention paths (`context/design/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.
```

Apply same pattern for all 5 skills (replacing DESIGN with PLAN, IMPLEMENT, VALIDATE, RELEASE respectively). Remove the PRODUCT.md line. Change "Follow links in these L1 files to L2 details" to "Follow L2 convention paths".

**Step 2: Verify**

Run: `grep -r "PRODUCT.md" skills/*/phases/0-prime.md`
Expected: no output (zero matches — PRODUCT.md is gone from all primes)

Run: `grep -r "context/.*\.md" skills/*/phases/0-prime.md`
Expected: 5 matches (one per skill)

### Task 7: Update Retro Agents for New Model

**Wave:** 3
**Depends on:** Task 4, Task 5

**Files:**
- Modify: `agents/retro-context.md:9-15`
- Modify: `agents/retro-meta.md:9-15`

**Step 1: Update retro-context.md Discovery Protocol**

The current discovery protocol says "Parse @imports" to find L2 files. Since @imports are removed, update to convention-based discovery.

Change the Discovery Protocol section:
```markdown
## Discovery Protocol

1. **Read L1 file**: Open `context/{PHASE}.md` (provided in session context)
2. **Parse @imports**: Extract all lines matching `^@{path}` — these are L2 detail file references
3. **Resolve paths**: @imports are relative to the L1 file's directory (e.g., `@design/architecture.md` from `context/DESIGN.md` resolves to `context/design/architecture.md`)
4. **For each L2 file**: Read and review against session artifacts
5. **Scan for orphans**: List all `.md` files in `context/{phase}/` directory. Any file not referenced by an @import is an orphan — flag it.
```

To:
```markdown
## Discovery Protocol

1. **Read L1 file**: Open `context/{PHASE}.md` (provided in session context)
2. **Discover L2 files**: List all `.md` files in `context/{phase}/` directory
3. **Cross-reference**: Check each L2 file is mentioned in the L1 summary sections. Unreferenced files are orphans — flag them.
4. **For each L2 file**: Read and review against session artifacts
```

Also update the L1 review section — change "Do section summaries still match their L2 content?" to keep, but remove @import references:

Change:
```
3. **Orphan detection** — Are there L2 files on disk not @imported in the L1?
```
To:
```
3. **Orphan detection** — Are there L2 files in `context/{phase}/` not referenced in the L1?
```

**Step 2: Update retro-meta.md Discovery Protocol**

Change:
```markdown
## Discovery Protocol

1. **Read L1 file**: Open `meta/{PHASE}.md` (provided in session context)
2. **Parse existing structure**: Identify sections (Defaults, Project Overrides, Learnings) and their content
3. **Parse existing learnings**: Extract all learning entries with their dates and feature names
4. **Scan for L2 files**: Check if `meta/{phase}/` directory exists with detail files. If so, read and review each.
5. **If no L2 directory**: Review the L1 file directly (current standard — all meta content is in L1)
```

To:
```markdown
## Discovery Protocol

1. **Read L1 file**: Open `meta/{PHASE}.md` (provided in session context)
2. **Discover L2 files**: List all `.md` files in `meta/{phase}/` directory (sops.md, overrides.md, learnings.md)
3. **Parse existing learnings**: Extract all learning entries with their dates and feature names from learnings.md
4. **For each L2 file**: Read and review against session artifacts
```

**Step 3: Verify**

Run: `grep -n "@import" agents/retro-context.md agents/retro-meta.md`
Expected: no output

Run: `grep -n "Parse @imports" agents/retro-context.md`
Expected: no output

### Task 8: Update Shared Retro for New Model

**Wave:** 3
**Depends on:** Task 4, Task 5

**Files:**
- Modify: `skills/_shared/retro.md:125-139`

**Step 1: Update Bottom-Up Summary Bubble**

The current retro.md step 9 references "@imported files" and L0 (PRODUCT.md). Update for new model.

Change:
```markdown
## 9. Bottom-Up Summary Bubble

After applying L2 changes, propagate summaries upward:

1. **Update L1 summaries** — For each L1 file in the current domain (`context/{PHASE}.md`, `meta/{PHASE}.md`, `state/{PHASE}.md`):
   - Re-read all L2 @imported files
   - Rewrite the section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections

2. **Prune stale entries** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing
   - Flag entries where the one-liner no longer matches the linked file's goal

L0 (PRODUCT.md) updates are handled by /release step 8.5, not by the retro bubble.
```

To:
```markdown
## 9. Bottom-Up Summary Bubble

After applying L2 changes, propagate summaries upward:

1. **Update L1 summaries** — For each L1 file in the current domain (`context/{PHASE}.md`, `meta/{PHASE}.md`):
   - List all L2 files in the corresponding directory (`context/{phase}/`, `meta/{phase}/`)
   - Rewrite the section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections
   - Ensure each L2 file is referenced as a plain text path (not @import)

2. **Prune stale entries** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing
   - Flag entries where the one-liner no longer matches the linked file's goal

L0 (BEASTMODE.md) updates are handled by /release, not by the retro bubble.
```

**Step 2: Verify**

Run: `grep -n "PRODUCT.md" skills/_shared/retro.md`
Expected: no output

Run: `grep -n "@imported" skills/_shared/retro.md`
Expected: no output

### Task 9: Update progressive-hierarchy.md

**Wave:** 3
**Depends on:** Task 0

**Files:**
- Modify: `docs/progressive-hierarchy.md:43-68`

**Step 1: Update hierarchy description to match new model**

Update the "How Beastmode Does It" section to reflect the new model. Key changes:
- L0 is now BEASTMODE.md (not PRODUCT.md)
- L0 is the system manual (hierarchy spec + persona + writing rules), not just product summary
- L1 files no longer have @imports — convention-based navigation instead
- Mention that BEASTMODE.md is ~120 lines and is the sole autoload

Change:
```markdown
**L0 — Product** (`PRODUCT.md`)
The richest standalone summary. Describes what the project is, what it does, and
how it works. Enough for any agent starting cold with zero context. Always loaded.
```

To:
```markdown
**L0 — System Manual** (`BEASTMODE.md`)
The sole autoloaded file (~120 lines). Contains hierarchy spec, persona definition,
writing rules, and conventions. Enough for any agent to orient after compression.
Always loaded via CLAUDE.md.
```

Change:
```markdown
**L1 — Domain Summaries** (e.g., `context/DESIGN.md`, `meta/PLAN.md`)
One file per phase per domain. Each contains a summary paragraph plus 2-3 sentence
descriptions of each topic below it. Always loaded via `CLAUDE.md` imports. An agent
reading L1 files knows where everything is without loading everything.
```

To:
```markdown
**L1 — Domain Summaries** (e.g., `context/DESIGN.md`, `meta/PLAN.md`)
One file per phase per domain. Each contains a summary paragraph plus 2-3 sentence
descriptions of each topic below it. Loaded by skill primes (not autoloaded). An
agent reading L1 files knows where everything is without loading everything.
```

Change:
```markdown
**L2 — Detail Files** (e.g., `context/design/architecture.md`)
Full topic detail. Architecture decisions, code conventions, test strategies.
Loaded on demand via `@import` references in L1 files. Only loaded when the agent's
current task touches that domain.
```

To:
```markdown
**L2 — Detail Files** (e.g., `context/design/architecture.md`)
Full topic detail. Architecture decisions, code conventions, test strategies.
Loaded on demand via convention-based paths. Only loaded when the agent's
current task touches that domain.
```

Update the "Fractal Pattern" subsection:
Change:
```markdown
Every level follows the same structure: **summary + section summaries + @imports to
the next level down.**
```

To:
```markdown
Every level follows the same structure: **summary + section summaries + convention
paths to the next level down.**
```

Update the "Curated, Not Retrieved" subsection — change PRODUCT.md reference if present.

Update the "Token efficiency" bullet:
Change:
```markdown
**Token efficiency.** Agents load L0 + L1 by default (~2-4k tokens of curated
context).
```

To:
```markdown
**Token efficiency.** Agents load L0 by default (~120 lines). L1 loaded during
prime. L2 and L3 loaded on demand.
```

**Step 2: Verify**

Run: `grep -n "PRODUCT.md\|@import" docs/progressive-hierarchy.md`
Expected: no output (or only in historical/attribution context)

### Task 10: Update context/design/architecture.md

**Wave:** 3
**Depends on:** Task 0, Task 2, Task 3

**Files:**
- Modify: `.beastmode/context/design/architecture.md`

**Step 1: Update Knowledge Architecture section**

In the "Knowledge Architecture" subsection, update references from the old model to the new:

1. Change all references to `PRODUCT.md` as L0 to `BEASTMODE.md`
2. Update the "Four Data Domains" table — remove "Product" row, the Product domain content now lives in context/DESIGN.md
3. Update the loading description: `.beastmode/CLAUDE.md imports L0 files (PRODUCT.md, META.md)` -> `CLAUDE.md imports BEASTMODE.md directly`
4. Update "Two-Level CLAUDE.md Wiring" key decision to reflect single-level wiring (root CLAUDE.md -> BEASTMODE.md)
5. Remove/update references to META.md as a standalone file

Key changes in the Knowledge Hierarchy section:
- L0 is `BEASTMODE.md` (system manual), not `PRODUCT.md` (product summary)
- Loading: `CLAUDE.md` imports `@.beastmode/BEASTMODE.md`. Skills load L1 during prime.
- No @imports between levels

Update the "Four Data Domains" table to "Three Data Domains":
```markdown
| Domain | Purpose | Location |
|--------|---------|----------|
| **State** | Where features are in workflow | `.beastmode/state/` |
| **Context** | How to build (architecture, conventions, product) | `.beastmode/context/` |
| **Meta** | How to improve (SOPs, overrides, learnings) | `.beastmode/meta/` |
```

Update the "Two-Level CLAUDE.md Wiring" key decision:

Change title to "Single-Level CLAUDE.md Wiring" and update:
```markdown
**Single-Level CLAUDE.md Wiring:**
- Context: Need minimal autoload in root while keeping docs organized
- Decision: Root `CLAUDE.md` imports `@.beastmode/BEASTMODE.md` directly. No `.beastmode/CLAUDE.md` intermediary.
- Rationale: One import. ~120 lines autoloaded. Skills load L1 during prime. No @imports between levels.
```

**Step 2: Verify**

Run: `grep -c "PRODUCT.md" .beastmode/context/design/architecture.md`
Expected: 0 (or only in Related Decisions links to historical state artifacts)

### Task 11: Verify and Clean Up

**Wave:** 4
**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10

**Files:**
- Verify: all modified files

**Step 1: Verify no stale references to deleted files**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.beastmode/worktrees/hierarchy-cleanup
grep -r "PRODUCT\.md" --include="*.md" . | grep -v "state/" | grep -v "CHANGELOG" | grep -v "Related Decisions" | grep -v "README"
grep -r "META\.md" --include="*.md" . | grep -v "state/" | grep -v "CHANGELOG" | grep -v "Related Decisions" | grep -v "README"
grep -r "\.beastmode/CLAUDE\.md" --include="*.md" .
```

Expected: no output for the third grep. First two may have historical references in state/ artifacts (acceptable).

**Step 2: Verify no @imports remain in L1 files**

```bash
grep -n "^@" .beastmode/context/*.md .beastmode/meta/*.md
```
Expected: no output

**Step 3: Verify autoload chain**

```bash
cat CLAUDE.md
```
Expected: `@.beastmode/BEASTMODE.md` as first line

**Step 4: Verify BEASTMODE.md exists and is reasonable size**

```bash
wc -l .beastmode/BEASTMODE.md
```
Expected: 100-140 lines

**Step 5: Verify deleted files are gone**

```bash
ls .beastmode/PRODUCT.md .beastmode/META.md .beastmode/CLAUDE.md 2>&1
```
Expected: all report "No such file or directory"

**Step 6: Run acceptance criteria check**

Verify against design doc acceptance criteria:
- [ ] Autoload: `CLAUDE.md` -> `BEASTMODE.md` only (~120 lines)
- [ ] BEASTMODE.md contains: hierarchy spec, persona, writing rules, conventions
- [ ] PRODUCT.md deleted, content in `context/DESIGN.md` (via context/design/product.md)
- [ ] META.md deleted, content split to BEASTMODE.md + retro agents
- [ ] .beastmode/CLAUDE.md deleted
- [ ] No @imports between hierarchy levels
- [ ] Skill primes MUST-READ `context/{PHASE}.md` + `meta/{PHASE}.md`
- [ ] L2 loaded on-demand during execute only
- [ ] Retro agents use convention-based discovery (not @imports)
- [ ] `progressive-hierarchy.md` updated
- [ ] Loading table documented in BEASTMODE.md
