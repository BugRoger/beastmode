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
