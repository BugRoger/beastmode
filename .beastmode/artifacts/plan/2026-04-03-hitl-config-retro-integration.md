---
phase: plan
slug: hitl-config
epic: hitl-config
feature: retro-integration
wave: 3
---

# Retro Integration

**Design:** `.beastmode/artifacts/design/2026-04-03-hitl-config.md`

## User Stories

5. As a user, I want the retro to surface repetitive human decisions and propose config text so that I can evolve my HITL config with minimal friction.

## What to Build

Extend the retro system to analyze HITL decision logs and produce actionable config suggestions:

- **HITL log reading**: During the retro pass (which runs as part of the release phase), the retro agent reads all `hitl-log.md` files from the current epic's artifacts. These logs contain timestamped entries tagged `auto` or `human`.

- **Pattern detection**: The retro agent identifies repetitive human decisions — questions that the human answered the same way multiple times, or questions from the same category that always get the same answer. These represent candidates for automation.

- **Config proposal**: For each detected pattern, the retro agent proposes a prose snippet that could be added to the relevant phase's `hitl:` config in `config.yaml`. The proposal is copy-paste ready — the user can literally paste it into their config to auto-answer that class of questions in future runs.

- **Retro artifact integration**: The HITL analysis is included in the retro's context update output. It surfaces as an ALWAYS/NEVER bullet in the relevant L2 context file, and the config proposals appear in the retro summary shown to the user.

- **Retro agent prompt extension**: The retro-context agent's prompt (or the release skill's retro spawning logic) needs to include HITL log files in the artifact list passed to the agent. The agent already processes arbitrary artifact files — this is additive.

## Acceptance Criteria

- [ ] Retro agent receives HITL log files as part of its artifact input
- [ ] Repetitive human decisions (same answer to similar questions) are identified
- [ ] Config proposals are formatted as copy-paste `config.yaml` text
- [ ] Proposals appear in the retro summary shown to the user
- [ ] Works gracefully when no HITL logs exist (empty input, no errors)
