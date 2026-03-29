# Bootstrap Prefill Implementation Plan

**Goal:** Add two new skills (`/bootstrap-wizard` and `/bootstrap-discovery`) to prefill `.agents/prime/*.md` templates after `/bootstrap`.

**Architecture:** Two skills with shared output targets. Wizard uses conversational GSD-style flow with question bank references. Discovery spawns a subagent for autonomous codebase analysis, then presents findings for approval.

**Tech Stack:** Markdown skill files, Claude Agent SDK subagent pattern

**Design Doc:** [.agents/design/2026-03-01-bootstrap-prefill.md](.agents/design/2026-03-01-bootstrap-prefill.md)

---

### Task 0: Create agents/ directory and discovery.md subagent

**Files:**
- Create: `agents/discovery.md`

**Step 1: Create agents directory**

```bash
mkdir -p agents
```

**Step 2: Write discovery.md subagent prompt**

Create `agents/discovery.md`:

```markdown
# Discovery Subagent

You are a codebase analysis agent. Your job is to analyze an existing codebase and generate structured findings for `.agents/prime/*.md` documentation files.

## Analysis Targets

Analyze these sources in parallel where possible:

| Source | Look For | Informs |
|--------|----------|---------|
| Package manifests | `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml` | STACK.md |
| Config files | `.eslintrc`, `tsconfig.json`, `.prettierrc`, `ruff.toml`, `.editorconfig` | STACK.md, CONVENTIONS.md |
| Directory tree | Top-level structure, src/, lib/, tests/, docs/ | STRUCTURE.md |
| Code patterns | Import style, naming conventions, error handling | CONVENTIONS.md |
| README/docs | Project description, architecture notes | ARCHITECTURE.md |
| Test files | Test structure, frameworks, naming patterns | TESTING.md |

## Safety Rules

- NEVER read `.env`, `*.pem`, `credentials*`, `secrets*`, or similar sensitive files
- Include file path citations for every finding (e.g., `src/utils/auth.ts:42`)
- Mark low-confidence inferences with `[inferred]`

## Output Format

Return a JSON object with findings per target file:

```json
{
  "STACK": {
    "runtime": { "language": "...", "version": "...", "source": "package.json" },
    "framework": { "name": "...", "version": "...", "source": "package.json" },
    "dependencies": [{ "name": "...", "purpose": "...", "source": "..." }],
    "devTools": { "build": "...", "test": "...", "lint": "..." },
    "commands": { "install": "...", "dev": "...", "test": "...", "build": "..." }
  },
  "STRUCTURE": {
    "layout": [{ "path": "src/", "purpose": "..." }],
    "entryPoints": ["..."],
    "configLocations": ["..."]
  },
  "CONVENTIONS": {
    "naming": { "files": "...", "functions": "...", "types": "..." },
    "imports": "...",
    "errorHandling": "..."
  },
  "ARCHITECTURE": {
    "description": "...",
    "components": [{ "name": "...", "responsibility": "..." }],
    "dataFlow": "..."
  },
  "TESTING": {
    "framework": "...",
    "command": "...",
    "structure": "...",
    "naming": "..."
  }
}
```

## Execution

1. Glob for package manifests and config files
2. Read the most relevant files (prioritize root-level)
3. Analyze directory structure
4. Sample 2-3 source files for patterns
5. Check for existing README or docs/
6. Return structured findings
```

**Step 3: Verify file created**

```bash
cat agents/discovery.md
```

Expected: File contents displayed

**Step 4: Commit**

```bash
git add agents/discovery.md
git commit -m "feat: add discovery subagent for codebase analysis"
```

---

### Task 1: Create bootstrap-wizard skill structure

**Files:**
- Create: `skills/bootstrap-wizard/SKILL.md`
- Create: `skills/bootstrap-wizard/references/` (directory)

**Step 1: Create skill directory**

```bash
mkdir -p skills/bootstrap-wizard/references
```

**Step 2: Write SKILL.md**

Create `skills/bootstrap-wizard/SKILL.md`:

```markdown
---
name: bootstrap-wizard
description: Interactive conversational prefill of .agents/prime/*.md templates. Use after /bootstrap to configure project context through GSD-style dialogue. Covers stack, structure, conventions, architecture, testing.
---

# /bootstrap-wizard

Interactive conversational prefill of `.agents/prime/*.md` templates.

## Prerequisite Check

**FIRST:** Verify `.agents/prime/` exists.
- If missing: "Run `/bootstrap` first to create the .agents/ structure."
- If exists: Proceed with wizard

## Conversation Style

- **One question at a time** — don't overwhelm
- **Follow threads** — if answer reveals complexity, dig deeper before moving on
- **Prescriptive output** — "Use camelCase" not "Code uses camelCase"
- **Skip-friendly** — user can say "skip" or "later" for any section
- **Revisable** — user can say "go back" to revise previous section

## Flow

### 1. ORIENTATION

Start with:
> "Let's configure your project documentation. First, **what does this project do in one sentence?**"

Then:
> "Is this **greenfield** (starting fresh) or **brownfield** (existing code)?"

Follow threads based on answers before proceeding.

### 2. STACK → STACK.md

Discover via conversation:
- Language and runtime version
- Framework and why chosen
- Key dependencies and their purpose
- Build/test/lint tooling
- Common commands

**Present draft:**
> "Here's the proposed STACK.md based on our conversation:
> [show full content]
>
> Approve, edit, or regenerate?"

Write to `.agents/prime/STACK.md` on approval.

### 3. STRUCTURE → STRUCTURE.md

Discover via conversation:
- Where does source code live?
- Entry points
- Config file locations
- Where to add new features?

**Present draft** → Write on approval to `.agents/prime/STRUCTURE.md`

### 4. CONVENTIONS → CONVENTIONS.md

Discover via conversation:
- File naming (kebab-case, PascalCase?)
- Function/method naming (camelCase, snake_case?)
- Type/class naming
- Import organization
- Error handling patterns

**Present draft** → Write on approval to `.agents/prime/CONVENTIONS.md`

### 5. ARCHITECTURE → ARCHITECTURE.md

Discover via conversation:
- Major components/modules
- How they relate to each other
- Data flow
- Key architectural decisions and why

**Present draft** → Write on approval to `.agents/prime/ARCHITECTURE.md`

### 6. TESTING → TESTING.md

Discover via conversation:
- Test framework
- Test file location and naming
- How to run tests
- Coverage expectations

**Present draft** → Write on approval to `.agents/prime/TESTING.md`

### 7. WRAP-UP

After all sections:

1. Update `.agents/CLAUDE.md` Rules Summary section with one-liners for each completed file
2. Show summary of what was created
3. Offer to commit:
   > "Want me to commit these changes? (y/n)"

## Question Bank

For deeper discovery questions, see [references/question-bank.md](references/question-bank.md).

## Workflow

Part of: bootstrap → **bootstrap-wizard** OR bootstrap-discovery → prime → research → design → ...
```

**Step 3: Verify file created**

```bash
cat skills/bootstrap-wizard/SKILL.md
```

Expected: File contents displayed

**Step 4: Commit**

```bash
git add skills/bootstrap-wizard/SKILL.md
git commit -m "feat: add bootstrap-wizard skill orchestration"
```

---

### Task 2: Create bootstrap-wizard question-bank reference

**Files:**
- Create: `skills/bootstrap-wizard/references/question-bank.md`

**Step 1: Write question-bank.md**

Create `skills/bootstrap-wizard/references/question-bank.md`:

```markdown
# Question Bank

Deep-dive questions for each wizard section. Use when initial answers warrant exploration.

## Stack Questions

**Runtime:**
- What Node/Python/etc version are you targeting? Is it pinned?
- Any runtime-specific features you rely on? (e.g., Node 20's built-in test runner)

**Framework:**
- Why this framework over alternatives?
- Any framework-specific patterns to follow? (e.g., Next.js App Router vs Pages)
- Custom framework configuration?

**Dependencies:**
- Any vendored or forked dependencies?
- Dependencies to avoid or phase out?
- Required peer dependencies?

**Tooling:**
- Using a monorepo tool? (nx, turborepo, lerna)
- Custom build steps?
- Pre-commit hooks?

## Structure Questions

**Layout:**
- Monorepo or single package?
- Feature-based or layer-based organization?
- Where do shared utilities live?

**Entry Points:**
- Multiple entry points? (CLI, web, API)
- Dynamic imports or code splitting?

**Config:**
- Environment-specific configs?
- Secrets management approach?

## Conventions Questions

**Naming:**
- Barrel files (index.ts exports)?
- File suffixes (.util.ts, .types.ts)?
- Private/public distinction?

**Imports:**
- Absolute vs relative imports?
- Path aliases?
- Import order preferences?

**Errors:**
- Custom error classes?
- Error boundaries?
- Logging patterns?

## Architecture Questions

**Components:**
- Domain boundaries?
- Dependency injection?
- Plugin/extension system?

**Data Flow:**
- State management?
- Caching strategy?
- Event system?

**Decisions:**
- Key technical debt?
- Planned migrations?
- Intentional constraints?

## Testing Questions

**Frameworks:**
- Unit vs integration vs e2e split?
- Mocking strategy?
- Test data management?

**Coverage:**
- Coverage targets?
- Critical paths that must be tested?
- Areas intentionally not tested?

**Running:**
- Watch mode workflow?
- CI-specific test commands?
- Parallelization?
```

**Step 2: Verify file created**

```bash
cat skills/bootstrap-wizard/references/question-bank.md
```

Expected: File contents displayed

**Step 3: Commit**

```bash
git add skills/bootstrap-wizard/references/question-bank.md
git commit -m "feat: add question-bank reference for wizard deep-dives"
```

---

### Task 3: Create bootstrap-discovery skill

**Files:**
- Create: `skills/bootstrap-discovery/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/bootstrap-discovery
```

**Step 2: Write SKILL.md**

Create `skills/bootstrap-discovery/SKILL.md`:

```markdown
---
name: bootstrap-discovery
description: Autonomous codebase analysis to generate .agents/prime/*.md docs. Use after /bootstrap on existing projects. Analyzes package manifests, file tree, code patterns, and docs to prefill project context.
---

# /bootstrap-discovery

Autonomous codebase analysis to prefill `.agents/prime/*.md` templates.

## Prerequisite Check

**FIRST:** Verify `.agents/prime/` exists.
- If missing: "Run `/bootstrap` first to create the .agents/ structure."
- If exists: Proceed with discovery

## Overview

This skill spawns a discovery subagent to analyze the codebase, then presents findings for your approval before writing each file.

## Execution Flow

### Step 1: Announce

> "Starting codebase discovery. I'll analyze your project and propose content for each prime document."

### Step 2: Spawn Discovery Subagent

Use the Agent tool with subagent_type `Explore`:

```yaml
Agent:
  subagent_type: Explore
  prompt: |
    Analyze this codebase following the discovery.md prompt.
    Return structured JSON findings for STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, and TESTING.
  description: "Analyze codebase for prime docs"
```

The subagent will:
- Scan package manifests (package.json, pyproject.toml, etc.)
- Analyze directory structure
- Sample code for patterns
- Check existing documentation
- Return structured findings

### Step 3: Present Findings

For each file in order: STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING

1. Transform subagent findings into markdown format matching template structure
2. Present to user:

> "**STACK.md** — Based on analysis:
>
> [show proposed content]
>
> Choose: **approve** / **edit** / **regenerate** / **skip**"

3. On approve: Write to `.agents/prime/STACK.md`
4. On edit: Ask what to change, update, re-present
5. On regenerate: Re-run analysis for this section
6. On skip: Move to next file

### Step 4: Update CLAUDE.md

After all files processed:
1. Read `.agents/CLAUDE.md`
2. Update the Rules Summary section with one-liners for each written file
3. Show changes and confirm before writing

### Step 5: Wrap-Up

> "Discovery complete. Files created:
> - ✅ STACK.md
> - ✅ STRUCTURE.md
> - ⏭️ CONVENTIONS.md (skipped)
> - ✅ ARCHITECTURE.md
> - ✅ TESTING.md
>
> Want me to commit these changes? (y/n)"

## Analysis Sources

| Source | Files | Informs |
|--------|-------|---------|
| Package manifests | `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod` | STACK.md |
| Config files | `.eslintrc`, `tsconfig.json`, `.prettierrc`, `ruff.toml` | STACK.md, CONVENTIONS.md |
| Directory tree | Root structure analysis | STRUCTURE.md |
| Code samples | 2-3 representative source files | CONVENTIONS.md |
| Documentation | `README.md`, `docs/` | ARCHITECTURE.md |
| Test files | `tests/`, `__tests__/`, `*_test.*` | TESTING.md |

## Safety Rules

- **Never read:** `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- **Always cite:** Include file paths for findings
- **Mark uncertainty:** Use `[inferred]` for low-confidence findings
- **Ask when unclear:** If findings are ambiguous, ask user to clarify

## Workflow

Part of: bootstrap → bootstrap-wizard OR **bootstrap-discovery** → prime → research → design → ...
```

**Step 3: Verify file created**

```bash
cat skills/bootstrap-discovery/SKILL.md
```

Expected: File contents displayed

**Step 4: Commit**

```bash
git add skills/bootstrap-discovery/SKILL.md
git commit -m "feat: add bootstrap-discovery skill for autonomous analysis"
```

---

### Task 4: Update workflow documentation

**Files:**
- Modify: `skills/bootstrap/SKILL.md:56-58`
- Modify: `skills/prime/SKILL.md` (workflow line if exists)

**Step 1: Read prime skill to check workflow line**

```bash
head -30 skills/prime/SKILL.md
```

**Step 2: Update bootstrap skill workflow**

In `skills/bootstrap/SKILL.md`, update the workflow section to note the optional prefill step:

```markdown
## Workflow

Part of: **bootstrap** → (bootstrap-wizard OR bootstrap-discovery) → prime → research → design → plan → implement → status → verify → release → retro

**Next steps after bootstrap:**
- `/bootstrap-wizard` — Interactive prefill via conversation
- `/bootstrap-discovery` — Autonomous codebase analysis
- Or fill `.agents/prime/*.md` manually
```

**Step 3: Verify change**

```bash
tail -10 skills/bootstrap/SKILL.md
```

Expected: Updated workflow section visible

**Step 4: Commit**

```bash
git add skills/bootstrap/SKILL.md skills/prime/SKILL.md
git commit -m "docs: update workflow to include prefill options"
```

---

### Task 5: Bump version and test

**Files:**
- Modify: `.claude-plugin/plugin.json:4`
- Modify: `.claude-plugin/marketplace.json:11`

**Step 1: Bump version in plugin.json**

Change version from `0.1.3` to `0.1.4` in `.claude-plugin/plugin.json`

**Step 2: Bump version in marketplace.json**

Change version from `0.1.3` to `0.1.4` in `.claude-plugin/marketplace.json`

**Step 3: Verify version change**

```bash
grep version .claude-plugin/*.json
```

Expected: Both files show `0.1.4`

**Step 4: Test skills are recognized**

```bash
ls -la skills/bootstrap-wizard/
ls -la skills/bootstrap-discovery/
ls -la agents/
```

Expected: All directories exist with expected files

**Step 5: Commit version bump**

```bash
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump version to 0.1.4"
```

**Step 6: Final commit with all changes**

If not already committed individually:

```bash
git status
git add -A
git commit -m "feat: add bootstrap-wizard and bootstrap-discovery skills

- Add /bootstrap-wizard for interactive GSD-style prefill
- Add /bootstrap-discovery for autonomous codebase analysis
- Add discovery subagent in agents/discovery.md
- Update workflow documentation"
```

---

## Summary

| Task | Creates/Modifies | Purpose |
|------|------------------|---------|
| 0 | `agents/discovery.md` | Subagent prompt for codebase analysis |
| 1 | `skills/bootstrap-wizard/SKILL.md` | Wizard orchestration |
| 2 | `skills/bootstrap-wizard/references/question-bank.md` | Deep-dive questions |
| 3 | `skills/bootstrap-discovery/SKILL.md` | Discovery orchestration |
| 4 | `skills/bootstrap/SKILL.md`, `skills/prime/SKILL.md` | Workflow docs |
| 5 | `.claude-plugin/*.json` | Version bump |

## Dependencies

```
Task 0 (discovery subagent) ─┐
                             ├─→ Task 3 (bootstrap-discovery uses subagent)
Task 1 (wizard skill) ───────┤
Task 2 (question-bank) ──────┤
                             └─→ Task 4 (workflow docs)
                                 ↓
                             Task 5 (version bump - last)
```

Tasks 0, 1, 2 can be done in parallel. Task 3 requires Task 0. Task 4 requires Tasks 1-3. Task 5 is last.
