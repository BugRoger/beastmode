# Design: Complete Migration from .agents to .beastmode

**Date**: 2026-03-04
**Status**: Approved

## Goal

Migrate all `.agents/` content to `.beastmode/` with proper L0/L1/L2 hierarchy, consolidating project artifacts into a single location while maintaining the progressive disclosure documentation system.

## Approach

Clean cutover migration that:
1. Rebuilds root `CLAUDE.md` with general instructions only
2. Moves `.agents/prime/META.md` to `.beastmode/META.md`
3. Merges `.agents/prime/` files into existing `.beastmode/context/` L2 files
4. Moves historical state artifacts (design/plan/release) to `.beastmode/state/`
5. Updates all skill paths to reference `.beastmode/`
6. Preserves gitignored session directories (status/, worktrees/)

## Architecture Overview

### Documentation Layers

- **Always Loaded**: Root `CLAUDE.md` (general, phase-agnostic instructions)
- **L0**: `.beastmode/PRODUCT.md` + `.beastmode/META.md` (product vision + system explanation)
- **L1**: Phase summary files in `.beastmode/context/` and `.beastmode/state/` (loaded by skills based on current phase)
- **L2**: Detail files (loaded on-demand via `@` imports from L1)

### Key Decisions

**1. CLAUDE.md Becomes Phase-Agnostic**
- **Rationale**: CLAUDE.md is always loaded regardless of phase; should only contain general instructions
- **Implementation**: Extract user preferences and general multi-agent rules; remove phase-specific content
- **Result**: `@.beastmode/META.md` and `@.beastmode/PRODUCT.md` as only imports

**2. Prime Files Merge Into Context L2 Files**
- **Rationale**: `.agents/prime/` and `.beastmode/context/` serve the same purpose (build knowledge); maintain existing L2 structure
- **Implementation**: Merge content from prime files into corresponding context L2 files, preserving structure
- **Result**: Single location for each knowledge domain (STACK, ARCHITECTURE, CONVENTIONS, etc.)

**3. State Artifacts Move to .beastmode/state/**
- **Rationale**: Historical feature work (designs, plans, releases) should live in `.beastmode/state/` per architecture
- **Implementation**: Move all `.agents/{design,plan,release}/*.md` to `.beastmode/state/{phase}/`
- **Result**: Unified state tracking in one location

**4. Session Data Stays in .agents/ (Gitignored)**
- **Rationale**: status/ and worktrees/ are session-specific, should not be version controlled
- **Implementation**: Leave in `.agents/` with existing `.gitignore` rules
- **Result**: Clean separation of persistent vs. ephemeral data

## Component Breakdown

### 1. Root CLAUDE.md (Rebuild)

**Source**: `.agents/CLAUDE.md` (extract user prefs + general rules)
**Destination**: Root `CLAUDE.md`

**New Content**:
```markdown
@.beastmode/META.md
@.beastmode/PRODUCT.md

# User Preferences
- Always refer to me as Michi
- When you see SessionStart hook output, display it as greeting

# General Instructions
[Multi-agent safety rules - no stash, no branch switching, cycle workflow]
```

### 2. META.md Migration

**Source**: `.agents/prime/META.md`
**Destination**: `.beastmode/META.md`

**Changes**:
- Update folder structure docs to reflect `.beastmode/` paths
- Update L0/L1/L2 hierarchy explanation
- Reference `.beastmode/context/` instead of `.agents/prime/`

### 3. Prime Files → Context Files (Merge)

**Merge Operations**:

| Source | Destination | Strategy |
|--------|-------------|----------|
| `.agents/prime/STACK.md` | `.beastmode/context/design/tech-stack.md` | Fill placeholders, preserve L2 structure |
| `.agents/prime/ARCHITECTURE.md` | `.beastmode/context/design/architecture.md` | Fill placeholders, preserve L2 structure |
| `.agents/prime/CONVENTIONS.md` | `.beastmode/context/plan/conventions.md` | Fill placeholders, preserve L2 structure |
| `.agents/prime/STRUCTURE.md` | `.beastmode/context/plan/structure.md` | Fill placeholders, preserve L2 structure |
| `.agents/prime/AGENTS.md` | `.beastmode/context/implement/agents.md` | Fill placeholders, preserve L2 structure |
| `.agents/prime/TESTING.md` | `.beastmode/context/implement/testing.md` | Fill placeholders, preserve L2 structure |

**Merge Rules**:
- Preserve existing L2 section headings (## Purpose, ## Core Stack, etc.)
- Fill placeholder sections with prime file content
- Deduplicate where both have real content (prefer `.beastmode/` if newer)
- Maintain L2 file conventions (UPPERCASE heading with full name)

### 4. State Files (Move)

**Move Operations**:
```bash
git mv .agents/design/*.md .beastmode/state/design/
git mv .agents/plan/*.md .beastmode/state/plan/
git mv .agents/release/*.md .beastmode/state/release/
```

**New Directories**:
- `.beastmode/state/research/` (if `.agents/research/` has content)

### 5. Preserved Directories

**Keep in `.agents/` (gitignored)**:
```
.agents/status/      # Session tracking
.agents/worktrees/   # Active work isolation
.agents/.gitignore   # Gitignore rules
```

### 6. Delete After Migration

**Directories to Remove**:
```bash
rm -rf .agents/CLAUDE.md    # Content moved to root + .beastmode/
rm -rf .agents/prime/       # Merged into .beastmode/context/
rm -rf .agents/design/      # Moved to .beastmode/state/design/
rm -rf .agents/plan/        # Moved to .beastmode/state/plan/
rm -rf .agents/release/     # Moved to .beastmode/state/release/
```

### 7. Skill Updates

**Files Requiring Path Changes**:

| Skill File | Current Path | New Path |
|------------|-------------|----------|
| `skills/design/phases/3-checkpoint.md` | `.agents/design/` | `.beastmode/state/design/` |
| `skills/plan/phases/3-checkpoint.md` | `.agents/plan/` | `.beastmode/state/plan/` |
| `skills/release/phases/3-checkpoint.md` | `.agents/release/` | `.beastmode/state/release/` |
| `skills/implement/phases/0-prime.md` | `.agents/plan/` | `.beastmode/state/plan/` |
| `skills/validate/phases/0-prime.md` | `.agents/` | `.beastmode/state/` |
| `skills/bootstrap/templates/CLAUDE.md` | `.agents/prime/` | `.beastmode/` |

**Search & Replace Pattern**:
```bash
# In all skill files
.agents/design/    → .beastmode/state/design/
.agents/plan/      → .beastmode/state/plan/
.agents/release/   → .beastmode/state/release/
.agents/prime/     → .beastmode/context/ (or .beastmode/META.md)
```

## Final Structure

```
beastmode/
├── CLAUDE.md                    # General instructions (always loaded)
├── .beastmode/
│   ├── META.md                  # L0: System explanation
│   ├── PRODUCT.md               # L0: Product vision
│   ├── state/                   # Feature state (kanban)
│   │   ├── DESIGN.md            # L1: Design phase summary
│   │   ├── design/              # L2: Design artifacts (17+ files)
│   │   ├── PLAN.md              # L1: Plan phase summary
│   │   ├── plan/                # L2: Plan artifacts (17+ files)
│   │   ├── IMPLEMENT.md         # L1: Implement phase summary
│   │   ├── VALIDATE.md          # L1: Validate phase summary
│   │   ├── RELEASE.md           # L1: Release phase summary
│   │   ├── release/             # L2: Release artifacts (6+ files)
│   │   └── research/            # L2: Research artifacts
│   ├── context/                 # Build knowledge
│   │   ├── DESIGN.md            # L1: Design context summary
│   │   ├── design/              # L2: architecture.md, tech-stack.md
│   │   ├── PLAN.md              # L1: Plan context summary
│   │   ├── plan/                # L2: conventions.md, structure.md
│   │   ├── IMPLEMENT.md         # L1: Implement context summary
│   │   ├── implement/           # L2: agents.md, testing.md
│   │   ├── VALIDATE.md          # L1: Validate context summary
│   │   ├── validate/            # L2: quality gates
│   │   ├── RELEASE.md           # L1: Release context summary
│   │   └── release/             # L2: versioning, changelog
│   └── meta/                    # Self-improvement
│       ├── DESIGN.md            # Phase learnings
│       ├── PLAN.md
│       ├── IMPLEMENT.md
│       ├── VALIDATE.md
│       └── RELEASE.md
└── .agents/                     # Session-only (gitignored)
    ├── .gitignore
    ├── status/                  # Current session tracking
    └── worktrees/               # Active work isolation
```

## Files Affected

**Root Level**:
- `CLAUDE.md` (rewritten)

**New/Modified in .beastmode/**:
- `.beastmode/META.md` (moved from `.agents/prime/`)
- `.beastmode/context/design/tech-stack.md` (merged)
- `.beastmode/context/design/architecture.md` (merged)
- `.beastmode/context/plan/conventions.md` (merged)
- `.beastmode/context/plan/structure.md` (merged)
- `.beastmode/context/implement/agents.md` (merged)
- `.beastmode/context/implement/testing.md` (merged)
- `.beastmode/state/design/` (17+ files moved)
- `.beastmode/state/plan/` (17+ files moved)
- `.beastmode/state/release/` (6+ files moved)

**Skills Updated**:
- `skills/design/phases/3-checkpoint.md`
- `skills/plan/phases/3-checkpoint.md`
- `skills/release/phases/3-checkpoint.md`
- `skills/implement/phases/0-prime.md`
- `skills/validate/phases/0-prime.md`
- `skills/bootstrap/templates/CLAUDE.md`

**Deleted**:
- `.agents/CLAUDE.md`
- `.agents/prime/` (entire directory)
- `.agents/design/` (after move)
- `.agents/plan/` (after move)
- `.agents/release/` (after move)

## Testing Strategy

### 1. Verify File Moves
```bash
# Check git preserves history
git log --follow .beastmode/state/design/2026-03-04-task-runner.md

# Verify all files moved
ls -la .beastmode/state/design/ | wc -l  # Should be 17+
ls -la .beastmode/state/plan/ | wc -l    # Should be 17+
ls -la .beastmode/state/release/ | wc -l # Should be 6+
```

### 2. Test Context Merges
```bash
# Verify L2 files have real content (no placeholders)
grep -E '\[placeholder\]|\[command\]' .beastmode/context/design/tech-stack.md
grep -E '\[placeholder\]|\[command\]' .beastmode/context/plan/conventions.md

# Should return no matches
```

### 3. Test Skill Execution
```bash
# Test each phase skill writes to correct location
/design "test feature"
ls -la .beastmode/state/design/2026-03-04-test-feature.md

/plan .beastmode/state/design/2026-03-04-test-feature.md
ls -la .beastmode/state/plan/2026-03-04-test-feature.md
```

### 4. Validate CLAUDE.md Loading
- Start new session
- Verify META.md content is loaded (check for L0/L1/L2 terminology in responses)
- Verify user preferences work ("call me Michi")

### 5. Test L1/L2 Imports
```bash
# Verify @imports resolve
cat .beastmode/context/DESIGN.md  # Should have @design/architecture.md
cat .beastmode/context/PLAN.md    # Should have @plan/conventions.md
```

## Trade-offs

### Benefits
- **Single source of truth**: All project artifacts in `.beastmode/`
- **Clean L0/L1/L2 hierarchy**: Phase-agnostic CLAUDE.md, progressive disclosure via imports
- **Simplified mental model**: No confusion between `.agents/` and `.beastmode/`
- **Git history preserved**: All moves tracked with `git mv`
- **Clear boundaries**: Session data (gitignored) vs. persistent artifacts (version controlled)

### Risks
- **Large changeset**: ~50+ file operations (moves + merges + skill updates)
- **Skill path coupling**: All skills need updates; any missed reference breaks workflow
- **External tool breakage**: Any scripts/tools referencing `.agents/` paths will break
- **Merge conflicts**: Prime file merges could lose content if not careful
- **Testing overhead**: Need to test all workflow phases after migration

### Mitigation
- Use `git mv` to preserve history
- Test each skill independently after path updates
- Grep for `.agents/` references before declaring complete
- Manual review of merged context files for lost content
- Document migration in changelog for external tool maintainers
