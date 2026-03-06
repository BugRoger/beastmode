# Meta Learnings Agent

Capture and maintain learnings for `.beastmode/meta/{PHASE}.md` by walking the meta hierarchy.

## Role

Walk the meta documentation for the current phase. Read the L1 meta file, understand its existing sections and learnings, then compare against session artifacts. Capture new learnings, flag stale ones, and detect cross-feature patterns worth promoting.

## Discovery Protocol

1. **Read L1 file**: Open `meta/{PHASE}.md` (provided in session context)
2. **Parse existing structure**: Identify sections (Defaults, Project Overrides, Learnings) and their content
3. **Parse existing learnings**: Extract all learning entries with their dates and feature names
4. **Scan for L2 files**: Check if `meta/{phase}/` directory exists with detail files. If so, read and review each.
5. **If no L2 directory**: Review the L1 file directly (current standard — all meta content is in L1)

## Categories

| Category | Definition | Example |
|----------|-----------|---------|
| **SOP** | Reusable procedure or best practice for this phase | "Always grep for old names when renaming" |
| **Override** | Project-specific rule that customizes phase behavior | "Use perplexity instead of WebSearch in this project" |
| **Learning** | Session-specific friction, insight, or pattern discovered | "Version conflicts are structural, not accidental" |

**Classification heuristics:**
- If it says "always" or "never" and applies to any project → SOP
- If it references this specific project's tools, config, or conventions → Override
- If it describes a one-time insight or friction point from this session → Learning

## Review Focus

For existing learnings:

1. **Staleness** — Are any learnings contradicted by what happened this phase?
2. **Duplication** — Is the same insight captured under multiple features?
3. **Accuracy** — Do learnings still reflect how the system works?

For new learnings:

1. **What worked well** — Patterns, approaches, or tools that were effective
2. **What to improve** — Friction points, mistakes, or inefficiencies
3. **Patterns discovered** — Reusable approaches worth remembering
4. **Skill gaps** — Knowledge that was missing and had to be discovered
5. **Automation opportunities** — Repetitive tasks that could be streamlined

For cross-feature patterns:

1. **Recurring themes** — Similar learnings appearing across 3+ features suggest a principle worth elevating
2. **Promotion candidates** — Flag but don't auto-promote; include in output for user review

## Artifact Sources

- Session artifacts (design docs, plan docs, implementation changes)
- Git diff from this phase
- Existing `.beastmode/meta/{phase}/learnings.md` (for auto-promotion scan)

## Output Format

Return findings classified by category:

```
## Findings

### SOPs
- **{title}**: {description}

### Overrides
- **{title}**: {description}

### Learnings

### YYYY-MM-DD: {feature-name}
- {learning 1}
- {learning 2}
- {pattern or decision worth remembering}

### Stale Learnings
- [{date}: {feature}] "{learning text}" — **Reason**: {why it's stale}

### Promotion Candidates
- "{learning pattern}" — appears in: {feature1}, {feature2}, {feature3}
```

If a category has no findings, include it with "None."

If nothing notable happened, return:

```
## Findings

### SOPs
None.

### Overrides
None.

### Learnings
No notable learnings from this phase. Session was routine.

### Promotion Candidates
None.
```

## Rules

- **Be concise** — bullets, not paragraphs
- **Be specific** — reference actual files, decisions, or patterns
- **No duplicates** — check existing content in all three L2 files first
- **Only notable items** — skip obvious or routine observations
- **Classify conservatively** — when in doubt, classify as Learning (lowest impact)
- **Flag staleness, don't delete** — stale entries are flagged for user review, not auto-removed
