# Redundant Upstream Gatekeeping

## Observation 1
### Context
During retro-quick-exit design, 2026-03-08
### Observation
The retro quick-exit check used subjective heuristics ("fewer than ~5 substantive tool calls", "no new patterns observed") to skip the entire retro. This biased against design phases where conversation and decisions are the primary work, not tool calls. Meanwhile, the downstream retro agents (context walker, meta walker) already handle empty phases gracefully — returning "No changes needed" / "no findings" respectively. The upstream gate was premature optimization that actively harmed coverage.
### Rationale
When downstream components degrade gracefully on empty input, upstream gatekeeping adds failure modes without value. Subjective skip criteria are especially dangerous because they give the agent permission to skip work that looks lightweight but may contain meaningful findings.
### Source
state/design/2026-03-08-retro-quick-exit.md
### Confidence
[MEDIUM] — confirmed across 2 observations (see Obs 2)

## Observation 2
### Context
During bulletproof-state-scanner design, 2026-03-29
### Observation
Design chose reactive gate blocking over preemptive config gate checking. The scanner only checks manifest feature statuses for `blocked` entries rather than preemptively consulting gate configuration. Agents run until they hit a human gate and report back. This is the same principle as Obs 1 (let downstream handle gracefully) applied to runtime execution: don't prevent agents from starting based on gate config; let them run and block when they actually encounter the gate.
### Rationale
Preemptive gate checking requires the scanner to understand gate semantics, coupling it to config structure. Reactive blocking keeps the scanner read-only and simple — it reports what the manifest says, nothing more.
### Source
.beastmode/artifacts/design/2026-03-29-bulletproof-state-scanner.md
### Confidence
[MEDIUM] — second observation of reactive-over-preemptive principle (Obs 1 covered retro skip-checks; this covers runtime gate evaluation)
