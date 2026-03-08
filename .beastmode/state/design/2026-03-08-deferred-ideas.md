# Deferred Ideas Capture & /beastmode Consolidation

## Goal

Consolidate `/beastmode` into a unified command with subcommands and add deferred ideas capture and reconciliation. Deferred ideas are already written into design docs but never aggregated or surfaced. Fix that.

## Approach

`/beastmode` becomes the single entry point with three subcommands: `init`, `status`, `ideas`. No aggregate file for deferred ideas — walk design docs at read time. Reconciliation uses LLM matching against skill files.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage model | No aggregate file — walk design docs | Data already exists in design docs. No duplication. Source of truth stays with the design. |
| Surfacing | Via `/beastmode ideas` subcommand | Part of unified /beastmode command. On-demand, not ambient. |
| Reconciliation | LLM-powered scan of skill files | Semantic matching required. Free-text ideas can't be grep-matched against markdown skill content. |
| Marking resolved | Strikethrough in originating design doc + date | `~~idea text~~ (implemented: YYYY-MM-DD)`. Design doc stays the source of truth. |
| Status grouping | Features grouped by current phase state | Shows what's in design, plan, implement, validate. Easier to scan than flat list. |
| Subcommand depth | One level deep, no flags | `init`, `status`, `ideas`. No `--greenfield`/`--brownfield`. No sub-subcommands. |
| Standalone /status | Removed, folded into `/beastmode status` | One command to rule them all. |

### Claude's Discretion

- LLM matching heuristics for reconciliation (how aggressively to match)
- Exact output formatting for status and ideas displays
- How to handle ambiguous matches during reconciliation (present to user vs. auto-resolve)

## Component Breakdown

### `/beastmode` SKILL.md — Router

Updated routing table:

```
Extract subcommand from arguments:
- "init"    → @subcommands/init.md
- "status"  → @subcommands/status.md
- "ideas"   → @subcommands/ideas.md
- no args   → show help
```

### `/beastmode status` — Subcommand

1. Scan `state/` directory for features across all phase subdirectories
2. Determine each feature's most advanced phase (design → plan → implement → validate)
3. Exclude features that have been released (have release artifacts)
4. Group features by current phase state
5. Show worktree path if active

Output format:
```
## Active Features

### Design
- deferred-ideas (worktree: .beastmode/worktrees/deferred-ideas)

### Implement
- phase-end-guidance (worktree: .beastmode/worktrees/phase-end-guidance)
```

### `/beastmode ideas` — Subcommand

1. Walk `state/design/*.md` — extract `## Deferred Ideas` sections
2. Filter out entries marked "None" or strikethrough (`~~text~~`)
3. For each pending idea, LLM scan:
   - Read the idea description and context
   - Identify likely skill files that would contain matching functionality
   - Scan those files for semantic matches
   - Verdict: implemented or still pending
4. If implemented: mark with `~~idea text~~ (implemented: YYYY-MM-DD)` in originating design doc
5. Display remaining pending ideas

Output format:
```
## Deferred Ideas (N pending)

- <idea> (from: <feature>, <date>)
- <idea> (from: <feature>, <date>)

Reconciled: M ideas marked as implemented.
```

### `/beastmode init` — Subcommand (Simplified)

Existing install + greenfield combined into one flow. Details deferred.

## Files Affected

| File | Action |
|------|--------|
| `skills/beastmode/SKILL.md` | Edit — update routing table |
| `skills/beastmode/subcommands/status.md` | New — status logic |
| `skills/beastmode/subcommands/ideas.md` | New — ideas reconcile + display |
| `skills/beastmode/subcommands/install.md` | Delete |
| `skills/beastmode/subcommands/init.md` | Edit — simplify to single flow |
| `skills/status/SKILL.md` | Delete |
| `skills/status/phases/1-display.md` | Delete |
| `README.md` | Edit — update command reference |
| `.claude-plugin/marketplace.json` | Edit — update skill descriptions if needed |

## Acceptance Criteria

- [ ] `/beastmode` with no args shows help listing `init`, `status`, `ideas`
- [ ] `/beastmode status` shows features grouped by phase state (design/plan/implement/validate)
- [ ] `/beastmode ideas` walks design docs, reconciles pending items, displays unimplemented ones
- [ ] Reconciliation marks implemented ideas with strikethrough in the originating design doc
- [ ] Standalone `/status` skill removed
- [ ] `install` and `init` subcommands simplified

## Testing Strategy

- Run `/beastmode` with no args — verify help shows `init`, `status`, `ideas`
- Run `/beastmode status` — verify features grouped by phase state
- Run `/beastmode ideas` — verify walks design docs, reconciles, shows pending
- Verify `/status` no longer appears as standalone skill
- Verify reconciled ideas get strikethrough marks in design docs

## Deferred Ideas

- ~~**Init consolidation (install + greenfield + brownfield)** — full redesign of the init subcommand with combined install/setup flow and optional brownfield discovery~~ (implemented: 2026-03-08)
