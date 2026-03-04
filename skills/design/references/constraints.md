# Design Constraints

## No Implementation Until Approval

Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it.

This applies to EVERY project regardless of perceived simplicity.

## Why This Matters

- "Simple" projects are where unexamined assumptions cause the most wasted work
- The design can be short (a few sentences for truly simple projects)
- You MUST present it and get approval before proceeding

## No Plan Mode

**You MUST NOT call `EnterPlanMode` or `ExitPlanMode` during this skill.** This skill operates in normal mode. Plan mode restricts Write/Edit tools. Use the /plan skill for structured planning instead.

## Anti-Pattern: "Too Simple for Design"

Every feature goes through this process. A config change, a single-function utility, a rename — all of them. "Simple" features are where unexamined assumptions cause the most wasted work.

The design can be short (a few sentences), but you MUST:
1. Identify at least 1 gray area
2. Present it for approval
3. Write the design doc

There is no "skip design" path.
