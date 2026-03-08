# Hierarchy Format v2 Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Convert all L0/L1/L2 knowledge hierarchy files from prose+numbered-rules format to bullet-only format.

**Architecture:** Pure markdown reformatting. Each file transformed independently — read current content, drop prose paragraphs, convert to bullets. L2 bullets include rationale after em dash. L3 files untouched.

**Tech Stack:** Markdown files only. No runtime dependencies.

**Design Doc:** `.beastmode/state/design/2026-03-08-hierarchy-format-v2.md`

---

### Task 0: Convert L0 (BEASTMODE.md)

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/BEASTMODE.md`

**Step 1: Read current L0**

Read `.beastmode/BEASTMODE.md` in full.

**Step 2: Convert to bullet-only format**

Apply these rules:
- Drop ALL prose paragraphs and sentences that aren't bullets
- Convert every piece of information to a `- ` bullet
- Flatten `###` sub-headings into the parent `##` section as bullets
- Keep `## Section` headers but remove any deeper heading levels
- No sub-headings deeper than `##`
- Keep the `# Beastmode` title line
- Persona voice rules are already bullets — keep them
- Tone guardrails are already bullets — keep them

Target format:
```markdown
# Beastmode

- [directive]
- [directive]

## Persona
- [voice rule]
- [voice rule]

## Workflow
- [bullet]

## Knowledge
- [bullet]

## Configuration
- [bullet]
```

**Step 3: Verify**

Confirm: zero prose paragraphs remain, no `###` headings, all information preserved as bullets.

---

### Task 1: Convert L1 Context files (5 files)

**Wave:** 2
**Depends on:** -
**Parallel-safe:** true

**Files:**
- Modify: `.beastmode/context/DESIGN.md`
- Modify: `.beastmode/context/IMPLEMENT.md`
- Modify: `.beastmode/context/PLAN.md`
- Modify: `.beastmode/context/RELEASE.md`
- Modify: `.beastmode/context/VALIDATE.md`

**Step 1: Read all 5 L1 Context files**

Read each file in full.

**Step 2: Convert each to bullet-only format**

For each file, apply these rules:
- Drop the opening summary paragraph (the dense prose after `# Title`)
- Drop each `## Section` description paragraph (the prose between the heading and the numbered rules)
- Convert numbered `1. ALWAYS/NEVER...` rules to `- ALWAYS/NEVER...` bullets
- Keep `## Section` headings
- Keep `# Title` heading

Current pattern:
```markdown
# Design Context

[summary paragraph — DELETE]

## Architecture
[description paragraph — DELETE]

1. ALWAYS follow progressive loading...
2. NEVER use @imports between levels...
```

Target pattern:
```markdown
# Design Context

## Architecture
- ALWAYS follow progressive loading — L0 autoloads, L1 at prime, L2 on-demand
- NEVER use @imports between levels — convention-based paths only
```

**Step 3: Verify**

Confirm for each file: zero prose paragraphs, no numbered lists, all rules preserved as dash bullets.

---

### Task 2: Convert L1 Meta files (5 files)

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/DESIGN.md`
- Modify: `.beastmode/meta/IMPLEMENT.md`
- Modify: `.beastmode/meta/PLAN.md`
- Modify: `.beastmode/meta/RELEASE.md`
- Modify: `.beastmode/meta/VALIDATE.md`

**Step 1: Read all 5 L1 Meta files**

Read each file in full.

**Step 2: Convert each to bullet-only format**

Same rules as Task 1:
- Drop opening summary paragraph
- Drop section description paragraphs
- Convert numbered rules to dash bullets
- Keep `## Section` headings and `# Title`
- For sections with "None recorded." or "No patterns yet" — convert to `- None recorded.`

Target pattern identical to L1 Context:
```markdown
# Implement Meta

## Process
- ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets
- ALWAYS verify task state from artifacts rather than trusting tasks.json in long sessions

## Workarounds
- ALWAYS design parallel dispatch for post-hoc reconciliation, not real-time status updates
- ALWAYS read skill files from worktree path when the feature modifies skill files
```

**Step 3: Verify**

Confirm: zero prose paragraphs, all rules as dash bullets, format identical to L1 Context.

---

### Task 3: Convert L2 Context files (17 files)

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/design/architecture.md`
- Modify: `.beastmode/context/design/phase-transitions.md`
- Modify: `.beastmode/context/design/product.md`
- Modify: `.beastmode/context/design/release-workflow.md`
- Modify: `.beastmode/context/design/task-runner.md`
- Modify: `.beastmode/context/design/tech-stack.md`
- Modify: `.beastmode/context/implement/agents.md`
- Modify: `.beastmode/context/implement/testing.md`
- Modify: `.beastmode/context/plan/conventions.md`
- Modify: `.beastmode/context/plan/structure.md`
- Modify: `.beastmode/context/plan/task-format.md`
- Modify: `.beastmode/context/plan/workflow.md`
- Modify: `.beastmode/context/release/changelog.md`
- Modify: `.beastmode/context/release/release-process.md`
- Modify: `.beastmode/context/release/versioning.md`
- Modify: `.beastmode/context/validate/quality-gates.md`
- Modify: `.beastmode/context/validate/validation-patterns.md`

**Step 1: Read all 17 L2 Context files**

Read each file in full.

**Step 2: Convert each to bullets-with-rationale format**

For each file, apply these rules:
- Drop the opening summary paragraph (prose after `# Title`)
- Drop each `## Section` description paragraph
- Convert numbered rules to `- ` bullets
- For each bullet, ensure it has a rationale after an em dash (`—`)
  - If the rule already has explanation inline, keep it after `—`
  - If the rule is self-evident, the rationale can be brief (1-3 words)
  - If a description paragraph contained useful context not in the rules, fold it into a bullet
- Keep `# Title` and `## Section` headings

Current pattern:
```markdown
# Architecture

[summary paragraph — DELETE]

## Knowledge Hierarchy
[description paragraph — fold useful parts into bullets]

1. ALWAYS follow progressive loading — L0 autoloads, L1 at prime, L2 on-demand
2. NEVER use @imports between levels — convention-based paths only
```

Target pattern:
```markdown
# Architecture

## Knowledge Hierarchy
- Four-level progressive enhancement: L0 autoloads, L1 at prime, L2 on-demand, L3 linked from L2
- NEVER @import between levels — convention-based paths prevent circular dependencies
- L2 domains follow tiered taxonomy — Tier 1 universal, Tier 2 high-frequency, Tier 3 retro-driven
- L1 uses UPPERCASE.md, L2 uses lowercase.md — visual distinction at filesystem level
- ALWAYS use absolute directives for non-negotiable rules — ambiguous phrasing causes drift
- L3 records have four sections: Context, Decision, Rationale, Source — consistent structure aids parsing
- L0 = persona + map only — operational details belong in skills
```

**Step 3: Verify**

Confirm for each file: zero prose paragraphs, all bullets have rationale after em dash, no numbered lists.

---

### Task 4: Convert L2 Meta files (10 files)

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/design/process.md`
- Modify: `.beastmode/meta/design/workarounds.md`
- Modify: `.beastmode/meta/implement/process.md`
- Modify: `.beastmode/meta/implement/workarounds.md`
- Modify: `.beastmode/meta/plan/process.md`
- Modify: `.beastmode/meta/plan/workarounds.md`
- Modify: `.beastmode/meta/release/process.md`
- Modify: `.beastmode/meta/release/workarounds.md`
- Modify: `.beastmode/meta/validate/process.md`
- Modify: `.beastmode/meta/validate/workarounds.md`

**Step 1: Read all 10 L2 Meta files**

Read each file in full.

**Step 2: Convert each to bullets-with-rationale format**

Same format rules as Task 3 (L2 Context). Identical structure:
- Drop opening summary paragraph
- Drop section description paragraphs
- Convert to `- ` bullets with rationale after em dash
- Sections with "None recorded." → `- None recorded.`
- For sections that have description paragraphs without numbered rules (e.g., Scope Management, Cross-Session State), convert the description to bullets with rationale

Target pattern:
```markdown
# Design Process

## Competitive Analysis
- ALWAYS produce dated research artifacts from 3+ sources before locking structural decisions — research-informed designs outperform brainstorming
- ALWAYS present structures as self-evident choices — avoids perception of imitation

## Fractal Consistency
- ALWAYS start from existing algorithms for analogous subsystems — constrains design space productively
- ALWAYS seed new files from real session content — templates produce generic placeholders
```

**Step 3: Verify**

Confirm: format identical to L2 Context files, zero prose paragraphs, all bullets have rationale.

---

### Task 5: Verification sweep

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4

**Files:**
- (read-only scan of all modified files)

**Step 1: Grep for prose paragraphs in L0/L1**

Run grep across L0 and L1 files looking for lines that:
- Don't start with `#`, `-`, or are blank
- Are longer than 10 characters (to exclude "None recorded." edge cases)

Any matches = residual prose that needs cleanup.

**Step 2: Grep for numbered lists in L0/L1/L2**

Search for lines matching `^[0-9]+\.` in all L0/L1/L2 files. Any matches = unconverted numbered rules.

**Step 3: Grep for prose in L2**

Same as Step 1 but for L2 files.

**Step 4: Spot-check em dash rationale in L2**

Read 3 random L2 files and verify bullets have `—` rationale suffix.

**Step 5: Verify L3 untouched**

Run `git diff` on L3 files to confirm zero changes.

**Step 6: Report results**

Print pass/fail summary for each check.
