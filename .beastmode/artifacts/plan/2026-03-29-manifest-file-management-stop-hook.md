# Stop Hook

**Design:** .beastmode/state/design/2026-03-29-manifest-file-management.md

## User Stories

6. As an operator, I want a Stop hook that reads artifact frontmatter and auto-generates output.json, so that the communication contract between skills and CLI is enforced by infrastructure, not skill instructions.
7. As an operator, I want output.json as the sole completion signal (replacing .dispatch-done.json), so that there's one marker file instead of two.

## What to Build

**Stop hook script** — A shell script configured in `.claude/settings.json` that fires when Claude finishes responding. The hook:
1. Scans `artifacts/<phase>/` for files matching the current slug convention
2. Reads YAML frontmatter from each artifact file
3. Builds the output.json contract (status, artifacts map, feature list for plan phase)
4. Writes `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json`

The frontmatter parsing can use simple regex or a lightweight approach — the schema is minimal and controlled. The hook must be idempotent (safe to run multiple times).

**Replace .dispatch-done.json** — output.json becomes the sole completion marker:
- Remove `.dispatch-done.json` generation from phase.ts
- Update cmux-session.ts to watch for `*.output.json` instead of `.dispatch-done.json`
- Update SDK strategy to read output.json after query iterator completes
- Update reconcile-startup.ts to check output.json instead of .dispatch-done.json
- Delete dispatch-done.test.ts or convert to output.json validation tests
- Delete DispatchDoneMarker type from cmux-types.ts and phase.ts

**Configure in settings.json** — Add the Stop hook entry pointing to the shell script. The hook is a Claude Code settings.json configuration with no runtime dependency.

## Acceptance Criteria

- [ ] Stop hook script exists and is configured in .claude/settings.json
- [ ] Hook correctly parses YAML frontmatter from artifact files
- [ ] Hook generates valid output.json matching the PhaseOutput schema
- [ ] Hook is idempotent (multiple runs produce same result)
- [ ] .dispatch-done.json is not generated anywhere in the codebase
- [ ] cmux-session.ts watches for output.json, not .dispatch-done.json
- [ ] SDK strategy reads output.json for completion
- [ ] DispatchDoneMarker type is deleted
- [ ] dispatch-done.test.ts is deleted or converted
- [ ] All dispatch strategies use output.json as the sole completion signal
