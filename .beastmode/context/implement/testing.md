# TESTING - Test Strategy

## Purpose

Documents the testing approach, commands, and conventions.

## Test Commands

```bash
# Verify brownfield discovery on a project
/beastmode init --brownfield

# Verify generated context files have real content
grep -v "\[" .beastmode/context/**/*.md | grep -v "^\[" | grep -v "^--" | wc -l

# Review generated documentation
cat .beastmode/context/design/tech-stack.md .beastmode/context/plan/structure.md .beastmode/context/implement/testing.md
```

## Test Structure

**Verification Tests:**
- Location: `.beastmode/context/` (auto-generated after `/beastmode init --brownfield`)
- Naming: L2 lowercase.md files contain generated content, not placeholder patterns

**Integration Tests:**
- Location: Project-level verification by running `/beastmode init --brownfield` on actual codebases
- Naming: Manual inspection of generated files in `.beastmode/context/`

## Conventions

**Verification Success Criteria:**
- Context L2 files populated with project-specific content
- No `[placeholder]` or `[command]` patterns remain in generated content
- Each section contains substantive project-specific information

**Content Validation:**
- tech-stack.md: Lists actual dependencies and tech stack from project manifests
- structure.md: Shows real directory layout matching project structure
- conventions.md: Reflects actual coding patterns from source files
- architecture.md: Describes actual system design, not generic templates
- testing.md: Documents real testing setup (or confirms no testing if applicable)

**Fixtures/Mocks:**
- Location: `skills/beastmode/references/` contains agent prompts and instructions
- Usage: Each agent prompt provides exploration hints and merge rules

## Coverage

**Target:** All context L2 documents populated with project-specific content on first run

**Critical Paths:**
- `beastmode init --brownfield` execution: Must complete without errors
- Parallel agent spawning: Explore agents must respond with markdown (not JSON)
- Content merge: Generated output must preserve existing content while filling placeholders
- File write operations: Context files must be updated atomically without corruption

## Related Decisions
- Bootstrap discovery v2 defined testing approach. See [bootstrap-discovery-v2](../../state/design/2026-03-01-bootstrap-discovery-v2.md)
