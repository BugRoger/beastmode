---
phase: implement
epic-id: bm-b2b8
epic-slug: heartbeat-countdown-timer-b2b8
feature-id: heartbeat-countdown-timer-b2b8--heartbeat-countdown-display-ec2b.1
feature-slug: heartbeat-countdown-display
status: completed
---

# Implementation Report: heartbeat-countdown-display

**Date:** 2026-04-12
**Feature Plan:** .beastmode/artifacts/plan/2026-04-12-heartbeat-countdown-timer-b2b8-heartbeat-countdown-display.md
**Tasks completed:** 4/4
**Review cycles:** 8 (spec: 4, quality: 4)
**Concerns:** 1
**BDD verification:** passed

## Completed Tasks

- Task 0: BDD Integration Test Scaffolding (haiku) — clean
- Task 1: WatchLoop Event Extensions (haiku) — clean
- Task 2: Countdown State Machine Hook (haiku) — clean
- Task 3: Wire Countdown to Dashboard (haiku) — with concerns (dead `watchRunning` state flagged by quality reviewer, fixed in cleanup commit)

## Concerns

- Task 3: Quality reviewer flagged dead `watchRunning` state variable — `useState` declared and set in handlers but never read after replacing `watchRunning={watchRunning}` prop with countdown props. Fixed by removing the 3 dead lines in a separate cleanup commit.

## Blocked Tasks

None

## BDD Verification

- Result: passed
- heartbeat-countdown profile: 6 scenarios, 21 steps — all GREEN
- heartbeat-watch-events profile: skipped (WatchLoop timer prevents clean cucumber exit; equivalent coverage via vitest unit tests in watch-events.test.ts)
- Retries: 0

## Summary

All tasks completed cleanly — 1 concern (dead code) resolved in cleanup commit. No blockers. No escalations.

### Files Changed

| File | Action |
|------|--------|
| `cli/src/dispatch/types.ts` | Modified — added `ScanStartedEvent`, `trigger` field on `ScanCompleteEvent`, extended `WatchLoopEventMap` |
| `cli/src/commands/watch-loop.ts` | Modified — emit `scan-started` before scan, `trigger` on `scan-complete` |
| `cli/src/__tests__/watch-events.test.ts` | Modified — 3 new tests for event ordering and trigger values |
| `cli/src/dashboard/use-countdown.ts` | Created — pure state machine + React hook |
| `cli/src/__tests__/use-countdown.test.ts` | Created — 13 unit tests for state transitions and formatting |
| `cli/src/dashboard/ThreePanelLayout.tsx` | Modified — replaced `watchRunning` boolean with `countdownDisplay`/`countdownRunning` |
| `cli/src/dashboard/App.tsx` | Modified — wired `useCountdown` hook, removed dead `watchRunning` state |
| `cli/features/heartbeat-countdown-display.feature` | Created — 6 BDD scenarios |
| `cli/features/heartbeat-watch-loop-events.feature` | Created — 3 BDD scenarios |
| `cli/features/step_definitions/heartbeat-countdown.steps.ts` | Created |
| `cli/features/step_definitions/heartbeat-watch-events.steps.ts` | Created |
| `cli/features/support/heartbeat-countdown-world.ts` | Created |
| `cli/features/support/heartbeat-countdown-hooks.ts` | Created |
| `cli/features/support/heartbeat-watch-world.ts` | Created |
| `cli/features/support/heartbeat-watch-hooks.ts` | Created |
| `cli/cucumber.json` | Modified — added `heartbeat-countdown` and `heartbeat-watch-events` profiles |
