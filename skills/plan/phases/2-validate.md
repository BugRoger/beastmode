# 2. Validate

## 1. PRD Coverage Check

Extract all user stories from the PRD. For each, verify it appears in at least one feature plan.

Print a coverage table:

```
PRD User Story                → Feature          Status
───────────────────────────────────────────────────────
US 1: Independent implement   → plan-rewrite     ✓
US 2: Per-feature implement   → impl-decompose   ✓
US 3: All-complete validate   → validate-gate    ✓
```

If any story shows `✗ MISSING`, go back to Execute phase and assign it to a feature or create a new one.

## 2. Feature Completeness Check

Verify every feature has:
- [ ] Name (slug format)
- [ ] At least one user story
- [ ] What to Build section (non-empty)
- [ ] At least one acceptance criterion
- [ ] Link to parent PRD

If incomplete, go back to Execute phase.

## 3. Overlap Analysis

Check for user stories that appear in multiple features. If found:
- If intentional (shared concern): note in both features
- If accidental: remove from one and re-verify coverage

Print summary:

```
Overlap Analysis
────────────────
US 1: plan-rewrite only
US 2: impl-decompose only
US 3: validate-gate, impl-decompose (shared — intentional)
```

## 4. Executive Summary

Present a consolidated view before approval:

```
### Feature Plan Summary

**Design:** [PRD path]

**Architectural Decisions:**
| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |

**Features:** [count] features covering [count] user stories

| # | Feature | Stories | Scope |
|---|---------|---------|-------|
| 1 | [slug]  | US 1, 3 | [one-line] |
| 2 | [slug]  | US 2    | [one-line] |
```

This is read-only — do NOT ask new questions here.
