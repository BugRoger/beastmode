## Context
Two competing EpicState type definitions existed: one in state-scanner.ts and one in watch-types.ts. They silently diverged — the scanner added fields the watch type didn't have, and vice versa. The blocked state was spread across four fields (blocked, gateBlocked, blockedGate, gateName) that were always identical or redundant.

## Decision
Single EpicState interface in state-scanner.ts. Delete watch-types.ts entirely — watch command imports types from state-scanner. Collapse blocked/gateBlocked/blockedGate/gateName into single blocked: boolean field. When blocked is true, status output shows actionable instruction: "run beastmode <phase> <slug>". Remove costUsd from EpicState.

## Rationale
One type, one truth. The watch command consuming the scanner's type ensures they can never diverge again. Collapsing blocked fields eliminates the impossible states where they disagree. Removing cost from the type simplifies the scanner's responsibility to pure state reporting.

## Source
.beastmode/state/design/2026-03-29-status-unfuckery-v2.md
