# 2. Validate

## 1. Design Coverage Check

Extract all components from the design doc's `## Components` or `## Key Decisions` sections. For each, verify it appears in at least one plan task.

Print a coverage table:

```
Design Component          → Plan Task    Status
─────────────────────────────────────────────────
0-prime.md changes        → Task 1       ✓
1-execute.md changes      → Task 2       ✓
2-validate.md changes     → Task 4       ✓
task-format.md changes    → Task 3       ✓
```

If any component shows `✗ MISSING`, go back to Execute phase and add the missing task.

## 2. Completeness Check

Verify every task has:
- [ ] Files section with exact paths
- [ ] Wave and Depends on fields
- [ ] Steps with code or commands
- [ ] Verification step

If incomplete, go back to Execute phase.

## 3. User Approval Gate

<HARD-GATE>
User must explicitly approve the plan before proceeding.
</HARD-GATE>

Ask: "Plan complete. Ready to save and proceed to implementation?"

Options:
- Yes, save and continue
- No, let's revise [specify what]
