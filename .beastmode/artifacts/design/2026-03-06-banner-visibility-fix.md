# Design: Banner Visibility Fix

**Date:** 2026-03-06
**Status:** Approved

## Goal

Restore the beastmode ASCII banner visibility that was lost when the persona greetings design (v0.12.0) replaced "display it" with "greet in persona voice" in the CLAUDE.md Prime Directive.

## Approach

Update the Prime Directive wording to instruct Claude to display the banner output verbatim in a code block, then greet in persona voice. No changes to the hook script itself.

## Root Cause

The persona greetings design (commit 2715428) changed the CLAUDE.md Prime Directive from:

> "When you see SessionStart hook output in your system context, **display it** as a greeting at the start of the conversation"

To:

> "When you see SessionStart hook output in your system context, **greet in persona voice** with context-awareness (time of day, project state)"

The word "display" was replaced with "greet in persona voice," which told Claude to use the banner data as inspiration for a persona greeting rather than actually outputting the banner text. The banner was never shown to the user again.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Root cause | CLAUDE.md wording regression, not platform change | Git history proves the wording change correlates exactly with banner disappearing |
| Fix mechanism | Update Prime Directive text | Single-line change, minimal risk |
| Banner format | Code block (preserves monospace ASCII art) | Code blocks render monospace in both CLI and VSCode |
| Hook changes | None — session-start.sh stays as-is | Hook output reaches Claude's context correctly; the display instruction was the problem |

### Claude's Discretion

- Exact wording of the updated Prime Directive (as long as it includes "display verbatim" and "code block")

## Components

### Modified Files

| File | Change |
|------|--------|
| `CLAUDE.md` | Prime Directive: add "display the banner output verbatim in a code block" before persona greeting |

## Acceptance Criteria

- [ ] CLAUDE.md Prime Directive includes instruction to display banner verbatim in a code block
- [ ] New session shows the ASCII banner in user-visible output
- [ ] Persona greeting still follows the banner
- [ ] session-start.sh unchanged

## Testing Strategy

- Start a new Claude Code session in the project
- Verify the ASCII banner appears in the chat output as a code block
- Verify the persona greeting follows the banner with context-awareness

## Deferred Ideas

- Investigate whether Claude Code 2.1.0+ SessionStart hook stdout visibility change (GitHub issue #11120) also affects banner display in some environments. Current evidence suggests the CLAUDE.md wording is the primary cause, but the platform change may be a contributing factor.
