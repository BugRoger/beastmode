# Feature Plan Format

## Template

Each feature plan file follows this structure:

```markdown
---
phase: plan
slug: <hex>
epic: <design>
feature: <feature-slug>
wave: <N>
---

# [Feature Name]

**Design:** [path to parent PRD]

## User Stories

[Numbered list of user stories this feature covers, copied from the PRD]

## What to Build

[Architectural description of what needs to happen. Describe modules, interfaces, and interactions. Do NOT include specific file paths or code — /implement will discover those via codebase exploration.]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion N]
```

## Guidelines

- **No file paths** — /implement explores the codebase and determines exact files
- **No code snippets** — /implement generates task-level code during decomposition
- **Architectural, not procedural** — describe WHAT, not step-by-step HOW
- **Self-contained** — each feature should be implementable without reading other feature plans
- **Linked** — always reference the parent PRD and shared architectural decisions
- **Wave field** — stamped by validate phase, indicates execution order (1 = foundation, higher = later)
