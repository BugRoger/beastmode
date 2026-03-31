# Feature Plan Format

## Template

Each feature plan file follows this structure:

```markdown
---
phase: plan
epic: <design-slug>
feature: <feature-slug>
wave: <integer>
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
- **Wave ordered** — `wave` field in frontmatter controls execution order. Wave 1 runs first, wave 2 after all wave 1 features complete. Features in the same wave run in parallel. Defaults to 1 for single-feature plans.
