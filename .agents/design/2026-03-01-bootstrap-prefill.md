# Bootstrap Prefill Feature

**Date:** 2026-03-01
**Status:** Approved

## Overview

Two new skills to prefill `.agents/prime/*.md` templates after `/bootstrap`:

| Skill | Purpose | Style |
|-------|---------|-------|
| `/bootstrap-wizard` | Interactive prefill via conversation | GSD-style, follow threads |
| `/bootstrap-discovery` | Autonomous codebase analysis | Subagent, reviews before writing |

## Philosophy

Inspired by GSD's approach:
- **Deep discovery over checklist** — follow conversational threads, don't just march through questions
- **Brownfield detection** — recognize existing projects need different treatment
- **Progressive disclosure** — core first, optional layers after
- **Auto mode when docs exist** — don't ask if you can infer

## File Structure

```
skills/
├── bootstrap-wizard/
│   ├── SKILL.md                 # Orchestration + conversation flow
│   └── references/
│       └── question-bank.md     # Deep-dive questions per topic
├── bootstrap-discovery/
│   └── SKILL.md                 # Orchestration (spawns agent)

agents/
└── discovery.md                 # Subagent prompt for codebase analysis
```

## Skill 1: `/bootstrap-wizard`

### Description

```yaml
name: bootstrap-wizard
description: Interactive conversational prefill of .agents/prime/*.md templates.
  Use after /bootstrap to configure project context through GSD-style
  dialogue. Covers stack, structure, conventions, architecture, testing.
```

### Prerequisite

Verify `.agents/prime/` exists. If not, prompt to run `/bootstrap` first.

### Conversation Flow

```
1. ORIENTATION
   - "What does this project do in one sentence?"
   - "Is this greenfield or adding to existing code?"
   - Follow threads based on answers

2. STACK (→ STACK.md)
   - Language/runtime discovery via conversation
   - Framework choices and why
   - Key dependencies and their purpose
   - Build/test/lint tooling
   → Present STACK.md for review → write on approval

3. STRUCTURE (→ STRUCTURE.md)
   - Where does code live?
   - Entry points, config locations
   - Where to add new features?
   → Present STRUCTURE.md for review → write on approval

4. CONVENTIONS (→ CONVENTIONS.md)
   - Naming patterns (files, functions, types)
   - Import/export style
   - Error handling approach
   → Present CONVENTIONS.md for review → write on approval

5. ARCHITECTURE (→ ARCHITECTURE.md)
   - Major components and their relationships
   - Data flow
   - Key architectural decisions
   → Present ARCHITECTURE.md for review → write on approval

6. TESTING (→ TESTING.md)
   - Test commands
   - Test structure and naming
   - Coverage expectations
   → Present TESTING.md for review → write on approval

7. WRAP-UP
   - Update .agents/CLAUDE.md rules summary with one-liners
   - Offer to commit all changes
```

### Key Behaviors

- One question at a time
- Can skip sections ("skip" or "later")
- Can go back to revise previous sections
- Prescriptive output ("Use camelCase") not descriptive ("Some code uses camelCase")
- Review each file before writing

## Skill 2: `/bootstrap-discovery`

### Description

```yaml
name: bootstrap-discovery
description: Autonomous codebase analysis to generate .agents/prime/*.md docs.
  Use after /bootstrap on existing projects. Analyzes package manifests,
  file tree, code patterns, and docs to prefill project context.
```

### Prerequisite

Verify `.agents/prime/` exists. If not, prompt to run `/bootstrap` first.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  /bootstrap-discovery (main context)                │
│                                                     │
│  1. Validate prerequisites                          │
│  2. Spawn discovery subagent                        │
│  3. Receive findings                                │
│  4. Present each file for review                    │
│  5. Write approved files                            │
│  6. Update CLAUDE.md summaries                      │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Discovery Subagent (agents/discovery.md)           │
│                                                     │
│  Analyzes (in parallel where possible):             │
│  • Package manifests (package.json, pyproject.toml, │
│    Cargo.toml, go.mod, etc.)                        │
│  • File tree structure                              │
│  • Code patterns (imports, naming, error handling)  │
│  • Existing documentation (README, docs/)           │
│  • Config files (.eslintrc, tsconfig, etc.)         │
│  • Test structure and commands                      │
│                                                     │
│  Returns: Structured findings per target file       │
└─────────────────────────────────────────────────────┘
```

### Analysis → Output Mapping

| Analysis Source | Informs |
|-----------------|---------|
| Package manifests | STACK.md (runtime, deps, commands) |
| Directory tree | STRUCTURE.md (layout, key dirs) |
| Code patterns | CONVENTIONS.md (naming, imports) |
| README/docs | ARCHITECTURE.md (intent, components) |
| Config files | STACK.md (tooling), CONVENTIONS.md (style) |
| Test files | TESTING.md (structure, commands) |

### Review Flow

```
For each file in [STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING]:
  1. Show proposed content
  2. User can: approve / edit / regenerate / skip
  3. Write on approval
```

### Safety Rules

- Never read `.env`, credentials, or secrets
- Include file paths for every finding (e.g., `src/utils/auth.ts`)
- Mark low-confidence inferences explicitly

## Workflow Integration

```
bootstrap → bootstrap-wizard OR bootstrap-discovery → prime → research → design → ...
           └──────────────┬─────────────────────────┘
                    (optional prefill)
```

### Relationships

- `/bootstrap` — creates empty structure (unchanged)
- `/bootstrap-wizard` — fills via conversation
- `/bootstrap-discovery` — fills via code analysis
- `/prime` — loads filled docs into context (unchanged)

### Mix-and-Match

Users can:
- Run wizard for STACK, discovery for CONVENTIONS
- Run discovery first, then wizard to fill gaps
- Skip both and fill manually

## Target Files

Both skills write to the same template files:

- `.agents/prime/STACK.md`
- `.agents/prime/STRUCTURE.md`
- `.agents/prime/CONVENTIONS.md`
- `.agents/prime/ARCHITECTURE.md`
- `.agents/prime/TESTING.md`

Both update `.agents/CLAUDE.md` rules summary section with one-liners after each file is written.

## Next Steps

Run `/plan .agents/design/2026-03-01-bootstrap-prefill.md` to create implementation plan.
