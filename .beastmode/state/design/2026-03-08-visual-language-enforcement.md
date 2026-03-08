# Design: Visual Language Enforcement

**Date:** 2026-03-08
**Status:** Approved

## Goal

Make Claude follow the visual language specification literally instead of treating it as a loose recommendation. Every render should produce identical output for identical state.

## Approach

Rewrite `visual-language.md` as a strict rendering specification. Replace descriptive language with prescriptive formulas, add "DO NOT" enforcement warnings, and include bad/good examples showing common deviations vs correct form. Single file change — no new files, no structural changes.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All touchpoints equally | Deviations are spread across phase indicator, context bar, and handoff text — no single worst offender |
| Template style | Parameterized formula | Concise but explicit. Full enumeration would be more rigid but introduces redundancy and fragility if phases change |
| Enforcement style | Imperative warnings + bad/good examples | Warnings set the expectation, bad/good examples give pattern-matching anchors for what "wrong" looks like |
| Rendering | Keep code blocks | Current spec says code blocks; user confirms this is the desired behavior |

### Claude's Discretion

- Exact wording of "DO NOT" warnings (as long as they're unambiguous)
- Number of bad examples per section (at least 2-3 per element)
- Ordering of sections within the file

## Components

### Character Vocabulary (unchanged)

Keep the existing table as-is. It's already unambiguous:

| Symbol | Meaning |
|--------|---------|
| `█` | Completed / full |
| `▓` | Current / in-progress |
| `░` | Pending / empty |
| `▒` | Reserved |

### Phase Indicator (strict rewrite)

Add to the phase indicator section:
1. **Parameterized formula** — exact rules in table form:
   - Each segment: exactly 10 characters of the appropriate block char
   - Separator: exactly 1 space between segments
   - Labels: left-aligned, padded to match segment width (10 chars)
   - Mapping: before current → `█`, current → `▓`, after current → `░`
2. **Enforcement warnings** — "DO NOT alter segment widths", "DO NOT omit labels", "DO NOT render outside a code block"
3. **Bad/Good examples** — at least 3 bad examples showing:
   - Variable-width segments
   - Labels not aligned to segments
   - Rendered outside code block
   - Wrong characters used

### Context Bar (strict rewrite)

Add to the context bar section:
1. **Exact format string** — literal template with placeholders:
   ```
   Context: {filled}{empty} ~{pct}% (~{used}k/{total}k)
   ```
   - Bar: exactly 30 characters total (`█` for filled, `░` for empty)
   - Calculation: `filled = round(percentage / 100 * 30)`
   - All estimates prefixed with `~`
2. **Enforcement warnings** — "DO NOT change bar width from 30", "DO NOT omit `~` prefix", "DO NOT add token breakdown lines"
3. **Bad/Good examples** — showing:
   - Wrong bar width
   - Missing `~` prefix
   - Creative reformatting of the Context: line
   - Added extra lines not in the spec

### Handoff Text (strict rewrite)

Replace the current bullet-list description with literal strings:
- Below 60%: `Context is fresh. Safe to continue.`
- 60-80%: `Context is moderate. One more phase is reasonable.`
- Above 80%: `Context is heavy. Start a new session for the next phase.`

Add: "Print one of these three strings EXACTLY. Do not paraphrase, expand, or rephrase."

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/visual-language.md` | Rewrite as strict rendering spec with enforcement language and bad/good examples |

## Acceptance Criteria

- [ ] `visual-language.md` contains explicit "DO NOT" enforcement warnings for each visual element
- [ ] Each element (phase indicator, context bar, handoff text) has bad/good examples showing common deviations vs correct form
- [ ] Phase indicator spec uses parameterized formula with exact character counts (10 chars per segment, 1 space separator)
- [ ] Context bar spec has exact format string with `~` prefix requirement and literal handoff text strings
- [ ] Character vocabulary section unchanged
- [ ] No new files created — single file change to `visual-language.md`

## Testing Strategy

- Invoke each of the 5 phase skills and verify the phase indicator matches the spec exactly (character count, spacing, labels)
- Complete a phase and verify the checkpoint context bar matches the exact format string
- Verify handoff text is one of the three literal strings, not a paraphrase
- Compare output across multiple sessions to confirm consistency

## Deferred Ideas

None.
