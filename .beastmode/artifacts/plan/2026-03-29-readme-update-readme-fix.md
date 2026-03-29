---
phase: plan
epic: readme-update
feature: readme-fix
---

# readme-fix

**Design:** `.beastmode/artifacts/design/2026-03-29-readme-update.md`

## User Stories

1. As a new user reading the README, I want the config.yaml example to show real gate names, so that I can copy it and it works.
2. As a new user reading the README, I want the domain description to match the actual `.beastmode/` structure, so that I'm not confused when I look at the directory.
4. As an evaluator scanning the README, I want a clear "What Beastmode Is NOT" section, so that I understand the project's scope without reading docs.
5. As an existing user, I want the README to be accurate so I can trust it as a reference.

## What to Build

Three independent patches to README.md:

**Config example replacement.** The current YAML example in the "Progressive autonomy" section shows fictional gate names (`intent-discussion`, `design-approval`, `plan-approval`) and a deleted `transitions:` block. Replace the entire code block with a real excerpt from `.beastmode/config.yaml` showing the `design` and `implement` gate blocks (~12 lines). This demonstrates the `human`/`auto` pattern without overwhelming. No `transitions:` key.

**Domain list correction.** The "How It Works" section lists three domains: Context, State, Meta. The correct three user-facing domains are Artifacts (skill outputs), Context (project knowledge), Meta (process insights). State is pipeline internals (gitignored), not user-facing. Replace the bullet list.

**"What Beastmode Is NOT" section.** Add a new section after "Why?" and before "Credits". Three to four bullets covering: not portfolio strategy, not CI/CD, not project management. This overlaps with the "Why?" prose but makes it scannable for evaluators who don't read paragraphs.

**Line budget.** README must stay under 150 lines after all changes. The current file is 140 lines. The config example shrinks slightly, the domain list stays the same size, and the new section adds ~8 lines. Net change is small but must be verified.

## Acceptance Criteria

- [ ] Config example gate names match actual `.beastmode/config.yaml` gates
- [ ] No `transitions:` block in README example
- [ ] Domain list says Artifacts, Context, Meta (not State)
- [ ] "What Beastmode Is NOT" section exists after "Why?" section
- [ ] README is under 150 lines total
