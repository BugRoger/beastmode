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
