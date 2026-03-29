# Init Redesign Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Replace the narrow, hardcoded init agents with a 3-phase discovery system (Inventory → Populate → Synthesize) that reads all project knowledge and populates the full `.beastmode/` context hierarchy with real, project-specific content.

**Architecture:** Single orchestrator agent (Phase 1) reads all project sources and produces a structured knowledge map. Parallel writer agents (Phase 2) receive topic slices and write L2 summaries + L3 records. Single synthesis agent (Phase 3) generates L1 summaries and rewrites CLAUDE.md.

**Tech Stack:** Claude Code plugin system (markdown skills + agent prompts), git worktrees, bash

**Design Doc:** `.beastmode/state/design/2026-03-08-init-redesign.md`

---

### Task 0: Remove Old Init Agents

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `agents/init-stack.md`
- Delete: `agents/init-structure.md`
- Delete: `agents/init-conventions.md`
- Delete: `agents/init-architecture.md`
- Delete: `agents/init-testing.md`
- Delete: `skills/beastmode/references/wizard/question-bank.md`

**Step 1: Delete old agent files**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.beastmode/worktrees/init-redesign
rm agents/init-stack.md
rm agents/init-structure.md
rm agents/init-conventions.md
rm agents/init-architecture.md
rm agents/init-testing.md
```

**Step 2: Delete wizard question bank**

```bash
rm skills/beastmode/references/wizard/question-bank.md
rmdir skills/beastmode/references/wizard
```

**Step 3: Verify deletions**

```bash
ls agents/init-*.md 2>/dev/null && echo "FAIL: old agents still exist" || echo "PASS: old agents removed"
ls skills/beastmode/references/wizard/ 2>/dev/null && echo "FAIL: wizard dir still exists" || echo "PASS: wizard dir removed"
```
Expected: Both PASS

---

### Task 1: Create Inventory Agent (Phase 1 Orchestrator)

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `agents/init-inventory.md`

**Step 1: Write the inventory agent prompt**

```markdown
# Inventory Agent

You are the discovery orchestrator for beastmode init. Your job is to read all available project knowledge and produce a structured knowledge map organized by L2 topic.

## Input Sources (Read In Order)

Read each source that exists. Skip missing sources silently.

### 1. CLAUDE.md
The richest structured knowledge source in brownfield projects. Extract:
- Rules and conventions (numbered lists, ALWAYS/NEVER patterns)
- Architecture descriptions
- Technology references
- Workflow instructions
- Testing guidance

### 2. README.md
Project overview and purpose. Extract:
- What the project does (product description)
- Setup/install instructions (tech stack, commands)
- Architecture overview if present
- Contributing guidelines (conventions)

### 3. Documentation Directory
Scan for `docs/`, `doc/`, `documentation/`, `wiki/`. Read key files. Extract:
- Detailed specifications
- API documentation
- Architecture decisions (ADRs)
- Setup guides

### 4. Existing Plans
Scan for `.plans/`, `.beastmode/state/`, `design/`, `decisions/`. Extract:
- Past design decisions with rationale
- Implementation plans
- Architecture Decision Records

### 5. Source Code Structure
```bash
# Get directory layout (depth 3)
find . -maxdepth 3 -type d -not -path '*/\.*' -not -path '*/node_modules/*' -not -path '*/vendor/*' -not -path '*/__pycache__/*' | head -100
```
Extract:
- Directory organization pattern (feature vs layer)
- Entry points
- Key module boundaries

### 6. Git Log (Recent History)
```bash
git log --oneline -50
```
Extract:
- Naming conventions from commit messages
- Recent architectural changes
- Active development areas

### 7. Package/Config Files
Read the first matching file from each group:
- **Package manifest**: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, `build.gradle`
- **Language config**: `tsconfig.json`, `.python-version`, `rust-toolchain.toml`
- **Lint config**: `.eslintrc*`, `biome.json`, `ruff.toml`, `.prettierrc*`
- **Build config**: `vite.config.*`, `webpack.config.*`, `next.config.*`, `Makefile`
- **Test config**: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `conftest.py`
- **CI/CD**: `.github/workflows/*.yml`, `Dockerfile`, `docker-compose.yml`

Extract:
- Runtime and language versions
- Framework and key dependencies
- Build, test, lint commands
- CI/CD pipeline details

## L2 Topic Assignment

Assign each extracted item to one of these topics:

### Fixed Base Topics (Always Created)
| Topic | L2 Path | Content Focus |
|-------|---------|---------------|
| product | `context/design/product.md` | What the project is, its purpose, capabilities |
| architecture | `context/design/architecture.md` | System design, components, data flow |
| tech-stack | `context/design/tech-stack.md` | Languages, frameworks, dependencies, commands |
| conventions | `context/plan/conventions.md` | Coding patterns, naming, style rules |
| structure | `context/plan/structure.md` | Directory layout, file organization |
| testing | `context/implement/testing.md` | Test setup, frameworks, coverage, commands |

### Dynamic Topics (Created When Content Warrants)
If 3+ items cluster around a topic not covered by the base set, propose a new L2 file.
Examples: `api.md`, `deployment.md`, `integrations.md`, `versioning.md`

## Output Format

Return a JSON knowledge map (this is the ONE exception to the no-JSON rule — internal data transfer between init phases):

```json
{
  "topics": {
    "<topic-name>": {
      "l2Path": "<context path>",
      "phase": "design|plan|implement",
      "items": [
        {
          "content": "<fact, decision, convention, or rule>",
          "source": "<file path or 'git log' or 'directory scan'>",
          "type": "fact|decision|convention|rule",
          "date": "<YYYY-MM-DD if known from git, otherwise null>"
        }
      ]
    }
  },
  "claudeMdResidual": [
    "<lines from CLAUDE.md that don't fit any L2 topic>"
  ],
  "summary": "<2-3 sentence overview of what was discovered>"
}
```

## Safety Rules

- NEVER read: `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- NEVER include secrets, tokens, or passwords in output
- If uncertain about a finding, note it with `"type": "fact"` and include `[inferred]` in content
```

**Step 2: Verify file was created**

```bash
test -f agents/init-inventory.md && echo "PASS" || echo "FAIL"
```
Expected: PASS

---

### Task 2: Create Writer Agent (Phase 2 Parallel Workers)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `agents/init-writer.md`

**Step 1: Write the generic writer agent prompt**

```markdown
# Writer Agent

You are a context writer for beastmode init. You receive a knowledge map slice for a single L2 topic and produce:
1. An L2 summary file following the fractal pattern
2. L3 record files for individual decisions/rules/plans

## Input

You will receive:
- **Topic name** and **L2 path** (e.g., `conventions` → `context/plan/conventions.md`)
- **Phase** (design, plan, or implement)
- **Knowledge items** — list of facts, decisions, conventions, and rules with source attribution

## L2 File Format

Write the L2 summary following this structure:

```markdown
# [Topic Title]

[Summary paragraph: 2-3 sentences describing this topic area for the project]

## [Section Name]

[Section summary: 1-2 sentences]

1. [Specific rule or convention]
2. [Specific rule or convention]

[Repeat sections as needed based on content]

## Related Decisions

[Links to L3 record files in this topic's directory]
- [YYYY-MM-DD-slug.md](topic-dir/YYYY-MM-DD-slug.md) — one-sentence summary
```

### Section Organization

Group items into logical sections. Use the existing skeleton headings when they match:

| Topic | Expected Sections |
|-------|-------------------|
| product | Vision, Goals, Capabilities |
| architecture | Overview, Components, Data Flow, Key Decisions, Boundaries |
| tech-stack | Core Stack, Key Dependencies, Development Tools, Commands |
| conventions | Naming, Code Style, Patterns, Anti-Patterns |
| structure | Directory Layout, Key Directories, Key File Locations, Where to Add New Code |
| testing | Test Commands, Test Structure, Conventions, Coverage |

For dynamic topics, derive sections from the content.

## L3 Record Format

For each decision, significant rule, or plan item, create an L3 record:

```markdown
# [Short Title]

**Date:** YYYY-MM-DD
**Source:** [Extracted from CLAUDE.md | Translated from .plans/foo.md | Discovered in git log | Inferred from codebase]
**Confidence:** HIGH | MEDIUM | LOW

## Context

[Why this decision/rule exists — 1-2 sentences]

## Decision

[The actual decision, rule, or convention — be specific]

## Rationale

[Why this choice was made, if known. "Not documented" if unknown.]
```

### L3 File Naming

- Path: `.beastmode/context/<phase>/<topic>/<YYYY-MM-DD>-<slug>.md`
- Date: from git history if available, otherwise today's date
- Slug: kebab-case, max 4 words, descriptive

### L3 Granularity

- One record per significant decision or rule
- Group related minor conventions into a single record (e.g., "naming-conventions" not one per naming rule)
- Aim for 3-10 records per topic (fewer for sparse topics)

## L2 → L3 Linkage

The L2 file's "Related Decisions" section MUST reference every L3 record in its directory.

## Output

Write all files directly using the Write tool:
1. The L2 summary file at the specified path
2. All L3 record files in the topic's L3 directory

Create the L3 directory if it doesn't exist:
```bash
mkdir -p .beastmode/context/<phase>/<topic>/
```

Report: list of files written with one-sentence summaries.

## Safety Rules

- NEVER read: `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- NEVER include secrets, tokens, or passwords in output
- If uncertain about content, mark with `[inferred]` in the L2 text and `Confidence: LOW` in L3 records
```

**Step 2: Verify file was created**

```bash
test -f agents/init-writer.md && echo "PASS" || echo "FAIL"
```
Expected: PASS

---

### Task 3: Create Synthesize Agent (Phase 3)

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `agents/init-synthesize.md`

**Step 1: Write the synthesis agent prompt**

```markdown
# Synthesize Agent

You are the synthesis agent for beastmode init. After the writer agents have populated L2 and L3 files, you:
1. Generate real L1 summary files from L2 content
2. Rewrite CLAUDE.md with @imports + residual

## Phase 1: Generate L1 Summaries

Read all L2 files that were just written. For each L1 file, produce a real summary.

### L1 File Format

```markdown
# [Phase] Context

[Summary paragraph: 2-3 sentences synthesizing all L2 topics in this phase. This should give a phase skill enough context to decide whether to read the L2 files.]

## [L2 Topic Name]

[Summary: 1-2 sentences capturing the essence of the L2 file]

[Numbered rules: the most important rules from the L2 file, max 5]

context/<phase>/<topic>.md
```

### L1 Files to Generate

| L1 File | L2 Sources |
|---------|------------|
| `context/DESIGN.md` | `design/product.md`, `design/architecture.md`, `design/tech-stack.md`, + any dynamic design topics |
| `context/PLAN.md` | `plan/conventions.md`, `plan/structure.md`, + any dynamic plan topics |
| `context/IMPLEMENT.md` | `implement/testing.md`, + any dynamic implement topics |
| `context/VALIDATE.md` | Sparse — only if content exists |
| `context/RELEASE.md` | Sparse — only if content exists |

For each L1 file:
1. Read all L2 files in that phase directory
2. Write a summary paragraph that captures the overall picture
3. For each L2 file, write a section with summary + top rules + plain text path reference
4. Include any dynamic L2 topics discovered during init

### Rules for L1 Content

- Summary paragraphs must be REAL content, not placeholders
- If an L2 file is empty or has only placeholders, note "[Not yet populated]" for that section
- Numbered rules should be the most impactful — ALWAYS/NEVER patterns preferred
- L2 file paths as plain text (last line of each section), not markdown links

## Phase 2: Rewrite CLAUDE.md

### Read Current CLAUDE.md

If CLAUDE.md exists, read its current content. Identify:
- Lines that are beastmode @imports (keep as-is or update)
- Lines that match content now in L2 files (remove — redistributed)
- Lines that don't fit any L2 topic (residual — preserve)

### Write New CLAUDE.md

```markdown
@.beastmode/BEASTMODE.md

[Residual content that doesn't fit any L2 topic]
[Non-beastmode concerns: editor config, CI notes, etc.]
```

If no CLAUDE.md exists, create with just the @import:

```markdown
@.beastmode/BEASTMODE.md
```

### Residual Rules

- Preserve anything that doesn't fit a context L2 topic
- Preserve non-beastmode concerns (editor settings, CI notes, personal preferences)
- Remove rules that were redistributed into L2 files
- Keep the file minimal — the L2 files are now the source of truth

## Phase 3: Report

Print a summary of all files created/modified:

```
Init synthesis complete.

L1 summaries generated:
- .beastmode/context/DESIGN.md (N sections)
- .beastmode/context/PLAN.md (N sections)
- .beastmode/context/IMPLEMENT.md (N sections)
[etc.]

CLAUDE.md:
- [Created | Rewritten] with @imports + N residual lines

Total: N L1 files, M L2 files referenced, K L3 records discovered
```

## Safety Rules

- NEVER read: `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- Preserve all non-beastmode content in CLAUDE.md
- If uncertain about whether to remove a CLAUDE.md line, keep it as residual
```

**Step 2: Verify file was created**

```bash
test -f agents/init-synthesize.md && echo "PASS" || echo "FAIL"
```
Expected: PASS

---

### Task 4: Rewrite Init Subcommand Skill

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2, Task 3

**Files:**
- Modify: `skills/beastmode/subcommands/init.md`

**Step 1: Write the new init.md with 3-phase architecture**

Replace the entire content of `skills/beastmode/subcommands/init.md` with:

```markdown
# init

Populate `.beastmode/` context hierarchy by discovering and organizing all existing project knowledge.

## Preconditions

If `.beastmode/` directory doesn't exist, run the install step automatically:
1. Find the plugin directory (this skill's parent path)
2. Copy `assets/.beastmode` skeleton to project root
3. Report: ".beastmode/ skeleton installed."
4. Continue to discovery

## Mode Detection

Examine the project:
- If the project has existing source files (beyond `.beastmode/`) → run full 3-phase discovery
- If the project is empty or only has `.beastmode/` → report "Empty project — skeleton installed. Start with /design." and STOP

No `--greenfield` or `--brownfield` flags. Empty projects evolve through /design sessions.

## Phase 1: Inventory (Single Orchestrator)

### 1. Announce

"Scanning project for existing knowledge."

### 2. Spawn inventory agent

```yaml
Agent:
  subagent_type: "beastmode:init-inventory"
  description: "Inventory project knowledge"
  prompt: |
    Analyze this project and produce a structured knowledge map.
    Working directory: {project root}
    Today's date: {YYYY-MM-DD}
```

### 3. Receive knowledge map

Parse the JSON knowledge map returned by the inventory agent. If the agent fails or returns invalid JSON, report the error and STOP.

### 4. Report inventory summary

Print the agent's summary field and the number of items per topic:

```
Discovery complete: {summary}

Topics found:
- product: {N} items
- architecture: {N} items
- tech-stack: {N} items
- conventions: {N} items
- structure: {N} items
- testing: {N} items
[- dynamic-topic: {N} items]
```

## Phase 2: Populate (Parallel Writers)

### 1. Announce

"Writing context files."

### 2. Ensure L3 directories exist

For each topic in the knowledge map:

```bash
mkdir -p .beastmode/context/<phase>/<topic>/
```

### 3. Spawn writer agents in parallel

Launch ALL writer agents in a SINGLE message. One agent per topic:

```yaml
# For each topic in knowledge_map.topics:
Agent:
  subagent_type: "beastmode:init-writer"
  description: "Write {topic} context"
  prompt: |
    Write L2 and L3 files for topic: {topic}
    L2 path: .beastmode/{l2Path}
    Phase: {phase}
    Today's date: {YYYY-MM-DD}

    Knowledge items:
    {JSON array of items for this topic}
```

### 4. Verify writer outputs

For each topic, confirm the L2 file exists and has content:

```bash
test -s .beastmode/context/<phase>/<topic>.md && echo "OK: <topic>" || echo "WARN: <topic> empty"
```

### 5. Handle errors

If any writer agent fails:
- Log warning: "Writer for {topic} failed — preserving existing content"
- Continue with remaining topics
- Do not abort the entire init

## Phase 3: Synthesize (Single Agent)

### 1. Announce

"Generating summaries and updating CLAUDE.md."

### 2. Spawn synthesize agent

```yaml
Agent:
  subagent_type: "beastmode:init-synthesize"
  description: "Synthesize L1 summaries"
  prompt: |
    Generate L1 summaries from L2 files and rewrite CLAUDE.md.
    Working directory: {project root}
    Today's date: {YYYY-MM-DD}

    Topics written: {list of topic names that succeeded in Phase 2}
    CLAUDE.md residual items: {claudeMdResidual from knowledge map}
```

### 3. Verify outputs

Confirm L1 files were generated:

```bash
for f in DESIGN PLAN IMPLEMENT; do
  test -s .beastmode/context/$f.md && echo "OK: $f.md" || echo "WARN: $f.md empty"
done
```

## Report

Print final summary:

```
Init complete.

Files created/updated:
- .beastmode/context/DESIGN.md
- .beastmode/context/PLAN.md
- .beastmode/context/IMPLEMENT.md
- .beastmode/context/design/product.md ({N} L3 records)
- .beastmode/context/design/architecture.md ({N} L3 records)
- .beastmode/context/design/tech-stack.md ({N} L3 records)
- .beastmode/context/plan/conventions.md ({N} L3 records)
- .beastmode/context/plan/structure.md ({N} L3 records)
- .beastmode/context/implement/testing.md ({N} L3 records)
[- .beastmode/context/<phase>/<dynamic-topic>.md ({N} L3 records)]
- CLAUDE.md (rewritten)

Total: {N} L2 files, {M} L3 records

Review the generated context, then /design your first feature.
```
```

**Step 2: Verify the file was written**

```bash
wc -l skills/beastmode/subcommands/init.md
```
Expected: ~150 lines (significantly different from the old ~179 lines)

---

### Task 5: Update Beastmode Skill Manifest

**Wave:** 3
**Depends on:** Task 4

**Files:**
- Modify: `skills/beastmode/SKILL.md`

**Step 1: Read current SKILL.md**

Read the file to understand the current routing structure.

**Step 2: Update init subcommand description**

Change the init description from "Populate context files, interactive or autonomous" to reflect the new architecture. The routing itself stays the same (init → `@subcommands/init.md`), but the description should say something like:

"Discover project knowledge and populate context hierarchy (3-phase: inventory → populate → synthesize)"

**Step 3: Verify**

Read the file and confirm the init description was updated and routing is preserved.

---

### Task 6: Verify End-to-End Structure

**Wave:** 4
**Depends on:** Task 4, Task 5

**Files:**
- Verify: `agents/init-inventory.md`
- Verify: `agents/init-writer.md`
- Verify: `agents/init-synthesize.md`
- Verify: `skills/beastmode/subcommands/init.md`
- Verify: `skills/beastmode/SKILL.md`

**Step 1: Verify all new agents exist**

```bash
for f in init-inventory init-writer init-synthesize; do
  test -f agents/$f.md && echo "OK: $f.md" || echo "MISSING: $f.md"
done
```
Expected: All OK

**Step 2: Verify old agents are gone**

```bash
for f in init-stack init-structure init-conventions init-architecture init-testing; do
  test -f agents/$f.md && echo "STALE: $f.md" || echo "OK: $f.md removed"
done
```
Expected: All OK (removed)

**Step 3: Verify no dangling references**

```bash
grep -r "init-stack\|init-structure\|init-conventions\|init-architecture\|init-testing\|greenfield\|brownfield\|question-bank\|wizard" skills/beastmode/ agents/ --include="*.md" || echo "PASS: no dangling references"
```
Expected: PASS

**Step 4: Verify init.md references correct agent names**

```bash
grep -c "init-inventory\|init-writer\|init-synthesize" skills/beastmode/subcommands/init.md
```
Expected: 3 (one reference per agent)

No commit needed — unified commit at /release.
