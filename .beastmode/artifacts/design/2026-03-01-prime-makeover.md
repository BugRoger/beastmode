# Design: /prime Skill Makeover

## Goal

Transform `/prime` from a generic codebase analyzer into a beastmode-optimized session starter that loads curated `.agents/prime/` knowledge quickly and silently.

## Approach

**Single-phase skill** that assumes beastmode bootstrap, with fallback mechanisms for edge cases.

### Flow

```
1. Load Beastmode Context (primary)
   └── Read .agents/prime/*.md (all 7 files)
   └── Read .agents/CLAUDE.md
   └── Read .agents/status/STATUS.md (if exists)

2. Light Generic Exploration (supplemental)
   └── git status + recent commits
   └── Check for active plans/designs in .agents/

3. Output
   └── "✓ Primed" (silent confirmation)
```

### Output Style

- Silent by default — just "✓ Primed"
- No verbose summaries or reports
- Fast context injection into session

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Assume beastmode bootstrap | Skill is part of beastmode workflow; non-bootstrapped projects should run `/bootstrap` first |
| Single phase | Simplest structure; no conditional phase skipping needed |
| Silent output | Session starter shouldn't flood terminal; context is loaded into Claude's memory |
| Read all prime files | Complete context load every session ensures consistency |
| Light git exploration | Recent commits and status provide temporal context without heavy scanning |

## Component Breakdown

### Files to Modify

**`skills/prime/SKILL.md`**
- Update description to reflect beastmode focus
- Reduce to single phase
- Keep under 50 lines per conventions

**`skills/prime/phases/1-prime.md`** (renamed from 1-analyze.md)
- Step 1: Read beastmode context (.agents/prime/*, .agents/CLAUDE.md)
- Step 2: Read current state (.agents/status/STATUS.md, active plans/designs)
- Step 3: Light git exploration (status, recent commits)
- Step 4: Output confirmation

**Delete:** `skills/prime/phases/2-report.md`
- No longer needed; silent output replaces verbose report

### What Gets Loaded

**Always (beastmode core):**
- `.agents/CLAUDE.md` — Project brain
- `.agents/prime/META.md` — Documentation rules
- `.agents/prime/AGENTS.md` — Multi-agent safety
- `.agents/prime/STACK.md` — Tech stack
- `.agents/prime/STRUCTURE.md` — Directory layout
- `.agents/prime/CONVENTIONS.md` — Code style
- `.agents/prime/ARCHITECTURE.md` — System design
- `.agents/prime/TESTING.md` — Test strategy

**Situational (context refresh):**
- `.agents/status/STATUS.md` — Current state (if exists)
- Most recent `.agents/design/*.md` — Active design (if exists)
- Most recent `.agents/plan/*.md` — Active plan (if exists)
- `git log -5 --oneline` — Recent commits
- `git status` — Working tree state

### Fallback Mechanisms

| Situation | Behavior |
|-----------|----------|
| `.agents/prime/` missing | Print: "⚠ No .agents/prime/ found. Run `/bootstrap` to initialize." |
| Prime files exist but empty/placeholder | Print: "⚠ Prime files need content. Run `/bootstrap-discovery` to populate." |
| No `.agents/status/STATUS.md` | Skip silently |
| No active design/plan files | Skip silently |
| Git not available | Skip git commands silently |

## Testing Strategy

**Manual verification:**
1. Run `/prime` on bootstrapped beastmode project → should print "✓ Primed"
2. Run `/prime` on project without `.agents/` → should suggest `/bootstrap`
3. Run `/prime` on project with empty prime files → should suggest `/bootstrap-discovery`
4. Verify all 7 prime files are read into context (check Claude's understanding)

**Success criteria:**
- Skill completes in <5 seconds on typical project
- No verbose output in terminal
- Claude can answer questions about project conventions after priming
