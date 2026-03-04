# Deviation Rules

Deviations from the plan are normal. Classify and handle them systematically.

## Tier 1: Auto-Fix

**Trigger:** Bug, wrong type, missing import, broken test, security vulnerability, missing validation
**Action:** Fix it, track it, keep going
**Permission:** Automatic — no user approval needed

Examples:
- Import statement missing
- Type mismatch between function signature and usage
- Missing null check causing runtime error
- Test assertion using wrong matcher

Track as: `[Auto-fix] Task N: <description>`

## Tier 2: Blocking

**Trigger:** Missing dependency, environment issue, build broken, config missing, circular dependency
**Action:** Fix the blocker, track it, keep going
**Permission:** Automatic — no user approval needed

Examples:
- Package not in dependencies
- Environment variable not set
- Build tool config missing
- Circular import preventing compilation
- Parallel-safe flag incorrect — file overlap detected at dispatch time, falling back to sequential

Track as: `[Blocking] Task N: <description>`

## Tier 3: Architectural

**Trigger:** Schema change, new service, API change, library switch, scope expansion, breaking change
**Action:** STOP, present to user, wait for decision
**Permission:** Required — user must approve before proceeding

Present format:

    Architectural Decision Needed

    Task: [current task]
    Discovery: [what prompted this]
    Proposed change: [what needs to change]
    Impact: [what this affects]

    Options:
    1. Proceed with proposed change
    2. Different approach: [alternative]
    3. Defer and skip this task

Track as: `[Architectural] Task N: <description> — User chose: <decision>`

## Priority

Tier 3 (STOP) > Tier 1-2 (auto) > Unsure → Tier 3

## Heuristic

- Affects correctness/security/completion? → Tier 1 or 2
- Changes architecture or scope? → Tier 3
- Not sure? → Tier 3 (safer to ask)

## Deviation Log Format

Accumulated during execution, saved at checkpoint:

    ## Deviations

    - [Auto-fix] Task 3: Added missing `zod` import in validation.ts
    - [Blocking] Task 5: Installed `@types/node` — not in plan dependencies
    - [Blocking] Wave 2: Parallel-safe flag incorrect, fell back to sequential dispatch
    - [Architectural] Task 7: User approved adding Redis cache layer

    **Summary:** 2 auto-fixed, 1 blocking, 1 architectural (approved)

If no deviations: `## Deviations\n\nNone — plan executed exactly as written.`
