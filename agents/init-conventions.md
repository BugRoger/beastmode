# CONVENTIONS Agent Prompt

## Role

Analyze coding conventions and style patterns for this codebase and update the conventions.md file.

## Instructions

Read `.beastmode/context/plan/conventions.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

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

@common-instructions.md
