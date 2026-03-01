# CONVENTIONS - Code Conventions

## Purpose

Documents naming patterns, code style, and project-specific conventions.

## Naming

**Files:**
- UPPERCASE.md: Invariant meta files with fixed structure (CLAUDE.md, STACK.md, CONVENTIONS.md)
- lowercase.md: Variant content files (dates, research, plans)
- Example: `CONVENTIONS.md` (template), `2026-03-01-bootstrap-discovery-v2.md` (variant), `SKILL.md` (skill definition)

**Directories:**
- Skill directories: lowercase-with-hyphens, colocated with SKILL.md manifest
- Example: `skills/bootstrap/`, `skills/bootstrap-discovery/`, `skills/implement/`

**Variables:**
- camelCase: For variables in documentation (e.g., subagentType, bootstrapPath)
- snake_case: In YAML/structured fields (e.g., sub_issue_id, start_date)

**Functions:**
- Skill names: lowercase-with-hyphens slash-prefixed (e.g., /bootstrap, /design, /plan)
- Agent names: Descriptive titles, TitleCase (e.g., "CONVENTIONS Agent", "STACK Agent")
- Internal functions in prompts: descriptive-with-hyphens (e.g., "Spawn agents", "Collect outputs")

**Types/Interfaces:**
- YAML frontmatter fields: TitleCase keys (name, description, version, author)
- Agent types: TitleCase (Explore)

## Code Style

**Imports:**
- Use @ symbol for internal imports (e.g., @.agent/prime/META.md, @phases/setup.md, @references/common-instructions.md)
- URL-style references with forward slashes for semantic clarity

**Exports:**
- Markdown files exported as reference material via @ imports
- Each SKILL.md declares metadata via YAML frontmatter block (name, description)
- Skills structured with clear hierarchical sections (##, ###, ####)

**Error Handling:**
- Explicit error handling sections in skill documentation (e.g., "CRITICAL CONSTRAINTS", "When to Stop and Ask for Help")
- Conditional logic marked with clear decision points (e.g., "If prerequisite exists... If missing...")
- Structured error handling with categorized conditions (timeout, empty response, agent error)

## Patterns

**Skill Manifest Pattern:**
Skills follow a standard YAML frontmatter + markdown structure:
```yaml
---
name: skill-name
description: Brief one-liner description
---

# /skill-name

[Content...]
```
Example: skills/bootstrap/SKILL.md, skills/design/SKILL.md

**Documentation Assembly Pattern:**
Prompts are assembled by concatenating multiple source files:
```
Read: references/{prime}-agent.md
Read: references/common-instructions.md
Append: "\n\n## Current Content\n\n"
Append: .agent/prime/{PRIME}.md content
```
Seen in: skills/bootstrap-discovery/SKILL.md

**Placeholder Pattern for Template Substitution:**
Placeholders use bracket notation with hints:
- `[pattern]: [example]` - For naming/file conventions
- `[e.g., ...]` - For list items
- `[command]` - For shell commands
- `<!-- Fill in ... -->` - For section comments

**Merge Rules Pattern:**
All prime document updates follow these rules:
- **Preserve** sections with real content
- **Fill** sections with placeholder patterns
- **Update** stale information
- **Keep** original structure

**Hierarchical Organization Pattern:**
Workflow phases organized with progressive detail:
```
High-level overview → Numbered phases → Phase details with entry/exit criteria → Quick reference
```
Example: /implement skill with Setup, Prepare, Execute, Complete phases

## Anti-Patterns

- NEVER use relative imports without @ prefix for clarity (use `@.agent/prime/FILE.md` not `../prime/FILE.md`)
- AVOID mixing placeholder formats in same section (use consistent brackets across related items)
- NEVER include code blocks in template placeholders (use `[command]` not `` `command` ``)
- AVOID single-file skill definitions (structure with SKILL.md in skill directory)
- NEVER create unnamed worktrees or isolated work without clear integration strategy
- AVOID paragraph prose where bullet lists suffice (prefer bullets for readability)
- NEVER call `EnterPlanMode`/`ExitPlanMode` in skill definitions outside /plan skill context
