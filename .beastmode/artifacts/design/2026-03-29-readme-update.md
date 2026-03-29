---
phase: design
slug: readme-update
---

## Problem Statement

The README and ROADMAP contain stale information as of v0.44.0. The config.yaml example shows fictional gate names and a deleted `transitions:` block. The domain list says "three" but names the wrong three. ROADMAP lists shipped features as upcoming and deleted features as current. These inaccuracies erode trust for anyone evaluating the project.

## Solution

Fix all inaccuracies across README.md and ROADMAP.md. Replace the fictional config example with real gates. Correct the domain list. Update ROADMAP to reflect what's actually shipped. Add a "What Beastmode Is NOT" positioning section.

## User Stories

1. As a new user reading the README, I want the config.yaml example to show real gate names, so that I can copy it and it works.
2. As a new user reading the README, I want the domain description to match the actual `.beastmode/` structure, so that I'm not confused when I look at the directory.
3. As a contributor reading the ROADMAP, I want shipped features in "Now" and only upcoming features in "Next", so that I understand the project's actual state.
4. As an evaluator scanning the README, I want a clear "What Beastmode Is NOT" section, so that I understand the project's scope without reading docs.
5. As an existing user, I want the README to be accurate so I can trust it as a reference.

## Implementation Decisions

- Config example shows design + implement gate blocks (~12 lines) — demonstrates human/auto pattern without overwhelming
- Remove the `transitions:` block from the example entirely — it was deleted in v0.22.0
- Domain description corrected to three: Artifacts (skill outputs), Context (project knowledge), Meta (process insights) — State is pipeline internals, not user-facing
- ROADMAP "Now" gains 6 entries: CLI orchestrator, cmux integration, GitHub state model, terminal phase states, pure manifest state machine, demo recording
- ROADMAP "Now" loses 2 entries: "Phase auto-chaining" (stale — transitions config removed in v0.22.0), "Visual language spec" (deleted in v0.14.36)
- ROADMAP "Next" loses "Demo recording" (shipped)
- ROADMAP "Later" updates "GitHub feature tracking" to note that manifest-based GitHub mirroring is already shipped
- "What Beastmode Is NOT" section added after "Why?" section — 3-4 bullets covering: not portfolio strategy, not CI/CD, not project management

## Testing Decisions

- Verify config example gate names match actual `.beastmode/config.yaml`
- Verify no `transitions:` block in README example
- Verify domain list says Artifacts, Context, Meta (not State)
- Verify ROADMAP "Now" includes CLI orchestrator, cmux, GitHub model, terminal phases, manifest split, demo
- Verify ROADMAP "Now" does not include "Phase auto-chaining" or "Visual language spec"
- Verify "What Beastmode Is NOT" section exists after "Why?"
- Count README lines — should stay under 150

## Out of Scope

- Rewriting README prose or restructuring sections (this is accuracy fixes only)
- Updating docs/ essays (progressive-hierarchy.md, retro-loop.md, configurable-gates.md) — those may have their own staleness but are a separate concern
- Updating DESIGN.md context doc domain count — separate concern
- Adding new README sections beyond "What Beastmode Is NOT"

## Further Notes

Three prior PRDs exist for README work (readme-rework, vision-readme-consolidation, readme-differentiators). This PRD is independent — focused purely on accuracy drift since those were implemented.

## Deferred Ideas

- Docs accuracy cascade — configurable-gates.md may reference stale gate names
- DESIGN.md context doc domain count sync (says "Four data domains")
- ROADMAP "Later" accuracy review — some items may be partially shipped
