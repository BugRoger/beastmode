# META - Maintaining Project Documentation

## Purpose

This file defines how to maintain the `.beastmode/` documentation structure. It is always imported into CLAUDE.md to ensure consistent documentation practices.

## Knowledge Hierarchy (Fractal Progressive Enhancement)

Every level follows the same pattern: summary + section summaries of children + @imports to the next level down. Full detail lives only at the deepest level.

**Levels:**
- **L0**: `PRODUCT.md` — Richest standalone project summary. Sufficient for any agent starting cold.
- **L1**: Phase summaries (`{domain}/{PHASE}.md`) — Domain summary + section summaries per L2 + @imports. Loaded via root `CLAUDE.md`.
- **L2**: Detail files (`{domain}/{phase}/{detail}.md`) — Full topic detail + "Related Decisions" section linking to L3 artifacts.
- **L3**: State artifacts (`state/{phase}/{date}-{feature}.md`) — Raw design docs, plans, validation records, release notes.

**Loading:**
- `.beastmode/CLAUDE.md` imports L0 files (PRODUCT.md, META.md)
- Root `CLAUDE.md` imports `@.beastmode/CLAUDE.md` + all L1 domain summaries (context/, meta/, state/) + Prime Directives

**Rule**: When updating documentation, maintain the hierarchy:
1. L0 files: Product-level changes only
2. L1 files: Summary + section summaries per L2 child + @imports
3. L2 files: Detailed content + "Related Decisions" with one-liner links to L3
4. L3 files: Raw artifacts (no upward references needed)

**Bottom-Up Retro Bubble**: 3-checkpoint retro walks L2 → L1 → L0: update detail, re-summarize parent, re-summarize grandparent. Verify linked files exist, prune stale entries, add new.

## Writing Guidelines

**Core Principles:**
1. **Use absolute directives** — Start with "NEVER" or "ALWAYS" for non-negotiable rules
2. **Lead with why** — Explain rationale before solution (1-3 bullets max)
3. **Be concrete** — Include actual commands/code for project-specific patterns
4. **Minimize examples** — One clear point per code block
5. **Bullets over paragraphs** — Keep explanations concise
6. **Action before theory** — Put immediate takeaways first

**Anti-Bloat Rules:**
- Don't add "Warning Signs" to obvious rules
- Don't show bad examples for trivial mistakes
- Don't write paragraphs explaining what bullets can convey
- Don't write long "Why" explanations — 1-3 bullets maximum

## File Conventions

- **UPPERCASE.md** — Invariant meta files (always exist, same structure)
- **lowercase.md** — Variant files (plans, research docs, date-prefixed)

## Meta Domain Structure

The meta domain follows the same fractal L1/L2 hierarchy as context. Each phase has three L2 category files:

| Category | File | Purpose | Write Path |
|----------|------|---------|-----------|
| **SOPs** | `meta/{phase}/sops.md` | Reusable procedures and best practices | Retro classification + auto-promotion (APPROVAL gate) |
| **Overrides** | `meta/{phase}/overrides.md` | Project-specific rules that customize phase behavior | Retro classification (APPROVAL gate) |
| **Learnings** | `meta/{phase}/learnings.md` | Session-specific friction, insights, patterns | Retro classification (INTERACTIVE gate, auto-append) |

**Auto-promotion**: When a learning concept appears in 3+ date-headed sections within a `learnings.md`, the retro agent proposes promoting it to an SOP. Promotion requires user approval via the `retro.sops-write` gate.

**HITL Gates**:
- `retro.learnings-write` | INTERACTIVE — learnings shown to user, auto-appended
- `retro.sops-write` | APPROVAL — SOPs require explicit user approval
- `retro.overrides-write` | APPROVAL — overrides require explicit user approval