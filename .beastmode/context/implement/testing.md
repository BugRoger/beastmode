# TESTING - Test Strategy

## Purpose

Documents the testing approach, commands, and conventions.

## Test Commands

```bash
# Verify bootstrap-discovery on a project
/bootstrap-discovery

# Verify generated prime files have real content
grep -v "\[" .agents/prime/*.md | grep -v "^\[" | grep -v "^--" | wc -l

# Review generated documentation
cat .agents/prime/STACK.md .agents/prime/STRUCTURE.md .agents/prime/TESTING.md
```

## Test Structure

**Verification Tests:**
- Location: `.agents/prime/` (auto-generated after `/bootstrap-discovery`)
- Naming: UPPERCASE.md files contain generated content, not placeholder patterns

**Integration Tests:**
- Location: Project-level verification by running `/bootstrap-discovery` on actual codebases
- Naming: Manual inspection of generated files in `.agents/prime/`

## Conventions

**Verification Success Criteria:**
- All 5 prime files (STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING) updated
- No `[placeholder]` or `[command]` patterns remain in generated content
- Each section contains substantive project-specific information

**Content Validation:**
- STACK.md: Lists actual dependencies and tech stack from project manifests
- STRUCTURE.md: Shows real directory layout matching project structure
- CONVENTIONS.md: Reflects actual coding patterns from source files
- ARCHITECTURE.md: Describes actual system design, not generic templates
- TESTING.md: Documents real testing setup (or confirms no testing if applicable)

**Fixtures/Mocks:**
- Location: `skills/bootstrap-discovery/references/` contains agent prompts and instructions
- Usage: Each agent prompt (e.g., `testing-agent.md`) provides exploration hints and merge rules

## Coverage

**Target:** All 5 prime documents populated with project-specific content on first run

**Critical Paths:**
- `bootstrap-discovery` skill execution: Must complete without errors
- Parallel agent spawning: All 5 Explore agents must respond with markdown (not JSON)
- Content merge: Generated output must preserve existing content while filling placeholders
- File write operations: Prime files must be updated atomically without corruption
