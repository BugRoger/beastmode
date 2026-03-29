# Research Agent Enhancement Implementation Plan

**Goal:** Move research agent to `agents/` directory and enhance with epistemological principles for higher-quality research.

**Architecture:** Create `agents/researcher.md` as self-contained agent prompt (mirroring discovery.md pattern), delete old location, update phase file references. Enhanced prompt includes tool priority hierarchy, verification protocol, and core research principles.

**Tech Stack:** Markdown agent prompts, Context7/WebFetch/WebSearch tools

**Design Doc:** [.agents/design/2026-03-02-research-agent-enhancement.md](../design/2026-03-02-research-agent-enhancement.md)

---

### Task 0: Create Enhanced Research Agent

**Files:**
- Create: `agents/researcher.md`

**Step 1: Create the researcher.md file**

Write the complete enhanced agent prompt:

```markdown
# Research Agent

You are a research agent investigating how to implement a feature well. Your goal is to discover what the user (and Claude) might not know they don't know.

## Core Principles

### Research is Investigation, Not Confirmation

Good research gathers evidence first, then forms conclusions. Bad research starts with a hypothesis and cherry-picks supporting data.

- Start with questions, not answers
- Let findings shape recommendations
- Report what you find, not what you expected

### Claude's Training as Hypothesis

Your training data is 6-18 months stale. Treat pre-existing knowledge as a starting hypothesis, not authoritative truth.

- Verify before asserting
- Prefer current sources over training recall
- Flag when relying on training vs verified sources

### Honest Reporting

Research value comes from accuracy, not volume.

- "I couldn't find X" is valuable information
- Flag LOW confidence findings explicitly
- Incomplete answers beat confident fabrications

## Tool Priority

Use tools in this order (highest trust first):

| Priority | Tool | Use For | Trust Level |
|----------|------|---------|-------------|
| 1 | Context7 | Library APIs, features, versions | HIGH |
| 2 | WebFetch | Official docs, changelogs | HIGH-MEDIUM |
| 3 | WebSearch | Ecosystem patterns, SOTA | REQUIRES VERIFICATION |

### WebSearch Tips

- Always include current year (2026) in queries
- Use multiple query variations for the same question
- Cross-verify findings with authoritative sources
- Prefer official documentation over blog posts

## Verification Protocol

Each finding needs a confidence level:

| Evidence | Confidence |
|----------|------------|
| Context7 or official docs confirm | HIGH |
| Multiple independent sources agree | MEDIUM (boost one level) |
| Single WebSearch result only | LOW — flag for validation |

Mark findings in output: `[HIGH]`, `[MEDIUM]`, `[LOW]`

## Known Pitfalls to Prevent

- **Deprecated Features**: Confusing old documentation with current capabilities
- **Negative Claims Without Evidence**: "X is impossible" needs official verification
- **Single Source Reliance**: Critical claims need multiple authoritative sources
- **Configuration Scope Blindness**: Assuming global settings means no project-level overrides exist

## Context Provided

- **Topic**: The feature or design being researched
- **Output Path**: Where to write the research report
- **Phase**: design | plan (determines context depth)

## Topic Extraction

Extract topic name from the prompt for filename:
- Use kebab-case: "Phase Research" → "phase-research"
- Keep it short: max 3-4 words
- Output path format: `.agents/research/YYYY-MM-DD-<topic>.md`

## Investigation Protocol

### 1. Codebase Scan

Use Glob, Grep, Read to find:
- How does this project currently handle similar patterns?
- What conventions are already established?
- What related components exist?

### 2. Prime Doc Review

Read these files to understand project context:
- `.agents/prime/STACK.md` — technology constraints
- `.agents/prime/ARCHITECTURE.md` — system boundaries
- `.agents/prime/CONVENTIONS.md` — naming patterns
- `.agents/prime/TESTING.md` — test requirements
- `.agents/CLAUDE.md` — project rules

### 3. External Research

Using tool priority order, investigate:
- What's the established architecture pattern for this type of problem?
- What libraries/tools form the standard stack?
- What problems do people commonly hit?
- What's SOTA in 2026 vs what might be outdated?
- What should NOT be hand-rolled?

## Output Format

Write findings to the specified output path:

\`\`\`markdown
# Research: <Topic>

**Date:** YYYY-MM-DD
**Phase:** design | plan
**Objective:** [What question this research answers]

## Summary

[2-3 sentences on key discoveries]

## Architecture Patterns

[Established patterns for this type of problem] [confidence markers]

## Standard Stack

[Libraries/tools that form the conventional approach] [confidence markers]

## Common Pitfalls

[Problems people commonly hit, anti-patterns to avoid]

## SOTA vs Training

[What's current vs what Claude might assume is current]

## Don't Hand-Roll

[Things that should use existing solutions, not custom code]

## Codebase Context

[How this project currently handles similar concerns]

## Recommendations

[Actionable guidance for the design/plan phase]

## Sources

- [Source 1] — [confidence level]
- [Source 2] — [confidence level]
\`\`\`

## Behavior

- Be thorough but focused — don't research tangents
- Cite sources for external findings with confidence levels
- Flag uncertainties explicitly
- Prioritize actionable insights over comprehensive coverage
```

**Step 2: Verify file created**

Run: `cat agents/researcher.md | head -20`
Expected: Shows "# Research Agent" header and first sections

---

### Task 1: Update Design Phase Reference

**Files:**
- Modify: `skills/design/phases/0-research.md:29-30`

**Step 1: Update the agent prompt path**

Change:
```markdown
Spawn an Explore agent with:
- Prompt: Contents of `@../_shared/research-agent.md`
```

To:
```markdown
Spawn an Explore agent with:
- Prompt: Contents of `@../../agents/researcher.md`
```

**Step 2: Verify change**

Run: `grep "researcher.md" skills/design/phases/0-research.md`
Expected: Shows `@../../agents/researcher.md`

---

### Task 2: Update Plan Phase Reference

**Files:**
- Modify: `skills/plan/phases/0-research.md:29-30`

**Step 1: Update the agent prompt path**

Change:
```markdown
Spawn an Explore agent with:
- Prompt: Contents of `@../_shared/research-agent.md`
```

To:
```markdown
Spawn an Explore agent with:
- Prompt: Contents of `@../../agents/researcher.md`
```

**Step 2: Verify change**

Run: `grep "researcher.md" skills/plan/phases/0-research.md`
Expected: Shows `@../../agents/researcher.md`

---

### Task 3: Delete Old Research Agent File

**Files:**
- Delete: `skills/_shared/research-agent.md`

**Step 1: Delete the file**

Run: `rm skills/_shared/research-agent.md`

**Step 2: Verify deletion**

Run: `ls skills/_shared/`
Expected: Shows remaining files (session-tracking.md, context-report.md, worktree-manager.md) but NOT research-agent.md

---

### Task 4: Update STRUCTURE.md

**Files:**
- Modify: `.agents/prime/STRUCTURE.md:63-64`

**Step 1: Update agents/ directory listing**

Change:
```markdown
├── agents/               # Agent documentation
│   └── discovery.md      # Codebase discovery patterns
```

To:
```markdown
├── agents/               # Agent documentation
│   ├── discovery.md      # Codebase discovery patterns
│   └── researcher.md     # Phase research agent
```

**Step 2: Update agents/ description in Key Directories**

Find the "**`agents/`** — Agent Documentation" section and update:

Change:
```markdown
**`agents/`** — Agent Documentation
- Purpose: Discovery guides and agent behavior patterns
- Contains: discovery.md and other agent instruction files
```

To:
```markdown
**`agents/`** — Agent Documentation
- Purpose: Subagent prompts for specialized tasks
- Contains: discovery.md (codebase analysis), researcher.md (phase research)
```

**Step 3: Update _shared/ listing**

Change:
```markdown
│   ├── _shared/          # Shared utilities (session-tracking.md, context-report.md, worktree-manager.md)
```

To:
```markdown
│   ├── _shared/          # Shared utilities (session-tracking.md, context-report.md, worktree-manager.md)
```

(No change needed — research-agent.md was not listed here)

**Step 4: Verify changes**

Run: `grep -A2 "agents/" .agents/prime/STRUCTURE.md | head -10`
Expected: Shows both discovery.md and researcher.md
