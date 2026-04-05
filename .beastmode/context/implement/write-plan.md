# Write Plan

## Document Structure
- Artifact path: `.beastmode/artifacts/implement/YYYY-MM-DD-<epic>-<feature>.tasks.md`
- Header section: goal, architecture, tech stack — duplicated from feature plan for agent self-containment
- File Structure section: every file to create/modify with responsibility — decomposition decisions locked before task definitions
- Task definitions: bite-sized TDD steps following red-green-refactor with complete code and exact commands
- Checkbox tracking: `- [ ]`/`- [x]` per step — controller resumes from first unchecked step

## No-Placeholder Rule
- ALWAYS scan for TBD, TODO, "add appropriate", "similar to Task N", ellipsis in code blocks after writing — plan failures
- ALWAYS fix violations inline before dispatch — no approval gate, no deferred cleanup
- Complete code means complete: actual assertions, actual file paths, actual error messages

## Self-Review Pass
- Spec coverage check: every acceptance criterion from feature plan maps to at least one task
- Placeholder scan: grep-based detection of forbidden patterns
- Type/name consistency check: identifiers used across tasks are consistent (no typos, no renamed-but-not-updated references)

## Stop Hook Avoidance
- NEVER add YAML frontmatter to .tasks.md — the stop hook scans `artifacts/<phase>/` for `.md` files with frontmatter and generates `.output.json`
- The deviation log artifact (not .tasks.md) is the real completion signal

## Task Structure
- Each task: `### Task N: [Name]` with Wave, Depends-on, Files (Create/Modify/Test), and Steps 1-5
- Steps follow TDD: write failing test, verify failure, write implementation, verify pass, commit
- Commit step includes exact `git add` and `git commit` commands with specific files and messages

## Task 0: Integration Test from Gherkin
- If the feature plan has a `## Integration Test Scenarios` section with Gherkin blocks, generate Task 0 as the first task
- Task 0 creates a runnable integration test file from the Gherkin scenarios
- Task 0 is always Wave 0 with no dependencies — executes before all implementation tasks
- The test must be feature-scoped and runnable in isolation
- The test is expected to FAIL after Task 0 (RED state) — the feature isn't implemented yet
- If no Gherkin section exists in the feature plan, skip Task 0 — tasks start at Task 1
- All implementation tasks start at Wave 1 minimum — Wave 0 is reserved for Task 0

## Convention-Based Test Discovery
- Integration tests are identified by convention, not configuration
- File naming: `<feature-name>.integration.test.ts` or `<feature-name>.feature`
- Tags: `@<epic-name>` on Gherkin features
- Describe blocks: feature name in the describe/feature block
- The implement skill uses these conventions to locate and run the correct integration test after all tasks complete
- No separate configuration file for test-to-feature mapping
