# Context Write Protection Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Enforce that phases write only to L3 state; L0/L1/L2 files are modified exclusively through retro.

**Architecture:** Add write-protection rule to BEASTMODE.md (L0), migrate release's direct L0 write to an L3 proposal + retro promotion, and update retro.md with an L0 promotion step.

**Tech Stack:** Markdown only.

**Design Doc:** `.beastmode/state/design/2026-03-06-context-write-protection.md`

---

### Task 0: Add Write Protection Rule to BEASTMODE.md

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/BEASTMODE.md:58-61`

**Step 1: Add Write Protection subsection**

After the "File Naming" subsection (line 61) and before "## Configuration" (line 63), insert:

```markdown
### Write Protection

Phases write artifacts to L3 (`state/`) only. Compaction and promotion to L0, L1, and L2 happens exclusively through retro.

| Writer | Allowed Targets | Mechanism |
|--------|----------------|-----------|
| Phase checkpoints | L3 (`state/`) | Direct write |
| Retro (embedded in checkpoints) | L0, L1, L2 | Bottom-up promotion |
| Init (`/beastmode init`) | L0, L1, L2 | Bootstrap exemption |

No phase may write to `context/` or `meta/` files directly. Retro is the sole gatekeeper for upward knowledge promotion.
```

**Step 2: Verify**

Read the file and confirm the new subsection sits between "File Naming" and "Configuration".

---

### Task 1: Reorder Release Steps and Convert L0 Write to Proposal

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md:109-141`

**Step 1: Replace steps 8 and 8.5 with new ordering**

Replace the current step 8 (retro @ import) and step 8.5 (direct BEASTMODE.md write including gate 8.6) with:

```markdown
## 8. Prepare L0 Update Proposal

Roll up L1 summaries and release features into an L0 update proposal.

1. Read current `.beastmode/BEASTMODE.md`
2. Read all L1 domain summaries (`context/DESIGN.md`, `context/PLAN.md`, `context/IMPLEMENT.md`, `context/VALIDATE.md`, `context/RELEASE.md`, `meta/DESIGN.md`, `meta/PLAN.md`, `meta/IMPLEMENT.md`, `meta/VALIDATE.md`, `meta/RELEASE.md`, `state/DESIGN.md`, `state/PLAN.md`, `state/IMPLEMENT.md`, `state/VALIDATE.md`, `state/RELEASE.md`)
3. Read the release notes generated in step 5
4. Prepare proposed **Capabilities** section:
   - Add new capabilities from this release's `feat:` commits
   - Remove capabilities for features that were dropped
   - Keep existing entries that are still accurate
   - Format: `- **Bold label**: One-sentence description`
5. Prepare proposed **How It Works** section if the release changes workflow mechanics

Save the proposal to `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z-l0-proposal.md`:

    ```markdown
    # L0 Update Proposal — vX.Y.Z

    ## Proposed Capabilities

    - **Bold label**: One-sentence description
    - ...

    ## Proposed How It Works

    [Only if changed, otherwise omit this section]
    ```

If no changes to Capabilities or How It Works are needed, skip writing the proposal file.

## 8.5. Phase Retro

@../_shared/retro.md
```

**Step 2: Verify**

Read the file. Confirm step 8 writes to L3 state, step 8.5 is the retro call, and no direct write to BEASTMODE.md exists. Confirm the `release.beastmode-md-approval` gate is removed from this file (it now lives in retro.md).

---

### Task 2: Add L0 Promotion Step to Retro

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:140-141`

**Step 1: Replace the L0 comment with a promotion step**

Replace line 141 (`L0 (BEASTMODE.md) updates are handled by /release, not by the retro bubble.`) with:

```markdown
## 10. L0 Promotion (Release Phase Only)

If running in the release phase, check for an L0 update proposal:

1. Look for `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z-l0-proposal.md`
2. If no proposal file exists → skip (no L0 changes needed)
3. If proposal exists → apply the proposed sections to `.beastmode/BEASTMODE.md`:
   - Replace **Capabilities** section with proposed version
   - Replace **How It Works** section with proposed version (if present in proposal)

### 10.1 [GATE|release.beastmode-md-approval]

Read `.beastmode/config.yaml` → resolve mode for `release.beastmode-md-approval`.
Default: `auto`.

#### [GATE-OPTION|human] Ask User

**Significance check:**
- If Capabilities or How It Works changed → present the before/after diff for user approval
- If neither changed → auto-apply silently

#### [GATE-OPTION|auto] Auto-Apply

Auto-apply all changes.
Log: "Gate `release.beastmode-md-approval` → auto: updated BEASTMODE.md with N new capabilities"
```

**Step 2: Verify**

Read the file. Confirm step 10 exists after step 9 (bottom-up bubble), is conditional on release phase, and includes the `release.beastmode-md-approval` gate.

---

## Validation

### Design Coverage

| Design Component | Plan Task | Status |
|-----------------|-----------|--------|
| L0 Write Protection rule | Task 0 | Covered |
| Release step reordering | Task 1 | Covered |
| Retro L0 promotion step | Task 2 | Covered |
| Config gate (retro.l2-write) | N/A | User-applied |

### File Isolation

| Wave | Tasks | Overlaps | Status |
|------|-------|----------|--------|
| 1 | 3 | 0 | Parallel-safe |
