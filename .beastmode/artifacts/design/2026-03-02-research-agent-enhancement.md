# Design: Research Agent Enhancement

**Date:** 2026-03-02
**Status:** Approved

## Goal

Move research agent to `agents/` directory (aligned with discovery pattern) and enhance with epistemological principles for better research quality.

## Approach

**Full Alignment with Discovery** — Create `agents/researcher.md` as self-contained agent prompt, delete `skills/_shared/research-agent.md`, update phase references.

## Key Decisions

### Location
- Move from `skills/_shared/research-agent.md` to `agents/researcher.md`
- Aligns with existing `agents/discovery.md` pattern
- Both agents are self-contained, easy to find

### Tool Priority Hierarchy
1. **Context7** (HIGH trust) — Library APIs, features, versions
2. **WebFetch** (HIGH-MEDIUM) — Official docs, changelogs
3. **WebSearch** (requires verification) — Ecosystem patterns, SOTA

### Core Principles (from GSD)

**Research is Investigation, Not Confirmation**
- Start with questions, not answers
- Let findings shape recommendations
- Report what you find, not what you expected

**Claude's Training as Hypothesis**
- Training data is 6-18 months stale
- Verify before asserting
- Prefer current sources over training recall
- Flag when relying on training vs verified sources

**Honest Reporting**
- "I couldn't find X" is valuable
- Flag LOW confidence findings explicitly
- Incomplete answers beat confident fabrications

### Verification Protocol

| Evidence | Confidence |
|----------|------------|
| Context7 or official docs confirm | HIGH |
| Multiple independent sources agree | MEDIUM (boost one level) |
| Single WebSearch result only | LOW — flag for validation |

### WebSearch Tips
- Always include current year (2026)
- Use multiple query variations
- Cross-verify with authoritative sources
- Prefer official docs over blog posts

### Known Pitfalls to Prevent
- Deprecated Features (old docs vs current)
- Negative Claims Without Evidence
- Single Source Reliance
- Configuration Scope Blindness

## Components

### New Files

| File | Purpose |
|------|---------|
| `agents/researcher.md` | Self-contained research agent prompt |

### Modified Files

| File | Change |
|------|--------|
| `skills/design/phases/0-research.md` | Update path to `@../../agents/researcher.md` |
| `skills/plan/phases/0-research.md` | Update path to `@../../agents/researcher.md` |
| `.agents/prime/STRUCTURE.md` | Add researcher.md to agents/ listing |

### Deleted Files

| File | Reason |
|------|--------|
| `skills/_shared/research-agent.md` | Moved to agents/ |

## Testing Strategy

- Invoke `/design` with research trigger keywords
- Verify agent spawns with correct prompt
- Check research output includes confidence markers
- Confirm tool priority is followed (Context7 first)
