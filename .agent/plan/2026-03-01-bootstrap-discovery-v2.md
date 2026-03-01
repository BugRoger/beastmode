# bootstrap-discovery v2 Implementation Plan

**Goal:** Simplify bootstrap-discovery to use plain markdown output with agent-driven merge instead of structured JSON.

**Architecture:** 5 parallel Explore agents analyze the codebase. Each agent reads current prime file content, preserves valid sections, fills placeholders, and returns complete updated markdown. Coordinator writes outputs directly to prime files.

**Tech Stack:** Claude Code skills, Agent tool with Explore subagent, Haiku model

**Design Doc:** [.agent/design/2026-03-01-bootstrap-discovery-v2.md](.agent/design/2026-03-01-bootstrap-discovery-v2.md)

---

## Task 0: Update common-instructions.md

**Files:**
- Modify: `skills/bootstrap-discovery/references/common-instructions.md`

**Step 1: Replace JSON output format with markdown instructions**

Replace entire file with:

```markdown
# Common Agent Instructions

Include this section at the end of every agent prompt.

## Output Format

Return the complete updated markdown file for the prime document.

Do NOT return JSON. Do NOT wrap in code blocks. Just return the markdown content directly.

## Merge Rules

- **Preserve** sections that have real content (not placeholders)
- **Fill** sections that have placeholder patterns: `[e.g., ...]`, `[command]`, `[what it's used for]`, `<!-- Fill in ... -->`
- **Update** sections with stale or incomplete information
- **Keep** the original document structure and headings

## Safety Rules

- NEVER read: `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- Include source file paths in your analysis comments if helpful
- If uncertain about a finding, note it with `[inferred]` or `[uncertain]`
```

**Step 2: Verify file is saved**

Run: `cat skills/bootstrap-discovery/references/common-instructions.md | head -20`

**Step 3: Commit**

```bash
git add skills/bootstrap-discovery/references/common-instructions.md
git commit -m "refactor(bootstrap-discovery): change output format from JSON to markdown"
```

---

## Task 1: Update stack-agent.md

**Files:**
- Modify: `skills/bootstrap-discovery/references/stack-agent.md`

**Step 1: Add merge instruction and fix placeholder**

Replace entire file with:

```markdown
# STACK Agent Prompt

## Role

Analyze the technology stack for this codebase and update the STACK.md prime document.

## Instructions

Read the current STACK.md content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- Package manifests: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`
- Config files: `tsconfig.json`, `vite.config.*`, `webpack.config.*`, `.babelrc`, `next.config.*`
- Lock files: `package-lock.json`, `bun.lockb`, `yarn.lock`, `poetry.lock`, `Cargo.lock`
- CI/CD: `.github/workflows/*.yml`, `Dockerfile`, `docker-compose.yml`
- Runtime indicators: `.node-version`, `.nvmrc`, `.python-version`, `.tool-versions`

## Sections to Populate

**Core Stack:**
- Runtime: language name + version, runtime name + version
- Framework: main framework if any
- Database: database technology if applicable

**Key Dependencies:**
- Table format: | Package | Purpose |
- Include 5-10 most important dependencies
- Focus on core functionality, not dev tools

**Development Tools:**
- Build: bundler/compiler
- Testing: test framework
- Linting: linter/formatter

**Commands:**
- Install dependencies
- Run development server
- Run tests
- Build for production
```

**Step 2: Commit**

```bash
git add skills/bootstrap-discovery/references/stack-agent.md
git commit -m "refactor(bootstrap-discovery): update STACK agent for markdown output"
```

---

## Task 2: Update structure-agent.md

**Files:**
- Modify: `skills/bootstrap-discovery/references/structure-agent.md`

**Step 1: Add merge instruction**

Replace entire file with:

```markdown
# STRUCTURE Agent Prompt

## Role

Analyze the directory structure and file organization for this codebase and update the STRUCTURE.md prime document.

## Instructions

Read the current STRUCTURE.md content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- Root directory tree (use depth 3-4)
- Entry points: `main.*`, `index.*`, `app.*`, `src/index.*`, `src/main.*`
- Import patterns in 2-3 core source files
- Build output directories: `dist/`, `build/`, `out/`
- Config file locations

## Sections to Populate

**Directory Layout:**
- ASCII tree diagram of root structure
- Show major directories with brief inline comments

**Key Directories:**
- Purpose of each major directory
- What types of files belong there

**Key File Locations:**
- Entry Points: main files that start the application
- Configuration: where config files live
- Core Logic: where business logic resides

**Naming Conventions:**
- File naming patterns (kebab-case, PascalCase, etc.)
- Directory naming patterns

**Where to Add New Code:**
- New features: which directory
- New components: which directory
- Tests: which directory
```

**Step 2: Commit**

```bash
git add skills/bootstrap-discovery/references/structure-agent.md
git commit -m "refactor(bootstrap-discovery): update STRUCTURE agent for markdown output"
```

---

## Task 3: Update conventions-agent.md

**Files:**
- Modify: `skills/bootstrap-discovery/references/conventions-agent.md`

**Step 1: Add merge instruction**

Replace entire file with:

```markdown
# CONVENTIONS Agent Prompt

## Role

Analyze coding conventions and style patterns for this codebase and update the CONVENTIONS.md prime document.

## Instructions

Read the current CONVENTIONS.md content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- Linter configs: `.eslintrc*`, `.prettierrc*`, `ruff.toml`, `.editorconfig`, `biome.json`
- TypeScript config: `tsconfig.json` (strict mode, paths, etc.)
- Sample 3-5 source files from different parts of the codebase
- Type definition files: `*.d.ts`, `types.ts`, `types/`

## Sections to Populate

**Naming:**
- Files: pattern + example
- Variables: pattern + example (camelCase, snake_case)
- Functions: pattern + example
- Types/Interfaces: pattern + example (PascalCase, I-prefix?)

**Code Style:**
- Import ordering conventions
- Export patterns (named vs default)
- Error handling patterns

**Patterns:**
- 2-3 common patterns used in the codebase
- Include short code examples
- Focus on patterns specific to this project

**Anti-Patterns:**
- Things explicitly forbidden by linter rules
- Patterns that contradict observed conventions
```

**Step 2: Commit**

```bash
git add skills/bootstrap-discovery/references/conventions-agent.md
git commit -m "refactor(bootstrap-discovery): update CONVENTIONS agent for markdown output"
```

---

## Task 4: Update architecture-agent.md

**Files:**
- Modify: `skills/bootstrap-discovery/references/architecture-agent.md`

**Step 1: Add merge instruction**

Replace entire file with:

```markdown
# ARCHITECTURE Agent Prompt

## Role

Analyze system architecture and component relationships for this codebase and update the ARCHITECTURE.md prime document.

## Instructions

Read the current ARCHITECTURE.md content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- `README.md` for project description
- `docs/` folder for architecture docs
- Entry points and their immediate dependencies
- Directory structure for layering hints (controllers/, services/, models/)
- Key imports between modules

## Sections to Populate

**Overview:**
- 2-3 sentences describing what this system does
- High-level structure (monolith, microservices, CLI, library, etc.)

**Components:**
- List major components/modules
- For each: name, purpose, location, dependencies

**Data Flow:**
- Simple diagram showing how data moves
- Format: `[input] → [component] → [component] → [output]`

**Key Decisions:**
- Architectural decisions if documented
- Why certain patterns were chosen (if evident)

**Boundaries:**
- External APIs consumed
- Internal module boundaries
- Public interfaces exposed
```

**Step 2: Commit**

```bash
git add skills/bootstrap-discovery/references/architecture-agent.md
git commit -m "refactor(bootstrap-discovery): update ARCHITECTURE agent for markdown output"
```

---

## Task 5: Update testing-agent.md

**Files:**
- Modify: `skills/bootstrap-discovery/references/testing-agent.md`

**Step 1: Add merge instruction**

Replace entire file with:

```markdown
# TESTING Agent Prompt

## Role

Analyze testing setup and conventions for this codebase and update the TESTING.md prime document.

## Instructions

Read the current TESTING.md content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- Test directories: `tests/`, `__tests__/`, `spec/`, `test/`
- Test file patterns: `*_test.*`, `*.spec.*`, `*.test.*`
- Test config: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `conftest.py`, `phpunit.xml`
- CI/CD for test commands: `.github/workflows/*.yml`
- Sample 2-3 test files for patterns

## Sections to Populate

**Test Commands:**
- Run all tests
- Run specific test file
- Run with coverage
- Run in watch mode

**Test Structure:**
- Unit tests: location + naming convention
- Integration tests: location + naming convention (if present)

**Conventions:**
- Test file naming pattern
- Test function/describe block naming pattern
- Fixtures/mocks location and usage

**Coverage:**
- Coverage target if configured
- Critical paths that must be tested
```

**Step 2: Commit**

```bash
git add skills/bootstrap-discovery/references/testing-agent.md
git commit -m "refactor(bootstrap-discovery): update TESTING agent for markdown output"
```

---

## Task 6: Rewrite SKILL.md

**Files:**
- Modify: `skills/bootstrap-discovery/SKILL.md`

**Step 1: Rewrite with explicit prompt assembly**

Replace entire file with:

```markdown
---
name: bootstrap-discovery
description: Autonomous parallel codebase analysis to generate .agent/prime/*.md docs. Spawns 5 Explore agents simultaneously for STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING. Merges findings with existing content. Use after /bootstrap on existing projects.
---

# /bootstrap-discovery

Autonomous codebase analysis with parallel agents. Analyzes project and populates `.agent/prime/*.md` files.

## Prerequisite

Verify `.agent/prime/` exists. If missing: "Run `/bootstrap` first to create the .agent/ structure."

## Execution Flow

1. **Check prerequisite** — verify `.agent/prime/` directory exists
2. **Read current state** — read all 5 prime files
3. **Assemble prompts** — for each prime, concatenate: agent prompt + common instructions + current content
4. **Spawn agents** — launch 5 Explore agents in parallel (haiku model)
5. **Collect outputs** — wait for all agents, collect markdown responses
6. **Write files** — write each output to corresponding prime file
7. **Update CLAUDE.md** — follow META.md conventions for Rules Summary
8. **Complete** — list updated files, offer to commit

## Prompt Assembly

For each prime file, assemble the prompt by reading and concatenating:

```
Read: references/{prime}-agent.md
Read: references/common-instructions.md
Append: "\n\n## Current Content\n\n"
Append: .agent/prime/{PRIME}.md content
```

## Agent Invocation

Spawn all 5 agents in a SINGLE message for parallel execution:

```yaml
Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STACK"
  prompt: |
    [assembled prompt for STACK]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STRUCTURE"
  prompt: |
    [assembled prompt for STRUCTURE]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze CONVENTIONS"
  prompt: |
    [assembled prompt for CONVENTIONS]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze ARCHITECTURE"
  prompt: |
    [assembled prompt for ARCHITECTURE]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze TESTING"
  prompt: |
    [assembled prompt for TESTING]
```

## Agent Output

Each agent returns a complete markdown file — the updated prime document. No JSON, no code blocks. The coordinator writes this output directly to the prime file.

## Error Handling

- Agent timeout → skip prime, preserve existing, log warning
- Empty response → preserve existing, log warning
- Agent error → preserve existing, log warning

## Safety Rules

- **Never read:** `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- **Always cite:** Include source files in analysis
- **Mark uncertainty:** Use `[inferred]` for low-confidence findings

## References

- [references/common-instructions.md](references/common-instructions.md) - Output format and merge rules
- [references/stack-agent.md](references/stack-agent.md) - STACK agent prompt
- [references/structure-agent.md](references/structure-agent.md) - STRUCTURE agent prompt
- [references/conventions-agent.md](references/conventions-agent.md) - CONVENTIONS agent prompt
- [references/architecture-agent.md](references/architecture-agent.md) - ARCHITECTURE agent prompt
- [references/testing-agent.md](references/testing-agent.md) - TESTING agent prompt

## Workflow

Part of: bootstrap → **bootstrap-discovery** → prime → research → design → plan → implement
```

**Step 2: Commit**

```bash
git add skills/bootstrap-discovery/SKILL.md
git commit -m "refactor(bootstrap-discovery): rewrite SKILL.md with explicit prompt assembly"
```

---

## Task 7: Test on beastmode project

**Files:**
- Test target: `.agent/prime/STACK.md`, `.agent/prime/STRUCTURE.md`, etc.

**Step 1: Run the skill**

Invoke `/bootstrap-discovery` on this project.

**Step 2: Verify outputs**

Check that each prime file has been updated with real content (not just placeholders).

**Step 3: Commit results if valid**

```bash
git add .agent/prime/
git commit -m "test(bootstrap-discovery): validate v2 on beastmode project"
```

---

## Task 8: Update design doc status

**Files:**
- Modify: `.agent/design/2026-03-01-bootstrap-discovery-v2.md`

**Step 1: Change status to Implemented**

Update line 4:
```markdown
**Status:** Implemented
```

**Step 2: Commit**

```bash
git add .agent/design/2026-03-01-bootstrap-discovery-v2.md
git commit -m "docs: mark bootstrap-discovery v2 design as implemented"
```
