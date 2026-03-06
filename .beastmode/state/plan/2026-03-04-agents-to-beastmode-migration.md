# Plan: Complete Migration from .agents to .beastmode

**Date**: 2026-03-04
**Design**: [.agents/design/2026-03-04-agents-to-beastmode-migration.md](../design/2026-03-04-agents-to-beastmode-migration.md)
**Status**: Ready for Implementation

## Overview

This plan migrates all `.agents/` content to `.beastmode/` with proper L0/L1/L2 hierarchy. The migration consolidates project artifacts into a single location while maintaining the progressive disclosure documentation system.

**Key Changes**:
- Root `CLAUDE.md` becomes phase-agnostic (general instructions only)
- `.agents/prime/` files merge into `.beastmode/context/` L2 files
- Historical state artifacts move to `.beastmode/state/`
- Session data stays gitignored in `.agents/`

## Tasks

### Task 1: Rebuild Root CLAUDE.md

Extract user preferences and general instructions from `.agents/CLAUDE.md`, create new phase-agnostic root `CLAUDE.md`.

#### 1.1 Read Source Content

```bash
# Read the current .agents/CLAUDE.md
cat .agents/CLAUDE.md
```

Extract:
- User preferences ("call me Michi", session banner)
- General multi-agent safety rules
- Cycle workflow rules

#### 1.2 Create New Root CLAUDE.md

```bash
# Backup existing root CLAUDE.md
cp CLAUDE.md CLAUDE.md.backup

# Write new CLAUDE.md
cat > CLAUDE.md << 'EOF'
@.beastmode/META.md
@.beastmode/PRODUCT.md

# User Preferences

- Always refer to me as Michi
- When you see SessionStart hook output in your system context, display it as a greeting at the start of the conversation

# General Instructions

## Multi-Agent Safety

- **High-confidence answers only**: ALWAYS verify in code; NEVER guess
- **Multi-agent safety**: NEVER create/apply/drop git stash entries unless explicitly requested
- **Multi-agent safety**: ALWAYS assume other agents may be working; keep unrelated WIP untouched
- **Multi-agent safety**: NEVER create/remove/modify git worktrees unless explicitly requested (Exception: Skills manage worktrees as part of cycle workflow)
- **Multi-agent safety**: NEVER switch branches unless explicitly requested

## Cycle Workflow

- **Branch naming**: `cycle/<topic>` — created by /design, used by all phases, cleaned by /release
- **Single unified commit**: Design creates worktree, phases inherit it, /release commits all changes + merges + cleans
- **No interim commits**: Worktree provides WIP isolation; phases write artifacts but don't commit
EOF
```

#### 1.3 Verify New Content

```bash
# Check new CLAUDE.md structure
cat CLAUDE.md

# Verify it's under 50 lines (general instructions only)
wc -l CLAUDE.md
```

**Expected**: ~30 lines, no phase-specific references, only `@.beastmode/` imports.

---

### Task 2: Migrate META.md

Move `.agents/prime/META.md` to `.beastmode/META.md` and update references.

#### 2.1 Move META.md File

```bash
# Move with git to preserve history
git mv .agents/prime/META.md .beastmode/META.md
```

#### 2.2 Update META.md Content

Read the file and update the folder structure section:

```bash
# Edit .beastmode/META.md
```

**Find and replace**:

Old:
```markdown
## Folder Structure

```
.agents/
├── CLAUDE.md       # <200 lines, summary + @imports
├── prime/          # Reference material (loaded by /prime)
├── research/       # Discovery, exploration
├── design/         # Specs, brainstorming output
├── plan/           # Implementation plans
├── status/         # Current state, milestones
├── release/        # Changelogs, release notes
├── templates/      # Artifact templates
└── worktrees/      # Isolated git worktrees (gitignored)
```
```

New:
```markdown
## Folder Structure

```
.beastmode/
├── META.md          # L0: System explanation
├── PRODUCT.md       # L0: Product vision
├── state/           # Feature state (kanban)
│   ├── DESIGN.md    # L1: Design phase summary
│   ├── design/      # L2: Design artifacts
│   ├── PLAN.md      # L1: Plan phase summary
│   ├── plan/        # L2: Plan artifacts
│   ├── IMPLEMENT.md # L1: Implement phase summary
│   ├── VALIDATE.md  # L1: Validate phase summary
│   ├── RELEASE.md   # L1: Release phase summary
│   ├── release/     # L2: Release artifacts
│   └── research/    # L2: Research artifacts
├── context/         # Build knowledge
│   ├── DESIGN.md    # L1: Design context summary
│   ├── design/      # L2: architecture.md, tech-stack.md
│   ├── PLAN.md      # L1: Plan context summary
│   ├── plan/        # L2: conventions.md, structure.md
│   ├── IMPLEMENT.md # L1: Implement context summary
│   ├── implement/   # L2: agents.md, testing.md
│   ├── VALIDATE.md  # L1: Validate context summary
│   ├── validate/    # L2: quality gates
│   ├── RELEASE.md   # L1: Release context summary
│   └── release/     # L2: versioning, changelog
└── meta/            # Self-improvement
    ├── DESIGN.md    # Phase learnings
    ├── PLAN.md
    ├── IMPLEMENT.md
    ├── VALIDATE.md
    └── RELEASE.md

.agents/             # Session-only (gitignored)
├── .gitignore
├── status/          # Current session tracking
└── worktrees/       # Active work isolation
```
```

#### 2.3 Update L0/L1/L2 References

In `.beastmode/META.md`, update any `.agents/prime/` references to `.beastmode/context/`.

#### 2.4 Verify META.md

```bash
# Check updated content
cat .beastmode/META.md

# Verify no .agents/prime references remain
grep -n "\.agents/prime" .beastmode/META.md
```

**Expected**: No matches.

---

### Task 3: Merge Prime Files Into Context L2 Files

Merge content from 6 `.agents/prime/` files into corresponding `.beastmode/context/` L2 files.

#### 3.1 Merge STACK.md → tech-stack.md

**Source**: `.agents/prime/STACK.md`
**Destination**: `.beastmode/context/design/tech-stack.md`

```bash
# Read source
cat .agents/prime/STACK.md

# Read destination
cat .beastmode/context/design/tech-stack.md
```

**Merge Strategy**:
1. Open `.beastmode/context/design/tech-stack.md` for editing
2. Keep existing structure (## Purpose, ## Core Stack, ## Key Dependencies, etc.)
3. Replace `[placeholder]` sections with content from `.agents/prime/STACK.md`
4. Deduplicate where both files have real content (prefer `.beastmode/` version if newer)
5. Ensure "# STACK - Technology Stack" heading is preserved

**Example Result**:
```markdown
# STACK - Technology Stack

## Purpose

Documents the technology stack, dependencies, and versions used in this project.

## Core Stack

**Platform:**
- Framework: Claude Code plugin system
- Language: Markdown + YAML frontmatter (for skill definitions)
- Distribution: Claude Code marketplace

**Architecture:**
- Type: Agentic workflow system (not a traditional application)
- Execution model: Multi-step workflow with parallel agent spawning
- Interface: Claude Code `/skills` command system

## Key Dependencies

Beastmode is a meta-framework for Claude Code — it doesn't have traditional package dependencies. Instead, it defines:

| Component | Purpose |
|-----------|---------|
| Claude Code CLI | Host environment and skill execution runtime |
| Anthropic Claude API | LLM backend (via Claude Code) |
| Git | Version control and worktree isolation for `/implement` phase |
| Markdown + YAML | Documentation format and skill metadata |

## Development Tools

**Build:**
- None required — markdown/YAML files are interpreted directly

**Testing:**
- Manual testing via `/skills` command invocation

**Linting:**
- No automated linting configured
- Manual review of markdown and prompt quality

## Commands

```bash
# Install plugin
/plugin marketplace add bugroger/overrides-marketplace
/plugin install beastmode@overrides-marketplace

# Initialize project with beastmode
/bootstrap

# Discover and populate prime documentation
/bootstrap-discovery

# Run core workflow phases
/design
/plan
/implement
/validate
/release

# Standalone utilities
/status
```

## Notes

- **No runtime dependencies:** Beastmode is a workflow/documentation system, not an executable application
- **Self-bootstrapping:** Uses its own skills to analyze and document codebases
- **Markdown-first:** All documentation and skill prompts are written in markdown
- **Parallel execution:** bootstrap-discovery spawns 5 Explore agents simultaneously
- **Version:** 0.1.16 (from plugin.json)
- **Author:** bugroger (github: BugRoger)
```

#### 3.2 Merge ARCHITECTURE.md → architecture.md

**Source**: `.agents/prime/ARCHITECTURE.md`
**Destination**: `.beastmode/context/design/architecture.md`

```bash
# Read source
cat .agents/prime/ARCHITECTURE.md

# Read destination
cat .beastmode/context/design/architecture.md
```

**Merge Strategy**: Same as 3.1 — preserve L2 structure, fill placeholders, deduplicate content.

**Key Sections to Preserve**:
- ## Purpose
- ## Overview
- ## Components
- ## Data Flow
- ## Key Decisions
- ## Boundaries

#### 3.3 Merge CONVENTIONS.md → conventions.md

**Source**: `.agents/prime/CONVENTIONS.md`
**Destination**: `.beastmode/context/plan/conventions.md`

```bash
# Read source
cat .agents/prime/CONVENTIONS.md

# Read destination
cat .beastmode/context/plan/conventions.md
```

**Merge Strategy**: Same as 3.1 — preserve L2 structure, fill placeholders, deduplicate content.

**Key Sections to Preserve**:
- ## Purpose
- ## Naming
- ## Code Style
- ## Patterns
- ## Anti-Patterns

#### 3.4 Merge STRUCTURE.md → structure.md

**Source**: `.agents/prime/STRUCTURE.md`
**Destination**: `.beastmode/context/plan/structure.md`

```bash
# Read source
cat .agents/prime/STRUCTURE.md

# Read destination
cat .beastmode/context/plan/structure.md
```

**Merge Strategy**: Same as 3.1 — preserve L2 structure, fill placeholders, update directory tree to reflect new `.beastmode/` structure.

**Key Update**: Directory layout section should show final `.beastmode/` structure (not `.agents/`).

#### 3.5 Merge AGENTS.md → agents.md

**Source**: `.agents/prime/AGENTS.md`
**Destination**: `.beastmode/context/implement/agents.md`

```bash
# Read source
cat .agents/prime/AGENTS.md

# Read destination
cat .beastmode/context/implement/agents.md
```

**Merge Strategy**: Same as 3.1 — preserve L2 structure, fill placeholders, deduplicate content.

**Key Sections to Preserve**:
- ## Purpose
- ## Core Rules
- ## Git Workflow
- ## Worktree Workflow
- ## Cycle Workflow
- ## Refactoring
- ## Reports

#### 3.6 Merge TESTING.md → testing.md

**Source**: `.agents/prime/TESTING.md`
**Destination**: `.beastmode/context/implement/testing.md`

```bash
# Read source
cat .agents/prime/TESTING.md

# Read destination
cat .beastmode/context/implement/testing.md
```

**Merge Strategy**: Same as 3.1 — preserve L2 structure, fill placeholders, deduplicate content.

**Key Sections to Preserve**:
- ## Purpose
- ## Test Commands
- ## Test Structure
- ## Conventions
- ## Coverage

#### 3.7 Verify All Merges

```bash
# Check no placeholders remain
grep -rn "\[placeholder\]" .beastmode/context/design/
grep -rn "\[placeholder\]" .beastmode/context/plan/
grep -rn "\[placeholder\]" .beastmode/context/implement/

# Check no [command] patterns remain
grep -rn "\[command\]" .beastmode/context/

# Verify all files have substantive content
wc -l .beastmode/context/design/tech-stack.md
wc -l .beastmode/context/design/architecture.md
wc -l .beastmode/context/plan/conventions.md
wc -l .beastmode/context/plan/structure.md
wc -l .beastmode/context/implement/agents.md
wc -l .beastmode/context/implement/testing.md
```

**Expected**: All files >50 lines, no placeholder patterns.

---

### Task 4: Move State Artifacts

Move historical design/plan/release files from `.agents/` to `.beastmode/state/`.

#### 4.1 Count Files to Move

```bash
# Count design files
ls -1 .agents/design/*.md | wc -l

# Count plan files
ls -1 .agents/plan/*.md | wc -l

# Count release files
ls -1 .agents/release/*.md | wc -l
```

**Expected**: 17+ design, 17+ plan, 6+ release files.

#### 4.2 Move Design Files

```bash
# Create state/design directory if not exists
mkdir -p .beastmode/state/design

# Move all design files (preserving git history)
for file in .agents/design/*.md; do
  filename=$(basename "$file")
  git mv "$file" ".beastmode/state/design/$filename"
done
```

#### 4.3 Move Plan Files

```bash
# Create state/plan directory if not exists
mkdir -p .beastmode/state/plan

# Move all plan files
for file in .agents/plan/*.md; do
  filename=$(basename "$file")
  git mv "$file" ".beastmode/state/plan/$filename"
done
```

#### 4.4 Move Release Files

```bash
# Create state/release directory if not exists
mkdir -p .beastmode/state/release

# Move all release files
for file in .agents/release/*.md; do
  filename=$(basename "$file")
  git mv "$file" ".beastmode/state/release/$filename"
done
```

#### 4.5 Check for Research Directory

```bash
# Check if .agents/research exists and has content
if [ -d ".agents/research" ] && [ "$(ls -A .agents/research)" ]; then
  echo "Research directory has content - needs migration"
  ls -la .agents/research/

  # Create state/research directory
  mkdir -p .beastmode/state/research

  # Move all research files
  for file in .agents/research/*.md; do
    filename=$(basename "$file")
    git mv "$file" ".beastmode/state/research/$filename"
  done
else
  echo "No research directory or empty - skip"
fi
```

#### 4.6 Verify Moves

```bash
# Count files in new locations
echo "Design files: $(ls -1 .beastmode/state/design/*.md 2>/dev/null | wc -l)"
echo "Plan files: $(ls -1 .beastmode/state/plan/*.md 2>/dev/null | wc -l)"
echo "Release files: $(ls -1 .beastmode/state/release/*.md 2>/dev/null | wc -l)"

# Verify old directories are empty
ls -la .agents/design/ | grep "\.md$" || echo "✓ design/ empty"
ls -la .agents/plan/ | grep "\.md$" || echo "✓ plan/ empty"
ls -la .agents/release/ | grep "\.md$" || echo "✓ release/ empty"

# Check git history preserved
git log --follow .beastmode/state/design/2026-03-04-task-runner.md | head -10
```

**Expected**: All files moved, git history intact.

---

### Task 5: Update Skill Paths

Update 6+ skill files to reference `.beastmode/state/` instead of `.agents/`.

#### 5.1 List Skill Files to Update

```bash
# Find all skill files that reference .agents/ paths
grep -rn "\.agents/design\|\.agents/plan\|\.agents/release\|\.agents/prime" skills/ | grep -v ".git"
```

**Expected Files**:
- `skills/design/phases/3-checkpoint.md`
- `skills/plan/phases/3-checkpoint.md`
- `skills/release/phases/3-checkpoint.md`
- `skills/implement/phases/0-prime.md`
- `skills/validate/phases/0-prime.md`
- `skills/bootstrap/templates/CLAUDE.md`
- Potentially others

#### 5.2 Update Design Skill

**File**: `skills/design/phases/3-checkpoint.md`

```bash
# Edit skills/design/phases/3-checkpoint.md
```

**Find**:
```markdown
Save to `.agents/design/YYYY-MM-DD-<topic>.md`
```

**Replace**:
```markdown
Save to `.beastmode/state/design/YYYY-MM-DD-<topic>.md`
```

**Find**:
```markdown
Update `.agents/status/YYYY-MM-DD-<topic>.md`:
```

**Replace** (status stays in .agents):
```markdown
Update `.agents/status/YYYY-MM-DD-<topic>.md`:
```

(Keep status references as-is — session data stays in .agents)

#### 5.3 Update Plan Skill

**File**: `skills/plan/phases/3-checkpoint.md`

```bash
# Edit skills/plan/phases/3-checkpoint.md
```

**Find**:
```markdown
Save to `.agents/plan/YYYY-MM-DD-<topic>.md`
```

**Replace**:
```markdown
Save to `.beastmode/state/plan/YYYY-MM-DD-<topic>.md`
```

#### 5.4 Update Release Skill

**File**: `skills/release/phases/3-checkpoint.md`

```bash
# Edit skills/release/phases/3-checkpoint.md
```

**Find**:
```markdown
Save to `.agents/release/YYYY-MM-DD-<topic>.md`
```

**Replace**:
```markdown
Save to `.beastmode/state/release/YYYY-MM-DD-<topic>.md`
```

#### 5.5 Update Implement Skill (Prime Phase)

**File**: `skills/implement/phases/0-prime.md`

```bash
# Edit skills/implement/phases/0-prime.md
```

**Find** (if present):
```markdown
Read (if they exist):
- `.agents/plan/YYYY-MM-DD-<topic>.md`
```

**Replace**:
```markdown
Read (if they exist):
- `.beastmode/state/plan/YYYY-MM-DD-<topic>.md`
```

#### 5.6 Update Validate Skill (Prime Phase)

**File**: `skills/validate/phases/0-prime.md`

```bash
# Edit skills/validate/phases/0-prime.md
```

**Find** (if present):
```markdown
- `.agents/design/`
- `.agents/plan/`
```

**Replace**:
```markdown
- `.beastmode/state/design/`
- `.beastmode/state/plan/`
```

#### 5.7 Update Bootstrap Templates

**File**: `skills/bootstrap/templates/CLAUDE.md`

```bash
# Edit skills/bootstrap/templates/CLAUDE.md
```

**Find**:
```markdown
@.agents/prime/META.md
```

**Replace**:
```markdown
@.beastmode/META.md
@.beastmode/PRODUCT.md
```

**Find** (if present):
```markdown
See .agents/prime/STACK.md
See .agents/prime/ARCHITECTURE.md
```

**Replace**:
```markdown
See .beastmode/context/design/tech-stack.md
See .beastmode/context/design/architecture.md
```

#### 5.8 Global Search for Missed References

```bash
# Search all skill files for remaining .agents/ references (excluding .gitignore patterns)
grep -rn "\.agents/design\|\.agents/plan\|\.agents/release\|\.agents/prime" skills/ \
  | grep -v "\.agents/status" \
  | grep -v "\.agents/worktrees" \
  | grep -v ".git"
```

**Expected**: No matches (all references updated).

If matches found, manually update each file following the pattern:
- `.agents/design/` → `.beastmode/state/design/`
- `.agents/plan/` → `.beastmode/state/plan/`
- `.agents/release/` → `.beastmode/state/release/`
- `.agents/prime/` → `.beastmode/context/` or `.beastmode/META.md`

#### 5.9 Verify Skill Updates

```bash
# Check updated files reference new paths
grep -n "\.beastmode/state" skills/design/phases/3-checkpoint.md
grep -n "\.beastmode/state" skills/plan/phases/3-checkpoint.md
grep -n "\.beastmode/state" skills/release/phases/3-checkpoint.md

# Verify status references still point to .agents (correct)
grep -n "\.agents/status" skills/design/phases/3-checkpoint.md
```

---

### Task 6: Clean Up Legacy Directories

Remove empty `.agents/` subdirectories after migration (keep status/ and worktrees/).

#### 6.1 Remove .agents/CLAUDE.md

```bash
# Verify content moved to root CLAUDE.md
diff .agents/CLAUDE.md CLAUDE.md || echo "Content diverged - review manually"

# Remove .agents/CLAUDE.md
git rm .agents/CLAUDE.md
```

#### 6.2 Remove .agents/prime/ Directory

```bash
# Verify directory is now empty (content merged to .beastmode/context/)
ls -la .agents/prime/

# Remove directory
git rm -r .agents/prime/
```

#### 6.3 Remove .agents/design/ Directory

```bash
# Verify directory is empty (content moved to .beastmode/state/design/)
ls -la .agents/design/

# Should only show . and .. (empty)
# Remove directory
rmdir .agents/design/
```

#### 6.4 Remove .agents/plan/ Directory

```bash
# Verify empty
ls -la .agents/plan/

# Remove directory
rmdir .agents/plan/
```

#### 6.5 Remove .agents/release/ Directory

```bash
# Verify empty
ls -la .agents/release/

# Remove directory
rmdir .agents/release/
```

#### 6.6 Remove .agents/research/ Directory (if exists and empty)

```bash
# Check if exists
if [ -d ".agents/research" ]; then
  # Verify empty
  ls -la .agents/research/

  # Remove if empty
  rmdir .agents/research/ 2>/dev/null || echo "Directory not empty - review manually"
fi
```

#### 6.7 Verify Final .agents/ Structure

```bash
# List remaining .agents/ contents
ls -la .agents/

# Should only show:
# - .gitignore
# - status/ (gitignored)
# - worktrees/ (gitignored)
```

**Expected Structure**:
```
.agents/
├── .gitignore
├── status/      # Session tracking (gitignored)
└── worktrees/   # Active work (gitignored)
```

---

### Task 7: Verification & Testing

Run comprehensive tests to verify migration success.

#### 7.1 Verify File Moves (Git History)

```bash
# Check git preserves history for moved files
git log --follow --oneline .beastmode/state/design/2026-03-04-task-runner.md | head -5
git log --follow --oneline .beastmode/state/plan/2026-03-01-prime-makeover.md | head -5
git log --follow --oneline .beastmode/state/release/2026-03-01-v0.1.7.md | head -5

# Should show commit history from before the move
```

**Expected**: Commit history visible, authored by original contributors.

#### 7.2 Count Migrated Files

```bash
# Verify file counts match expectations
echo "Design: $(ls -1 .beastmode/state/design/*.md 2>/dev/null | wc -l) (expected: 17+)"
echo "Plan: $(ls -1 .beastmode/state/plan/*.md 2>/dev/null | wc -l) (expected: 17+)"
echo "Release: $(ls -1 .beastmode/state/release/*.md 2>/dev/null | wc -l) (expected: 6+)"
```

#### 7.3 Test Context Merges (No Placeholders)

```bash
# Verify L2 files have real content (no placeholders)
echo "Checking for placeholders..."
grep -rn "\[placeholder\]" .beastmode/context/ && echo "❌ Placeholders found!" || echo "✓ No placeholders"

grep -rn "\[command\]" .beastmode/context/ && echo "❌ Command placeholders found!" || echo "✓ No command placeholders"

# Check files have substantive content (>50 lines)
echo ""
echo "File sizes:"
wc -l .beastmode/context/design/tech-stack.md
wc -l .beastmode/context/design/architecture.md
wc -l .beastmode/context/plan/conventions.md
wc -l .beastmode/context/plan/structure.md
wc -l .beastmode/context/implement/agents.md
wc -l .beastmode/context/implement/testing.md
```

**Expected**: No placeholder patterns, all files >50 lines.

#### 7.4 Test CLAUDE.md Loading

```bash
# Check root CLAUDE.md imports
cat CLAUDE.md

# Should show:
# @.beastmode/META.md
# @.beastmode/PRODUCT.md
# User Preferences section
# General Instructions section
```

**Verify**:
- File is <50 lines
- Only contains general, phase-agnostic instructions
- No references to `.agents/prime/`

#### 7.5 Test L1/L2 Import Structure

```bash
# Verify L1 files reference L2 files correctly
echo "DESIGN.md imports:"
grep "@" .beastmode/context/DESIGN.md

echo ""
echo "PLAN.md imports:"
grep "@" .beastmode/context/PLAN.md

echo ""
echo "IMPLEMENT.md imports:"
grep "@" .beastmode/context/IMPLEMENT.md
```

**Expected**:
- `DESIGN.md` imports `@design/architecture.md`, `@design/tech-stack.md`
- `PLAN.md` imports `@plan/conventions.md`, `@plan/structure.md`
- `IMPLEMENT.md` imports `@implement/agents.md`, `@implement/testing.md`

#### 7.6 Verify Skill Path Updates

```bash
# Check skills reference new paths
echo "Design skill:"
grep "\.beastmode/state" skills/design/phases/3-checkpoint.md

echo ""
echo "Plan skill:"
grep "\.beastmode/state" skills/plan/phases/3-checkpoint.md

echo ""
echo "Release skill:"
grep "\.beastmode/state" skills/release/phases/3-checkpoint.md

# Verify no old .agents/ references remain (except status/worktrees)
echo ""
echo "Checking for old references..."
grep -rn "\.agents/design\|\.agents/plan\|\.agents/release\|\.agents/prime" skills/ \
  | grep -v "\.agents/status" \
  | grep -v "\.agents/worktrees" \
  | grep -v ".git" \
  && echo "❌ Old references found!" || echo "✓ No old references"
```

**Expected**: All skills reference `.beastmode/state/`, no old `.agents/` references.

#### 7.7 Verify .agents/ Cleanup

```bash
# Check .agents/ only has gitignored session directories
ls -la .agents/

# Should show:
# .gitignore
# status/ (directory)
# worktrees/ (directory)
# NO: CLAUDE.md, prime/, design/, plan/, release/
```

#### 7.8 Test Git Status

```bash
# Check what's staged/changed
git status

# Should show:
# - Modified: CLAUDE.md (rewritten)
# - Modified: .beastmode/META.md (updated structure)
# - Modified: 6 .beastmode/context files (merges)
# - Renamed: 40+ files (.agents/* → .beastmode/state/*)
# - Deleted: .agents/CLAUDE.md, .agents/prime/
# - Modified: 6+ skill files (path updates)
```

#### 7.9 Manual Smoke Test (After Merge to Main)

**After `/release` merges to main**:

```bash
# In a fresh session on main branch:

# Test 1: Design skill writes to new location
/design "test migration feature"
ls -la .beastmode/state/design/ | grep "test-migration-feature"

# Test 2: Plan skill reads from new location
/plan .beastmode/state/design/YYYY-MM-DD-test-migration-feature.md
ls -la .beastmode/state/plan/ | grep "test-migration-feature"

# Test 3: User preferences work
# (Check that Claude addresses you as "Michi" in responses)

# Test 4: META.md loaded
# (Check responses reference L0/L1/L2 terminology)
```

**Expected**: All skills work with new paths, user preferences active, META.md concepts visible.

---

## Summary

This plan covers:
1. ✅ Root CLAUDE.md rebuild (phase-agnostic)
2. ✅ META.md migration to .beastmode/
3. ✅ 6 prime file merges into context L2 files
4. ✅ 40+ state artifact moves (design/plan/release)
5. ✅ 6+ skill file path updates
6. ✅ Legacy directory cleanup
7. ✅ Comprehensive verification tests

**Total Operations**: ~60 file operations (1 rewrite, 1 move, 6 merges, 40+ moves, 6+ updates, 5 deletions)

**Git Commands Used**:
- `git mv` for all moves (preserves history)
- Manual edits for merges and updates
- `git rm` for deletions

**Testing Strategy**:
- Automated checks (grep, wc, ls)
- Git history verification
- Manual smoke tests post-merge

**Next Step**: `/implement` to execute this plan in the cycle worktree.
