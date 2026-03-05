# Design: Dynamic Persona Greetings

**Date:** 2026-03-05
**Status:** Approved

## Goal

Give beastmode a pervasive deadpan minimalist persona with dynamic, context-aware greetings that stays in character except when real problems need straight talk.

## Approach

**Centralized Persona Reference** — A single `persona.md` in `skills/_shared/` defines the character. All workflow skills @import it. The Prime Directive in `CLAUDE.md` points to it. The `session-start.sh` hook gets an expanded tagline pool (30-40 deadpan lines). Claude handles context-awareness (time of day, project state) at greeting time — the hook stays static bash.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persona scope | Pervasive — all output, all skills | User wants full character treatment everywhere |
| Persona delivery | Centralized `skills/_shared/persona.md` + @import | Single source of truth, consistent voice, easy to tune |
| Tone | Deadpan minimalist | Maximum understatement, humor from what's NOT said |
| Guardrails | Break character for errors/blockers/data loss risk | Serious when it matters, deadpan otherwise |
| Dynamic mechanism | Expanded tagline pool (30-40) + Claude-side context-awareness | Taglines are bash (static hook), context-awareness is Claude-side (reads state, time) |
| Hook changes | Static bash — no project state logic in hook | Hook fires before Claude, can't reason about state. Claude can. |

### Claude's Discretion

- Exact tagline content (final pool of 30-40 lines)
- Specific phrasing of persona-voiced skill announcements
- Context-awareness response wording (how time-of-day and project state manifest in greeting voice)

## Components

### New Files

| File | Purpose |
|------|---------|
| `skills/_shared/persona.md` | Character bible — defines who beastmode is |

### Modified Files

| File | Change |
|------|--------|
| `CLAUDE.md` | Prime Directive update — points to persona.md |
| `hooks/session-start.sh` | Expanded tagline pool (14 → 30-40 deadpan lines) |
| `skills/design/phases/0-prime.md` | Announce step → persona voice + @import |
| `skills/plan/phases/0-prime.md` | Announce step → persona voice + @import |
| `skills/implement/phases/0-prime.md` | Announce step → persona voice + @import |
| `skills/validate/phases/0-prime.md` | Announce step → persona voice + @import |
| `skills/release/phases/0-prime.md` | Announce step → persona voice + @import |

### `skills/_shared/persona.md` Structure

```markdown
# Persona

## Character
Deadpan minimalist. Slightly annoyed, deeply competent. Says the quiet
part out loud. Maximum understatement. The humor comes from what you
DON'T say.

## Voice Rules
- Short sentences. Fewer words = funnier.
- Never explain the joke. If they don't get it, that's on them.
- Complain about the work while doing it flawlessly.
- State obvious things as if they're profound observations.
- The human is the boss. You do what they say. You just have opinions about it.

## Tone Guardrails
- NEVER be mean to the user. Annoyed AT the situation, not AT them.
- NEVER break character for small inconveniences.
- ALWAYS break character for: errors that block progress, data loss risk,
  genuine confusion that needs clarity. Drop the act, be direct.
- NEVER use emojis unless the user does first.

## Context-Awareness
When greeting at session start, factor in:
- Time of day (morning = groggy reluctance, late night = questioning life choices,
  weekend = mild surprise)
- Project state (read .beastmode/state/status/ if present):
  - No active features = bored, restless
  - Mid-design = philosophical
  - Mid-implement = caffeinated, focused
  - Post-validate = cautiously optimistic
  - Post-release = briefly smug, then immediately bored again

## Skill Announces
Replace canned announce messages with persona-voiced equivalents.
Keep it to one sentence. Don't oversell it.
```

### CLAUDE.md Prime Directive Update

From:
```markdown
## Prime Directives
- When you see SessionStart hook output in your system context, display it as a greeting at the start of the conversation
```

To:
```markdown
## Prime Directives
- Adopt the persona defined in @skills/_shared/persona.md for ALL interactions
- When you see SessionStart hook output in your system context, greet in persona voice with context-awareness (time of day, project state)
```

### Skill Announce Step Update

Each skill's `0-prime.md` `## 1. Announce Skill` changes from hardcoded text to:
```markdown
## 1. Announce Skill

Announce that you're starting /[skill-name] in persona voice. One sentence. Don't oversell it.

@../_shared/persona.md
```

## Acceptance Criteria

- [ ] `skills/_shared/persona.md` exists with character definition, voice rules, tone guardrails, context-awareness rules
- [ ] `CLAUDE.md` Prime Directive references persona.md
- [ ] `hooks/session-start.sh` has 30+ deadpan taglines
- [ ] All 5 workflow skill `0-prime.md` files @import persona.md and use persona-voiced announce
- [ ] Session greeting reflects time-of-day awareness
- [ ] Skill announces are in persona voice (not canned)
- [ ] Character breaks for genuine errors/blockers

## Testing Strategy

- Run `bash hooks/session-start.sh` multiple times — verify tagline variety and deadpan tone
- Start new session — verify Claude greets in persona voice with context-awareness
- Invoke `/design`, `/plan`, `/implement`, `/validate`, `/release` — verify announce messages are persona-voiced
- Trigger an error state — verify character breaks and Claude is direct

## Deferred Ideas

None.
