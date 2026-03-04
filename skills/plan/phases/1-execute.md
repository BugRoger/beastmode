# 1. Execute

## 1. Explore Codebase

Understand:
- Existing patterns and conventions
- Files that will be touched
- Test structure and commands
- Dependencies and build tools

## 2. Create Plan Header

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Doc:** [Link to .beastmode/state/design/ doc]

---
```

## 3. Write Tasks

For each component in the design, create a task using the format in @../references/task-format.md.

## 4. Task Guidelines

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI principles
