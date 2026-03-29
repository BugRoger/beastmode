# Knowledge Hierarchy Format Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Standardize all L1/L2/L3 context files as rule-lists with dense summaries, update BEASTMODE.md hierarchy table, and add format enforcement to retro agents.

**Architecture:** Rewrite L1 files as dense-summary + numbered-rules grouped by L2 domain. Rewrite L2 files as detailed-summary + domain-adapted-rules grouped by L3 record topics. Extract key decisions from L2 files into new L3 record files at `context/{phase}/{domain}/{record}.md`. Update BEASTMODE.md hierarchy table. Add format spec and rule-writing principles to retro-context agent.

**Tech Stack:** Markdown files, retro agent prompts

**Design Doc:** [.beastmode/state/design/2026-03-06-knowledge-hierarchy-format.md](../design/2026-03-06-knowledge-hierarchy-format.md)

---

### Task 0: Update BEASTMODE.md Knowledge Hierarchy Table

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/BEASTMODE.md:38-47`

**Step 1: Update the hierarchy table**

Change the L3 row from "Dated artifacts" to "Records" and update the path:

```markdown
| Level | Content | Path |
|-------|---------|------|
| **L0** | System manual (this file) | `.beastmode/BEASTMODE.md` |
| **L1** | Phase summaries | `.beastmode/context/{PHASE}.md`, `.beastmode/meta/{PHASE}.md` |
| **L2** | Full detail per topic | `.beastmode/context/{phase}/{domain}.md` |
| **L3** | Records | `.beastmode/context/{phase}/{domain}/{record}.md` |
```

**Step 2: Verify**

Read `.beastmode/BEASTMODE.md` and confirm the table is correct. L3 now says "Records" with path `context/{phase}/{domain}/{record}.md`. State remains in the Domains table unchanged.

---

### Task 1: Rewrite L1 Context Files (Design, Plan, Implement)

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/DESIGN.md`
- Modify: `.beastmode/context/PLAN.md`
- Modify: `.beastmode/context/IMPLEMENT.md`

**Step 1: Rewrite DESIGN.md to rule-list format**

Replace current content with:

```markdown
# Design Context

Architecture, technology decisions, and product definition for beastmode. Plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation, and a knowledge hierarchy organized across Context, Meta, and State domains. Five-phase workflow (design → plan → implement → validate → release) with four sub-phases each. Two-tier HITL gate system. Retro-driven knowledge promotion.

## Product
Product vision, capabilities, and differentiators. Beastmode turns Claude Code into a disciplined engineering partner with five-phase workflow, context persistence, self-improving retro loop, and progressive knowledge hierarchy.

1. ALWAYS design before code — structured phases prevent wasted implementation
2. NEVER skip the retro sub-phase — it's how the system learns and improves
3. Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation, brownfield discovery, fractal knowledge hierarchy, self-improving retro, squash-per-release commits, release automation, deadpan persona

design/product.md

## Architecture
System design with L0/L1/L2/L3 knowledge hierarchy, tiered L2 domain taxonomy (universal/high-frequency/specialized), three data domains (Context/State/Meta), worktree isolation, squash-per-release commits, two-tier HITL gate system, retro-driven promotion, and artifact-based context persistence.

1. ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
2. NEVER use @imports between hierarchy levels — convention-based paths only
3. Three data domains: State (feature workflow), Context (published knowledge), Meta (learnings/SOPs/overrides)
4. Sub-phase anatomy is invariant: prime → execute → validate → checkpoint

design/architecture.md

## Tech Stack
Claude Code plugin platform with markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code.

1. NEVER add runtime dependencies — beastmode is markdown interpreted by Claude Code
2. ALWAYS use markdown + YAML frontmatter for skill definitions
3. Distribution via Claude Code marketplace

design/tech-stack.md
```

**Step 2: Rewrite PLAN.md to rule-list format**

Replace current content with:

```markdown
# Plan Context

Conventions and structure for implementation. Naming patterns, code style, project-specific conventions, and directory layout. Plans decompose designs into wave-ordered, file-isolated tasks with complete code.

## Conventions
Naming patterns (UPPERCASE.md for invariant, lowercase.md for variant), skill manifest pattern with YAML frontmatter, phase file rules (numbered steps, imperative voice), shared functionality rules, and anti-patterns to avoid.

1. ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files
2. ALWAYS number phase files 0-3 (0-prime, 1-execute, 2-validate, 3-checkpoint)
3. NEVER use @imports between hierarchy levels — convention-based paths described in BEASTMODE.md
4. ALWAYS use gate syntax: `## N. [GATE|namespace.gate-id]`

plan/conventions.md

## Structure
Directory layout with `.beastmode/` as central context hub, `skills/` for agent workflows, `agents/` for subagent documentation. Key file locations for entry points, configuration, core logic, and knowledge base.

1. ALWAYS colocate skill interface (SKILL.md) with implementation in `/skills/{verb}/`
2. NEVER store context outside `.beastmode/` — it's the single source of truth
3. Agent prompts live in `/agents/`, shared utilities in `skills/_shared/`

plan/structure.md
```

**Step 3: Rewrite IMPLEMENT.md to rule-list format**

Replace current content with:

```markdown
# Implement Context

Agent safety rules and testing strategy for implementation. Multi-agent collaboration requires explicit safety boundaries — never guess, always verify in code. File-isolated waves enable reliable parallel dispatch.

## Agents
Multi-agent safety rules: never stash, never switch branches, never modify worktrees unless explicitly requested. Git workflow for commits, pushes, and worktree context verification. Feature workflow with branch naming and release ownership.

1. NEVER stash, switch branches, or modify worktrees without explicit user request
2. ALWAYS verify worktree context before modifying files
3. NEVER guess file paths — verify they exist first
4. Commits happen naturally during implementation — release owns the squash merge

implement/agents.md

## Testing
Verification via brownfield discovery on real codebases. Success criteria: context L2 files populated with project-specific content, no placeholder patterns remaining. Critical paths: brownfield execution, parallel agents, content merge, atomic writes.

1. ALWAYS verify L2 files contain project-specific content, not placeholder patterns
2. NEVER skip brownfield verification after init
3. Critical paths: brownfield execution, parallel agent spawning, content merge, atomic file writes, gate structure, task-runner integration

implement/testing.md
```

**Step 4: Verify**

Read all three files. Confirm each follows: top summary → domain sections with dense summary → numbered rules → convention path reference. No @imports.

---

### Task 2: Rewrite L1 Context Files (Validate, Release)

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/VALIDATE.md`
- Modify: `.beastmode/context/RELEASE.md`

**Step 1: Rewrite VALIDATE.md to rule-list format**

Replace current content with:

```markdown
# Validate Context

Quality gates and verification strategy before release. The /validate skill runs project-specific checks (tests, lint, type checks) and requires user approval before proceeding to release.

## Quality Gates
Quality gate definitions — criteria, thresholds, and pass/fail rules for the validate phase. Gates emerge as formal definitions beyond manual verification.

1. ALWAYS run all project-specific checks (tests, lint, type checks) before release
2. NEVER proceed to release with failing quality gates

validate/quality-gates.md
```

**Step 2: Rewrite RELEASE.md to rule-list format**

Replace current content with:

```markdown
# Release Context

Release workflow and versioning conventions. Squash-per-release commits: `git merge --squash` collapses feature branches into one commit on main with GitHub release style messages (`Release vX.Y.Z — Title`). Feature branch tips preserved via archive tags. Handles version detection, commit categorization, changelog generation, marketplace updates, worktree merge/cleanup, and retro capture.

## Versioning
Versioning strategy, commit message format, and archive tagging conventions.

1. ALWAYS use squash merge for releases — one commit per version on main
2. ALWAYS archive feature branch tips as `archive/feature/<name>` before deletion
3. ALWAYS follow commit format: `Release vX.Y.Z — Title` with categorized sections
4. NEVER skip retro before the release commit

release/versioning.md
```

**Step 3: Verify**

Read both files. Confirm format matches spec. Remove `@` prefix from VALIDATE.md's reference if present (design says remove @imports).

---

### Task 3: Rewrite L2 Design Domain Files

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 1

**Files:**
- Modify: `.beastmode/context/design/product.md`
- Modify: `.beastmode/context/design/architecture.md`
- Modify: `.beastmode/context/design/tech-stack.md`

**Step 1: Rewrite product.md to rule-list format**

Transform the current prose format into the L2 spec: top-level summary → sections grouped by record topics → domain-adapted numbered rules. Remove the current "Purpose", "Vision", "Goals", "Capabilities", "How It Works", "Key Differentiators" structure. Regroup by decision/record topics.

```markdown
# Product

Beastmode turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. Five-phase workflow with context persistence, self-improving retro loop, and progressive knowledge hierarchy. Markdown-first, no runtime dependencies.

## Vision and Goals
Structured phases prevent wasted implementation. Context persists across sessions via `.beastmode/` artifact storage. Self-improvement through meta layer. Progressive knowledge hierarchy from L0 system manual through L3 records.

1. ALWAYS design before code — structured phases prevent wasted implementation
2. NEVER store context outside `.beastmode/` — it's the single source of truth across sessions
3. Self-improvement via retro captures learnings that inform future sessions

## Core Capabilities
Five-phase workflow with 4-step sub-phase anatomy. Collaborative design with HITL gates. Bite-sized planning with wave-ordered file-isolated tasks. Parallel wave execution. Git worktree isolation. Brownfield discovery. Fractal knowledge hierarchy. Self-improving retro. Squash-per-release commits. Deadpan persona.

1. ALWAYS follow five-phase order: design → plan → implement → validate → release
2. NEVER skip sub-phases — prime → execute → validate → checkpoint is invariant
3. Each capability is documented in its own phase's context domain

## Differentiators
Deterministic curated summaries (not probabilistic embedding retrieval). Design-before-code prevents wasted work. Context survives sessions via git — just markdown files in your repo.

1. Progressive hierarchy uses curated summaries — NEVER use embedding/vector retrieval
2. ALWAYS persist context as markdown in `.beastmode/` — human-readable and git-tracked
```

**Step 2: Rewrite architecture.md to rule-list format**

This is the largest L2 file. Transform current structure into record-topic sections with domain-adapted rules. Move "Key Decisions" entries to be extracted as L3 records in Task 5.

```markdown
# Architecture

System design for beastmode. L0/L1/L2/L3 progressive loading hierarchy with fractal patterns. Three data domains (State/Context/Meta). Worktree isolation for implementation. Squash-per-release commits. Two-tier HITL gate system. Retro-driven knowledge promotion. Artifact-based persistence.

## Knowledge Hierarchy
Four-level progressive enhancement: L0 (system manual, autoloaded), L1 (phase summaries, loaded at prime), L2 (full detail, on-demand), L3 (records, linked from L2). Each level follows the fractal pattern: summary + child summaries + convention paths.

1. ALWAYS follow progressive loading — L0 autoloads, L1 at prime, L2 on-demand, L3 linked from L2
2. NEVER use @imports between levels — convention-based paths only
3. L2 domains follow tiered taxonomy: Tier 1 (universal), Tier 2 (high-frequency), Tier 3 (specialized/retro-driven)
4. L1 files use UPPERCASE.md naming, L2 use lowercase.md

## Data Domains
Three domains with distinct purposes: State (feature workflow, `.beastmode/state/`), Context (published knowledge, `.beastmode/context/`), Meta (learnings/SOPs/overrides, `.beastmode/meta/`).

1. NEVER mix domain concerns — State tracks features, Context documents knowledge, Meta captures learnings
2. ALWAYS write phase artifacts to `state/` — retro promotes to `context/` and `meta/`
3. Write protection: phases write L3 (`state/`) only; retro gates L0/L1/L2 promotion

## Sub-Phase Anatomy
Every workflow phase follows: 0-prime (read-only context load), 1-execute (action phase), 2-validate (quality check), 3-checkpoint (persistence + retro).

1. ALWAYS enter worktree at step 1 of execute — never in prime
2. 0-prime is read-only — no side effects, no bash commands, no cd
3. 3-checkpoint triggers retro agents (context walker + meta walker in parallel)

## Component Architecture
Skills (workflow verbs) in `/skills/`, agents in `/agents/`, infrastructure in `.beastmode/`. Each skill has SKILL.md manifest, `phases/` directory (0-3), and optional `references/`.

1. ALWAYS colocate interface (SKILL.md) with implementation
2. NEVER put shared logic in individual skills — use `skills/_shared/`
3. Agent prompts are standalone documents — agents discover their own targets

## Worktree Isolation
Feature work in isolated git worktrees at `.beastmode/worktrees/`. Created at /design, inherited through plan/implement/validate, squash-merged by /release.

1. ALWAYS use `git merge --squash` for releases — one commit per version on main
2. ALWAYS archive branch tips before deletion: `archive/feature/<name>`
3. NEVER modify main branch during feature work — worktree provides isolation

## HITL Gate System
Two-tier: HARD-GATE (unconditional, always enforced) and configurable Gate steps (human/auto from config.yaml). Task runner handles detection and substep pruning.

1. NEVER skip HARD-GATEs — they prevent dangerous behavior
2. Configurable gates resolve from `.beastmode/config.yaml` at runtime
3. Gate syntax: `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections

## Retro Knowledge Promotion
Bottom-up compaction: retro agents review L1/L2 for accuracy, detect gaps, propose L2 file creation with confidence-scored promotion thresholds (HIGH/1st, MEDIUM/2nd, LOW/3rd).

1. ALWAYS run retro before release commit
2. Gap promotion thresholds: HIGH confidence = immediate, MEDIUM = 2nd occurrence, LOW = 3rd
3. L0 promotion happens only during release phase
```

**Step 3: Rewrite tech-stack.md to rule-list format**

```markdown
# Tech Stack

Claude Code plugin platform. Markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code. Distributed via Claude Code marketplace.

## Platform
Claude Code is the host environment. Skills execute as agentic workflows. Multi-step workflow with parallel agent spawning.

1. NEVER add runtime dependencies — beastmode is markdown interpreted by Claude Code
2. ALWAYS distribute via Claude Code marketplace
3. Claude Code CLI provides skill execution runtime and subagent spawning

## Dependencies
No traditional package dependencies. Core components: Claude Code CLI (runtime), Anthropic Claude API (LLM backend), Git (version control + worktrees), Markdown + YAML (documentation + metadata).

1. ALWAYS use Git for version control and worktree isolation
2. NEVER introduce package managers — there's nothing to package

## Development
No build step. Manual testing via skill invocation. No automated linting.

1. Testing is manual — invoke skills and verify behavior
2. Install via: `claude plugin marketplace update` then `claude plugin update beastmode@beastmode-marketplace --scope project`
```

**Step 4: Verify**

Read all three files. Confirm each follows L2 format: top summary → record-topic sections with detailed summary → domain-adapted numbered rules. No @imports. No "Purpose" or "Related Decisions" headers (those patterns are being replaced).

---

### Task 4: Rewrite L2 Plan and Implement Domain Files

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `.beastmode/context/plan/conventions.md`
- Modify: `.beastmode/context/plan/structure.md`
- Modify: `.beastmode/context/implement/agents.md`
- Modify: `.beastmode/context/implement/testing.md`

**Step 1: Read current content of all four files**

Read each file to understand existing content before rewriting.

**Step 2: Rewrite conventions.md**

Transform to L2 format. Group by record topics, not the current structure.

```markdown
# Conventions

Naming patterns, code style, and anti-patterns for beastmode development. UPPERCASE.md for invariant files, lowercase.md for variant. Phase files numbered 0-3. Skills use YAML frontmatter manifests. No @imports between hierarchy levels.

## File Naming
UPPERCASE.md for invariant meta files (always exist, same structure). lowercase.md for variant files (plans, research, date-prefixed). State files: YYYY-MM-DD-feature-name.md.

1. ALWAYS use UPPERCASE.md for invariant meta files, lowercase.md for variant files
2. ALWAYS prefix state files with date: YYYY-MM-DD-feature-name.md
3. NEVER mix naming conventions within a directory level

## Skill Definitions
Each skill has SKILL.md with YAML frontmatter defining name, description, trigger, phases, inputs, and outputs. Phase files follow 0-prime through 3-checkpoint numbering.

1. ALWAYS define skill interface in SKILL.md with YAML frontmatter
2. ALWAYS number phase files: 0-prime, 1-execute, 2-validate, 3-checkpoint
3. ALWAYS write phase instructions in imperative voice with numbered steps

## Gate Syntax
Two-tier gate system. HARD-GATE for unconditional constraints. Configurable gates use `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections.

1. ALWAYS use exact gate syntax: `## N. [GATE|namespace.gate-id]`
2. ALWAYS provide both `[GATE-OPTION|human]` and `[GATE-OPTION|auto]` subsections
3. NEVER use @imports between hierarchy levels — convention paths in BEASTMODE.md

## Anti-Patterns
Common mistakes to avoid in beastmode development.

1. NEVER put shared logic in individual skills — extract to `skills/_shared/`
2. NEVER create circular @imports between files
3. NEVER hardcode paths that should be convention-based
4. NEVER add "just in case" sections to context docs — document what exists
```

**Step 3: Rewrite structure.md**

```markdown
# Structure

Directory layout for beastmode. `.beastmode/` is the central context hub. `skills/` contains agent workflows. `agents/` houses subagent prompts. Knowledge hierarchy (context/, meta/, state/) lives under `.beastmode/`.

## Core Directories
`.beastmode/` stores L0-L3 knowledge hierarchy. `skills/` contains workflow verb implementations. `agents/` has standalone agent prompts. `skills/_shared/` has cross-skill utilities.

1. ALWAYS put phase-specific logic in `skills/{verb}/phases/`
2. ALWAYS put cross-skill utilities in `skills/_shared/`
3. ALWAYS put agent prompts in `agents/` as standalone documents
4. NEVER store knowledge outside `.beastmode/`

## Knowledge Directories
`context/` for published knowledge (L1 summaries + L2 details + L3 records). `meta/` for learnings (L1 summaries + L2 SOPs/overrides/learnings). `state/` for checkpoint artifacts.

1. ALWAYS organize context by phase: `context/{phase}/{domain}.md`
2. ALWAYS organize meta by phase: `meta/{phase}/{type}.md` (sops, overrides, learnings)
3. ALWAYS organize state by phase: `state/{phase}/YYYY-MM-DD-{feature}.md`
4. L3 records live at: `context/{phase}/{domain}/{record}.md`

## Entry Points
`CLAUDE.md` imports `@.beastmode/BEASTMODE.md` (sole autoload). Skills load L1 during prime. `/skills/{verb}/SKILL.md` defines each skill's interface.

1. ALWAYS wire CLAUDE.md → BEASTMODE.md as sole autoload
2. NEVER add additional @imports to CLAUDE.md
3. Skills discover their own L1/L2 context during prime sub-phase
```

**Step 4: Rewrite agents.md**

```markdown
# Agents

Multi-agent safety rules and workflows for implementation. Never guess, always verify. Explicit safety boundaries for git operations, worktree management, and file modifications. Feature workflow with branch naming and release ownership.

## Safety Rules
High-confidence actions only. Never guess file paths. Verify worktree context. No stash, no branch switches, no worktree modifications without explicit request.

1. NEVER stash, switch branches, or modify worktrees without explicit user request
2. NEVER guess file paths — verify they exist first
3. ALWAYS verify worktree context (pwd, git branch) before modifying files
4. NEVER run destructive git commands (reset --hard, push --force) without user confirmation

## Git Workflow
Natural commits during implementation. Release owns the squash merge. Feature branches named `feature/<feature>`.

1. ALWAYS commit naturally during implementation — don't batch
2. NEVER push to main directly — release handles the squash merge
3. ALWAYS use `feature/<feature>` branch naming
4. Worktree discovery: check `.beastmode/worktrees/` for active worktrees

## Parallel Dispatch
File-isolated waves enable parallel agent spawning. Same-wave tasks can run simultaneously if no shared files.

1. ALWAYS verify file isolation before parallel dispatch
2. NEVER let two agents modify the same file simultaneously
3. Report results per-agent after completion — never merge silently
```

**Step 5: Rewrite testing.md**

```markdown
# Testing

Verification strategy for beastmode. Brownfield discovery on real codebases validates context population. No automated test suite — verification is manual via skill invocation and content inspection.

## Brownfield Verification
Success criteria: all context L2 files populated with project-specific content after `init --brownfield`. No placeholder patterns remaining.

1. ALWAYS verify L2 files contain project-specific content, not placeholders
2. ALWAYS check: populated sections, actual file paths, real patterns from codebase
3. NEVER accept generic content — every L2 entry should reference actual project artifacts

## Critical Paths
Core scenarios that must work: brownfield execution, parallel agent spawning, content merge, atomic file writes, gate structure, task-runner integration.

1. ALWAYS test brownfield on a real codebase before release
2. ALWAYS verify parallel agents produce non-conflicting output
3. ALWAYS verify atomic writes — no partial file states
```

**Step 6: Verify**

Read all four files. Confirm L2 format: top summary → record-topic sections → domain-adapted rules. No @imports, no "Purpose" headers, no "Related Decisions" sections.

---

### Task 5: Rewrite L2 Validate and Release Domain Files

**Wave:** 2
**Depends on:** Task 2

**Files:**
- Modify: `.beastmode/context/validate/quality-gates.md`
- Modify: `.beastmode/context/release/versioning.md`

**Step 1: Read current content of both files**

Read each file to understand existing content.

**Step 2: Rewrite quality-gates.md**

```markdown
# Quality Gates

Quality gate definitions for the validate phase. Gates define criteria, thresholds, and pass/fail rules that must be satisfied before release. Currently emergent — formal gate definitions added as the project matures.

## Gate Criteria
Project-specific checks: tests, lint, type checks. Each gate has a pass/fail threshold. All gates must pass before proceeding to release.

1. ALWAYS run all configured quality checks before release
2. NEVER proceed to release with any failing gate
3. Gate definitions are project-specific — discovered during init or added manually

## Manual Verification
Current gates are manual — invoke skills and verify behavior. Automated gates will be added as patterns stabilize.

1. ALWAYS verify skill invocation produces expected artifacts
2. ALWAYS check context files for placeholder patterns
3. NEVER release without running validate phase
```

**Step 3: Rewrite versioning.md**

```markdown
# Versioning

Versioning strategy and release mechanics. Semantic versioning detected from plugin.json. Squash merge collapses feature branches into one commit on main. Archive tags preserve branch history. Commit messages follow GitHub release style.

## Version Detection
Version read from `.claude-plugin/plugin.json`. Semantic versioning: major.minor.patch. Changelog auto-generated from commit categorization.

1. ALWAYS read version from `.claude-plugin/plugin.json`
2. ALWAYS follow semantic versioning for bumps
3. Changelog generated from categorized commits (Features, Fixes, Artifacts)

## Commit Format
Release commits: `Release vX.Y.Z — Title` with categorized sections. One commit per version on main via squash merge.

1. ALWAYS use format: `Release vX.Y.Z — Title`
2. ALWAYS include categorized sections: Features, Fixes, Artifacts
3. NEVER create multiple commits per release on main

## Archive Strategy
Feature branch tips preserved as `archive/feature/<name>` tags before deletion. Full branch history accessible via archive tags.

1. ALWAYS tag feature branch tip before deletion: `archive/feature/<name>`
2. NEVER delete feature branches without archiving
3. `git log --oneline main` should read as a scannable release history
```

**Step 4: Verify**

Read both files. Confirm L2 format. No placeholders, no @imports.

---

### Task 6: Create L3 Record Directories and Extract Key Architecture Decisions

**Wave:** 3
**Parallel-safe:** true
**Depends on:** Task 3

**Files:**
- Create: `.beastmode/context/design/architecture/knowledge-hierarchy.md`
- Create: `.beastmode/context/design/architecture/data-domains.md`
- Create: `.beastmode/context/design/architecture/worktree-isolation.md`
- Create: `.beastmode/context/design/architecture/hitl-gate-system.md`
- Create: `.beastmode/context/design/architecture/squash-per-release.md`

**Step 1: Create directory**

```bash
mkdir -p .beastmode/context/design/architecture
```

**Step 2: Create knowledge-hierarchy.md**

```markdown
# Knowledge Hierarchy

## Context
Need to balance comprehensive context with token efficiency across multi-session workflows.

## Decision
Four-level progressive enhancement hierarchy: L0 (system manual, sole autoload), L1 (phase summaries, loaded at prime), L2 (full detail per topic, on-demand), L3 (records, linked from L2). Each level follows the fractal pattern: summary + child summaries + convention paths. No @imports between levels.

## Rationale
- L1 summaries provide enough context for most tasks without loading full detail
- On-demand L2 loading keeps token usage proportional to task complexity
- Fractal pattern makes every level self-similar and predictable

## Source
state/design/2026-03-04-progressive-l1-docs.md
```

**Step 3: Create data-domains.md**

```markdown
# Data Domains

## Context
Different types of information have different lifecycles and purposes. Feature state, build knowledge, and self-improvement data need distinct update patterns.

## Decision
Three domains: State (feature workflow at `.beastmode/state/`), Context (published knowledge at `.beastmode/context/`), Meta (learnings/SOPs/overrides at `.beastmode/meta/`). State tracks where features are. Context documents how to build. Meta captures how to improve.

## Rationale
- Clear separation enables focused updates without cross-contamination
- State as workflow tracker maps naturally to feature lifecycle
- Meta enables continuous improvement through retro-captured learnings

## Source
state/design/2026-03-01-bootstrap-discovery-v2.md
```

**Step 4: Create worktree-isolation.md**

```markdown
# Worktree Isolation

## Context
Implementation needs to execute complex plans without disrupting main branch or other agents.

## Decision
Isolated git worktrees in `.beastmode/worktrees/` for feature execution. Created at /design, inherited through plan/implement/validate, squash-merged by /release. Branch naming: `feature/<name>`.

## Rationale
- Git worktrees provide branch isolation without stashing or switching
- Enables concurrent work on different features
- Clean squash merge on success produces scannable release history

## Source
state/design/2026-03-04-git-branching-strategy.md
```

**Step 5: Create hitl-gate-system.md**

```markdown
# HITL Gate System

## Context
Workflow phases have decision points that need to be configurable for autonomous operation while preventing dangerous skip behavior.

## Decision
Two-tier system: HARD-GATE (unconditional, always enforced) and configurable Gate steps (human/auto resolved from `.beastmode/config.yaml`). Task runner handles gate detection and substep pruning. Config read at each gate — no pre-loading.

## Rationale
- HARD-GATEs prevent dangerous skip behavior unconditionally
- Configurable gates enable autonomous phase chaining when set to auto
- Runtime config resolution means gates are self-contained

## Source
state/design/2026-03-04-hitl-gate-config.md
```

**Step 6: Create squash-per-release.md**

```markdown
# Squash-Per-Release

## Context
Multiple phase-specific commits per feature cycle create noise on main. Branch history leaks via regular merge.

## Decision
Release uses `git merge --squash` to collapse entire feature branch into one commit on main. Commit message: `Release vX.Y.Z — Title` with categorized sections. Feature branch tips archived as `archive/feature/<name>` tags before deletion.

## Rationale
- One commit per version on main creates scannable release history
- Full branch history preserved via archive tags for forensics
- GitHub release style messages are familiar and information-dense

## Source
state/design/2026-03-05-squash-per-release.md
```

**Step 7: Verify**

Read each new file. Confirm L3 format: Context section, Decision section, Rationale (1-3 bullets), Source link to state artifact.

---

### Task 7: Add Format Enforcement to Retro Context Agent

**Wave:** 3
**Depends on:** Task 3

**Files:**
- Modify: `agents/retro-context.md`

**Step 1: Read current retro-context.md**

Read the file to find the right insertion point.

**Step 2: Add Format Enforcement section**

Add a new section after "## Hierarchy Awareness" and before "## Artifact Sources". This section tells the retro-context agent to check that files follow the standardized format:

```markdown
## Format Enforcement

When reviewing L1/L2/L3 files, verify they follow the standardized format. Flag deviations as findings.

### L1 Format (`context/{PHASE}.md`)

Expected structure:
- Top-level summary paragraph (information-heavy, distills full scope)
- Sections grouped by L2 domains, each with:
  - Dense summary (2-3 sentences)
  - Numbered rules (NEVER/ALWAYS directives)
  - Convention path reference (e.g., `design/product.md`)

### L2 Format (`context/{phase}/{domain}.md`)

Expected structure:
- Top-level summary paragraph (detailed domain overview)
- Sections grouped by L3 record topics, each with:
  - Detailed summary of the topic area
  - Numbered domain-adapted rules
- No "Purpose" header, no "Related Decisions" section

### L3 Format (`context/{phase}/{domain}/{record}.md`)

Expected structure:
- `# {Record Title}`
- `## Context` — problem or situation
- `## Decision` — what was decided
- `## Rationale` — 1-3 bullet points
- `## Source` — link to originating state artifact

### Rule-Writing Principles

When reviewing rules in L1/L2 files:
1. Rules should use absolute directives (NEVER/ALWAYS) for non-negotiable items
2. Rules should be concrete — actual commands/code, not vague guidance
3. Bullets over paragraphs, action before theory
4. No "Warning Signs" for obvious rules, no examples for trivial mistakes
5. No paragraphs when bullets suffice, max 3 "Why" bullets

### Format Violations

Flag as findings with type `format_violation`:
- L1 file missing numbered rules → finding
- L2 file with "Purpose" or "Related Decisions" header → finding (legacy format)
- L3 record missing any required section → finding
- Rules using vague language instead of absolute directives → finding
- @imports between hierarchy levels → finding
```

**Step 3: Verify**

Read `agents/retro-context.md` and confirm the new section is properly placed and complete.

---

### Task 8: Update Retro Context Agent Output Format

**Wave:** 4
**Depends on:** Task 7

**Files:**
- Modify: `agents/retro-context.md`

**Step 1: Update the Output Format section**

Add `format_violation` to the list of finding types in the output format template. In the existing `## Output Format` section, update the Type line:

Change:
```
- **Type**: accuracy | extension | gap | orphan | staleness | context_gap | context_gap_logged
```

To:
```
- **Type**: accuracy | extension | gap | orphan | staleness | format_violation | context_gap | context_gap_logged
```

**Step 2: Add format_violation to Review Rules**

In the `## Review Rules` section, add:
```
- **Enforce format spec** — check L1/L2/L3 files against the Format Enforcement section and emit `format_violation` findings for deviations
```

**Step 3: Verify**

Read `agents/retro-context.md` and confirm both changes are present.

---
