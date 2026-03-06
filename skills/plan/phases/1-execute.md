# 1. Execute

## 1. Create Plan Header

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Design Doc:** [Link to .beastmode/state/design/ doc]

---
```

## 2. Write Tasks

For each component in the design, create a task:

```markdown
## Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ext`
- Modify: `exact/path/to/existing.ext`
- Delete: `exact/path/to/remove.ext`

**Step 1: [Action]**

[Exact code or command]

**Step 2: [Action]**

[Exact code or command]

**Step N: Verify**

Run: `[verification command]`
Expected: [expected output]
```

## 3. Task Guidelines

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI principles
