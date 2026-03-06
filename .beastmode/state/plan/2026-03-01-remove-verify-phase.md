# Remove Verify Phase Implementation Plan

**Goal:** Remove the `/verify` phase and simplify workflow to 6-phase core with standalone utilities.

**Architecture:** Delete `skills/verify/` folder, update workflow strings in README and prime docs, remove `## Workflow` sections from all skill files, update implement handoff to suggest `/release`.

**Tech Stack:** Markdown editing, git

**Design Doc:** [.agents/design/2026-03-01-remove-verify-phase.md](.agents/design/2026-03-01-remove-verify-phase.md)

---

## Task 0: Delete verify skill

**Files:**
- Delete: `skills/verify/SKILL.md`
- Delete: `skills/verify/` (directory)

**Step 1: Delete the verify skill directory**

Run: `rm -rf skills/verify`

**Step 2: Verify deletion**

Run: `ls skills/ | grep verify`
Expected: No output (directory gone)

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove verify skill"
```

---

## Task 1: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Update workflow diagram (line 12)**

Replace:
```
/prime → /research → /design → /plan → /implement → /verify → /retro
```

With:
```
/prime → /design → /plan → /implement → /release → /retro
```

**Step 2: Update workflow description (lines 15-21)**

Replace:
```markdown
**Quick fix?** Prime, build, done.

**New feature?** Research the domain. Design the approach. Plan the tasks. Build. Verify. Learn.

**Multi-session project?** Each phase writes artifacts to `.agents/`. Next session, `/prime` restores context. Pick up where you left off.

**Every project?** `/retro` feeds learnings back into your agent instructions. Knowledge compounds automatically.
```

With:
```markdown
**Quick fix?** Prime, implement, done.

**New feature?** Design the approach. Plan the tasks. Implement. Release. Learn.

**Multi-session project?** Each phase writes artifacts to `.agents/`. Next session, `/prime` restores context. Pick up where you left off.

**Every project?** `/retro` feeds learnings back into your agent instructions. Knowledge compounds automatically.
```

**Step 3: Reorganize skill table (lines 23-32)**

Replace the entire table with two tables:

```markdown
### Core Workflow

| Skill | Purpose |
|-------|---------|
| `/prime` | Load project context into session |
| `/design` | Think through the approach |
| `/plan` | Turn design into implementation tasks |
| `/implement` | Execute the plan, write the code |
| `/release` | Create changelog and release notes |
| `/retro` | Capture learnings for next time |

### Utilities

| Skill | Purpose |
|-------|---------|
| `/bootstrap` | Initialize project with .agents/ structure |
| `/research` | Explore domain when needed |
| `/status` | Track project state and milestones |
```

**Step 4: Update folder structure (lines 52-68)**

Replace:
```
.agents/
├── CLAUDE.md           # Project brain (<200 lines)
├── prime/              # Context loaded every session
│   ├── META.md         # How to maintain these docs
│   ├── AGENTS.md       # Multi-agent coordination
│   ├── STACK.md        # Tech stack
│   ├── STRUCTURE.md    # Directory layout
│   ├── CONVENTIONS.md  # Naming patterns
│   ├── ARCHITECTURE.md # System design
│   └── TESTING.md      # Test strategy
├── research/           # Domain exploration
├── design/             # Feature brainstorms, specs
├── plan/               # Implementation tasks
├── status/             # Current state
├── verify/             # Test reports
└── release/            # Changelogs
```

With:
```
.agents/
├── CLAUDE.md           # Project brain (<200 lines)
├── prime/              # Context loaded every session
│   ├── META.md         # How to maintain these docs
│   ├── AGENTS.md       # Multi-agent coordination
│   ├── STACK.md        # Tech stack
│   ├── STRUCTURE.md    # Directory layout
│   ├── CONVENTIONS.md  # Naming patterns
│   ├── ARCHITECTURE.md # System design
│   └── TESTING.md      # Test strategy
├── research/           # Domain exploration
├── design/             # Feature brainstorms, specs
├── plan/               # Implementation tasks
├── status/             # Current state
└── release/            # Changelogs
```

**Step 5: Update "Why This Works" section (line 75)**

Replace:
```markdown
**Proven workflow.** Research before design. Design before code. Verify before ship. Old wisdom, applied to AI coding.
```

With:
```markdown
**Proven workflow.** Design before code. Plan before build. Old wisdom, applied to AI coding.
```

**Step 6: Update status table (lines 92-103)**

Replace:
```markdown
| Skill | Ready |
|-------|-------|
| `/bootstrap` | ✅ |
| `/prime` | ✅ |
| `/design` | ✅ |
| `/plan` | ✅ |
| `/retro` | ✅ |
| `/research` | 🚧 |
| `/implement` | 🚧 |
| `/status` | 🚧 |
| `/verify` | 🚧 |
| `/release` | 🚧 |
```

With:
```markdown
| Skill | Ready |
|-------|-------|
| `/bootstrap` | ✅ |
| `/prime` | ✅ |
| `/design` | ✅ |
| `/plan` | ✅ |
| `/implement` | 🚧 |
| `/release` | 🚧 |
| `/retro` | ✅ |
| `/research` | 🚧 |
| `/status` | 🚧 |
```

**Step 7: Commit**

```bash
git add README.md
git commit -m "docs: update README with 6-phase workflow"
```

---

## Task 2: Update .agents/CLAUDE.md

**Files:**
- Modify: `.agents/CLAUDE.md:31`

**Step 1: Update workflow reference**

Replace:
```markdown
- Seven-phase workflow (prime → research → design → plan → implement → verify → retro) with .agents/ persistence
```

With:
```markdown
- Six-phase workflow (prime → design → plan → implement → release → retro) with .agents/ persistence
```

**Step 2: Commit**

```bash
git add .agents/CLAUDE.md
git commit -m "docs: update CLAUDE.md workflow to 6-phase"
```

---

## Task 3: Update .agents/prime/ARCHITECTURE.md

**Files:**
- Modify: `.agents/prime/ARCHITECTURE.md`

**Step 1: Update overview (line 9)**

Replace:
```markdown
Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured seven-phase workflow (prime → research → design → plan → implement → verify → retro) that scales from quick fixes to deep feature work, enabling Claude agents to systematically explore, design, and implement features while maintaining comprehensive project context across sessions through .agents/ artifact storage.
```

With:
```markdown
Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured six-phase workflow (prime → design → plan → implement → release → retro) with standalone utilities (/bootstrap, /research, /status) that scales from quick fixes to deep feature work, enabling Claude agents to systematically design and implement features while maintaining comprehensive project context across sessions through .agents/ artifact storage.
```

**Step 2: Delete Verify Skill component (lines 58-61)**

Delete these lines:
```markdown
**Verify Skill:**
- Purpose: Run verification and create test reports
- Location: `/skills/verify/`
- Dependencies: Test infrastructure, .agents/verify/ directory
```

**Step 3: Update data flow diagram (line 92)**

Replace:
```markdown
.agents/ artifact storage (research/, design/, plan/, status/, verify/, release/)
```

With:
```markdown
.agents/ artifact storage (research/, design/, plan/, status/, release/)
```

**Step 4: Update Key Decisions section (lines 118-121)**

Replace:
```markdown
**Seven-Phase Workflow:**
- Context: Need to support both quick fixes and deep features without overhead
- Decision: Linear workflow (prime → research → design → plan → implement → verify → retro) where each phase is optional
- Rationale: Matches real engineering practices; research-before-design prevents wasted implementation; retro captures learnings for continuous improvement
```

With:
```markdown
**Six-Phase Workflow:**
- Context: Need to support both quick fixes and deep features without overhead
- Decision: Linear workflow (prime → design → plan → implement → release → retro) with standalone utilities (/bootstrap, /research, /status)
- Rationale: Matches real engineering practices; design-before-code prevents wasted implementation; retro captures learnings for continuous improvement
```

**Step 5: Commit**

```bash
git add .agents/prime/ARCHITECTURE.md
git commit -m "docs: update ARCHITECTURE.md - remove verify, 6-phase workflow"
```

---

## Task 4: Update .agents/prime/STRUCTURE.md

**Files:**
- Modify: `.agents/prime/STRUCTURE.md`

**Step 1: Update folder structure at line 25**

Remove:
```markdown
│   ├── verify/            # Test reports
```

**Step 2: Update folder structure at line 38**

Remove:
```markdown
│   ├── verify/           # Verification & testing
```

**Step 3: Update skill count at line 66**

Replace:
```markdown
- Contains: 14 skill definitions (prime, research, design, plan, implement, verify, retro, status, bootstrap, bootstrap-wizard, bootstrap-discovery, release)
```

With:
```markdown
- Contains: 13 skill definitions (prime, research, design, plan, implement, retro, status, bootstrap, bootstrap-wizard, bootstrap-discovery, release)
```

**Step 4: Remove verify skill reference at line 95**

Delete:
```markdown
- `skills/verify/SKILL.md`: Verification & testing
```

**Step 5: Update phase directories at line 117**

Replace:
```markdown
- `.agents/{phase-name}/`: Phase directories use lowercase (design, plan, status, verify, release)
```

With:
```markdown
- `.agents/{phase-name}/`: Phase directories use lowercase (design, plan, status, release)
```

**Step 6: Remove test reports path at line 135**

Delete:
```markdown
- Test reports: `.agents/verify/{report-name}.md`
```

**Step 7: Commit**

```bash
git add .agents/prime/STRUCTURE.md
git commit -m "docs: update STRUCTURE.md - remove verify references"
```

---

## Task 5: Update .agents/prime/STACK.md

**Files:**
- Modify: `.agents/prime/STACK.md`

**Step 1: Remove /verify self-reference at line 37**

Delete:
```markdown
- Self-referential: beastmode itself provides the `/verify` skill for testing
```

**Step 2: Remove /verify from command list at line 62**

Delete:
```markdown
/verify
```

**Step 3: Remove /verify from workflow comment at line 71**

Delete:
```markdown
/verify                # Run verification tests
```

**Step 4: Commit**

```bash
git add .agents/prime/STACK.md
git commit -m "docs: update STACK.md - remove verify command references"
```

---

## Task 6: Update .agents/prime/META.md

**Files:**
- Modify: `.agents/prime/META.md:47`

**Step 1: Remove verify folder from structure**

Delete:
```markdown
├── verify/         # Verification reports
```

**Step 2: Commit**

```bash
git add .agents/prime/META.md
git commit -m "docs: update META.md - remove verify folder"
```

---

## Task 7: Update skills/bootstrap/SKILL.md

**Files:**
- Modify: `skills/bootstrap/SKILL.md`

**Step 1: Remove verify/ from folder structure at line 27**

Delete:
```markdown
├── verify/             # /verify output
```

**Step 2: Remove ## Workflow section at line 58**

Delete these lines:
```markdown
## Workflow

Part of: **bootstrap** → (bootstrap-wizard OR bootstrap-discovery) → prime → research → design → plan → implement → status → verify → release → retro
```

**Step 3: Commit**

```bash
git add skills/bootstrap/SKILL.md
git commit -m "chore(bootstrap): remove verify folder and workflow section"
```

---

## Task 8: Update skills/bootstrap/templates/META.md

**Files:**
- Modify: `skills/bootstrap/templates/META.md:47`

**Step 1: Remove verify folder from template structure**

Delete:
```markdown
├── verify/         # Verification reports
```

**Step 2: Commit**

```bash
git add skills/bootstrap/templates/META.md
git commit -m "chore(bootstrap): remove verify from template META.md"
```

---

## Task 9: Update skills/implement/phases/complete.md

**Files:**
- Modify: `skills/implement/phases/complete.md`

**Step 1: Update overview at line 5**

Replace:
```markdown
Guide completion of development work by committing changes, merging back to main, cleaning up the worktree, and handing off to verification.
```

With:
```markdown
Guide completion of development work by committing changes, merging back to main, and cleaning up the worktree.
```

**Step 2: Update option 1 description at line 67**

Replace:
```markdown
      description: "Merge to <base-branch>, delete worktree, handoff to /verify"
```

With:
```markdown
      description: "Merge to <base-branch>, delete worktree"
```

**Step 3: Replace Step 6 "Handoff to Verify" (lines 179-191)**

Replace:
```markdown
## Step 6: Handoff to Verify

**For Option 1 (Merge Locally):**

```
Implementation merged to <base-branch>.
Worktree cleaned up.

Next step: Run /verify to complete the development workflow.
```

**Announce:** "I'm using the /verify skill to complete this work."
**REQUIRED SUB-SKILL:** Use beastmode:verify
```

With:
```markdown
## Step 6: Suggest Next Steps

**For Option 1 (Merge Locally):**

```
Implementation merged to <base-branch>.
Worktree cleaned up.

Consider running /release if ready to ship.
```
```

**Step 4: Update Red Flags section at line 236**

Replace:
```markdown
- Handoff to /verify after merge
```

With:
```markdown
- Suggest /release after merge
```

**Step 5: Update Exit Criteria for Option 1 (line 247)**

Replace:
```markdown
✓ Handed off to /verify
```

With:
```markdown
✓ Suggested /release
```

**Step 6: Update success message at line 266**

Replace:
```markdown
**On success:** Workflow complete (or handed to /verify)
```

With:
```markdown
**On success:** Workflow complete
```

**Step 7: Commit**

```bash
git add skills/implement/phases/complete.md
git commit -m "chore(implement): replace verify handoff with release suggestion"
```

---

## Task 10: Update skills/implement/SKILL.md

**Files:**
- Modify: `skills/implement/SKILL.md`

**Step 1: Update Phase 4 description at line 67**

Replace:
```markdown
Merge back to main, cleanup worktree, handoff to verify.
```

With:
```markdown
Merge back to main, cleanup worktree.
```

**Step 2: Update exit criteria at line 70**

Replace:
```markdown
**Exit criteria:** Merged to main, worktree removed, ready for /verify
```

With:
```markdown
**Exit criteria:** Merged to main, worktree removed
```

**Step 3: Remove verify from Integration section (lines 103-108)**

Replace:
```markdown
## Integration

**Required workflow skills:**
- **beastmode:plan** - Creates the plan this skill executes
- **beastmode:verify** - Complete development after merge

---
```

With:
```markdown
## Integration

**Required workflow skills:**
- **beastmode:plan** - Creates the plan this skill executes

---
```

**Step 4: Delete ## Workflow section (lines 111-113)**

Delete:
```markdown
## Workflow

Part of: bootstrap → prime → research → design → plan → **implement** → status → verify → release → retro
```

**Step 5: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "chore(implement): remove verify references and workflow section"
```

---

## Task 11: Update skills/_shared/SESSION-TRACKING.md

**Files:**
- Modify: `skills/_shared/SESSION-TRACKING.md:64`

**Step 1: Remove /verify row from table**

Delete:
```markdown
| `/verify` | From recent status file or explicit |
```

**Step 2: Commit**

```bash
git add skills/_shared/SESSION-TRACKING.md
git commit -m "chore: remove verify from session tracking table"
```

---

## Task 12: Remove ## Workflow sections from phase skills

**Files:**
- Modify: `skills/design/SKILL.md`
- Modify: `skills/plan/SKILL.md`
- Modify: `skills/status/SKILL.md`
- Modify: `skills/release/SKILL.md`
- Modify: `skills/retro/SKILL.md`
- Modify: `skills/research/SKILL.md`

**Step 1: Remove workflow section from skills/design/SKILL.md (lines 98-100)**

Delete:
```markdown
## Workflow

Part of: bootstrap → prime → research → **design** → plan → implement → status → verify → release → retro
```

**Step 2: Remove workflow section from skills/plan/SKILL.md**

Find and delete the `## Workflow` section.

**Step 3: Remove workflow section from skills/status/SKILL.md**

Find and delete the `## Workflow` section.

**Step 4: Remove workflow section from skills/release/SKILL.md**

Find and delete the `## Workflow` section.

**Step 5: Remove workflow section from skills/retro/SKILL.md**

Find and delete the `## Workflow` section.

**Step 6: Remove workflow section from skills/research/SKILL.md**

Find and delete the `## Workflow` section.

**Step 7: Commit**

```bash
git add skills/design/SKILL.md skills/plan/SKILL.md skills/status/SKILL.md skills/release/SKILL.md skills/retro/SKILL.md skills/research/SKILL.md
git commit -m "chore: remove workflow sections from all phase skills (DRY)"
```

---

## Task 13: Final verification

**Step 1: Check no verify references remain in active files**

Run: `grep -r "verify" skills/ .agents/CLAUDE.md .agents/prime/ README.md --include="*.md" | grep -v "verify in code" | grep -v ".agents/design/" | grep -v ".agents/plan/" | head -20`

Expected: No output (or only "verify in code" which is unrelated)

**Step 2: Verify skill folder is gone**

Run: `ls skills/verify 2>&1`
Expected: `ls: skills/verify: No such file or directory`

**Step 3: Verify workflow is consistent**

Run: `grep -h "→.*→" README.md .agents/prime/ARCHITECTURE.md | head -5`
Expected: All show `prime → design → plan → implement → release → retro`

**Step 4: Done**

No commit needed - this is verification only.

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 0 | Delete verify skill | `skills/verify/` |
| 1 | Update README.md | `README.md` |
| 2 | Update .agents/CLAUDE.md | `.agents/CLAUDE.md` |
| 3 | Update ARCHITECTURE.md | `.agents/prime/ARCHITECTURE.md` |
| 4 | Update STRUCTURE.md | `.agents/prime/STRUCTURE.md` |
| 5 | Update STACK.md | `.agents/prime/STACK.md` |
| 6 | Update META.md | `.agents/prime/META.md` |
| 7 | Update bootstrap SKILL.md | `skills/bootstrap/SKILL.md` |
| 8 | Update bootstrap template | `skills/bootstrap/templates/META.md` |
| 9 | Update implement complete.md | `skills/implement/phases/complete.md` |
| 10 | Update implement SKILL.md | `skills/implement/SKILL.md` |
| 11 | Update SESSION-TRACKING.md | `skills/_shared/SESSION-TRACKING.md` |
| 12 | Remove workflow sections | 6 skill files |
| 13 | Final verification | N/A |
