---
phase: plan
epic: slugless-design
feature: slug-proposal-gate
---

# Slug Proposal Gate

**Design:** `.beastmode/artifacts/design/2026-03-30-slugless-design.md`

## User Stories

3. As a user, I want the skill to propose a slug after the decision tree is complete, so that the name reflects the actual feature, not a guess.
4. As a user, I want to confirm or override the proposed slug, so that I control the naming.

## What to Build

Add a new gated step to the design skill's checkpoint phase. After the decision tree walk, gray area sweep, and PRD approval — but before the PRD is written to disk — the skill proposes a slug derived from the conversation content.

**Slug proposal step:**
The skill synthesizes a short, hyphenated slug from the problem statement and solution (same format as current slugs: lowercase, hyphenated, concise). It presents the proposed slug to the user as a gated decision, consistent with the existing `design.*` gate model in `config.yaml`. The user can confirm, override with their own slug, or ask the skill to try again.

**Slug consumption:**
Once confirmed, the slug is used in the PRD frontmatter (`slug: <real-slug>`) and the PRD artifact filename (`YYYY-MM-DD-<real-slug>.md`). The stop hook's existing frontmatter parsing extracts it into output.json, where it becomes the bridge between the hex temp name (CLI-facing) and the real slug (everything-else-facing). No new transport mechanisms are needed.

**Gate configuration:**
Add a new gate `design.slug-proposal` to the config schema. Default mode: `human` (consistent with other design gates). In `auto` mode, the skill generates and self-approves the slug without user interaction.

## Acceptance Criteria

- [ ] After PRD approval, the skill proposes a slug before writing the PRD
- [ ] The user can confirm, override, or ask for a different slug
- [ ] The confirmed slug appears in PRD frontmatter as `slug: <real-slug>`
- [ ] The PRD artifact filename uses the real slug, not the hex temp name
- [ ] output.json contains the real slug (extracted from frontmatter by existing stop hook)
- [ ] The `design.slug-proposal` gate respects config.yaml mode (human/auto)
- [ ] In auto mode, the skill generates and uses the slug without prompting
