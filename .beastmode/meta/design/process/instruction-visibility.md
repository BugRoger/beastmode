# Instruction Visibility

## Observation 1
### Context
During hitl-adherence design, 2026-03-05
### Observation
HTML comments are invisible to Claude on the critical path. The HITL-GATE annotation pattern was consistently skipped during execution. Critical-path instructions must be visible markdown.
### Rationale
HTML comments work for grep-based discovery but fail as execution triggers
### Source
state/design/2026-03-05-hitl-adherence.md
### Confidence
[MEDIUM] — confirmed across multiple attempts

## Observation 2
### Context
During hitl-adherence design, 2026-03-05
### Observation
@imported files lose priority against inline instructions. gate-check.md and transition-check.md were routinely ignored when inline HARD-GATE blocks gave competing directives.
### Rationale
For critical-path behavior, inline beats imported
### Source
state/design/2026-03-05-hitl-adherence.md
### Confidence
[MEDIUM] — confirmed pattern

## Observation 3
### Context
During hitl-adherence design, 2026-03-05
### Observation
Make skippable behavior unskippable by embedding it in the task runner. Converting gates from advisory annotations into numbered steps makes them structural — the step-walking loop cannot skip them.
### Rationale
Structural enforcement beats advisory annotations
### Source
state/design/2026-03-05-hitl-adherence.md
### Confidence
[MEDIUM] — implemented and confirmed

## Observation 4
### Context
During hitl-adherence design, 2026-03-05
### Observation
Three-iteration diagnosis reveals structural patterns. v1 added invisible annotations, v2 fixed chaining but not intra-phase gates, v3 identified root cause as format. Focus on delivery mechanism rather than logic when a feature fails twice.
### Rationale
Repeated failures with different symptoms point to delivery mechanism, not logic
### Source
state/design/2026-03-05-hitl-adherence.md
### Confidence
[LOW] — single diagnostic sequence

## Observation 5
### Context
During banner-visibility-fix design, 2026-03-06
### Observation
Wording changes to behavioral instructions have outsized impact. Replacing "display it" with "greet in persona voice" silently broke banner visibility.
### Rationale
Preserve concrete action verbs when rewriting behavior instructions — don't replace them
### Source
state/design/2026-03-06-banner-visibility-fix.md
### Confidence
[MEDIUM] — confirmed across banner iterations

## Observation 6
### Context
During banner-skill-preemption design, 2026-03-06
### Observation
L0 directives lose to active skill instructions. When a skill was invoked first, task-runner instructions took priority over Prime Directive. For behaviors that must survive skill invocations, embed them in the task-runner.
### Rationale
The task-runner is the actual execution engine, not L0
### Source
state/design/2026-03-06-banner-skill-preemption.md
### Confidence
[MEDIUM] — root cause confirmed
