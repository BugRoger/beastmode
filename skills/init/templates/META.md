# META - Maintaining Project Documentation

## Purpose

This file defines how to maintain the `.agent/` documentation structure. It is always imported into CLAUDE.md to ensure consistent documentation practices.

## Rules Summary Updates

**Rule**: When adding, modifying, or removing rules in any `prime/` file, update the corresponding summary in `.agent/CLAUDE.md`.

**Process**:
1. Add the rule to the appropriate `prime/*.md` file
2. Add a one-sentence summary to the Rules Summary section in CLAUDE.md
3. Ensure the summary references the file: "See .agent/prime/FILENAME.md"

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

## Folder Structure

```
.agent/
├── CLAUDE.md       # <200 lines, summary + @imports
├── prime/          # Reference material (loaded by /prime)
├── research/       # Discovery, exploration
├── design/         # Specs, brainstorming output
├── plan/           # Implementation plans
├── status/         # Current state, milestones
├── verify/         # Verification reports
└── release/        # Changelogs, release notes
```
