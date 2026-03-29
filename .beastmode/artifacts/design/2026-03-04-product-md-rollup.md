# Design: PRODUCT.md Release Rollup

## Goal

Make PRODUCT.md authoritative and complete by updating it at release time. Every feature should influence PRODUCT.md so an agent starting cold sees what beastmode actually does today — not a frozen 19-line stub.

## Approach

Add a "PRODUCT.md Rollup" step to /release between Phase Retro (step 8) and Commit (step 9). Expand PRODUCT.md from 3 sections to 5, with a new **Capabilities** section as the feature inventory. Remove L0 from the retro bubble to cleanly separate concerns: retro owns L2→L1, release owns L1→L0.

## Key Decisions

### Locked Decisions

1. **Trigger: release-time only** — Features accumulate through design/plan/implement; roll up once at ship time. Avoids churn from per-phase updates.
2. **Content: full product spec with Capabilities** — PRODUCT.md becomes the definitive "what does this do" document with Vision, Goals, Capabilities, How It Works, and Current Version.
3. **Authority: auto-apply + flag big changes** — Version-only bumps auto-apply silently. New capabilities or workflow changes present a diff for user approval.
4. **Retro scope: remove L0 from retro bubble** — Retro does L2→L1 propagation (every phase). Release does L1→L0 propagation (every release). Clean separation.
5. **Placement: between retro and commit (step 8.5)** — Retro has already updated L1 summaries; commit captures everything in one shot.

### Claude's Discretion

None — all areas discussed with user.

## Components

### 1. New PRODUCT.md Structure

Expand from 3 sections to 5:

| Section | Purpose | Update pattern |
|---------|---------|----------------|
| **Vision** | One-liner mission (stable) | Rarely changes |
| **Goals** | Design principles (stable) | Changes when philosophy shifts |
| **Capabilities** | What beastmode can do (grows) | Each release adds/updates entries |
| **How It Works** | Architecture summary (evolves) | Updated when workflow changes |
| **Current Version** | Version + release count (auto) | Every release |

Capabilities format: bold label + 1-sentence description per entry.

### 2. Release Rollup Step (Step 8.5)

New step in `skills/release/phases/1-execute.md` between Phase Retro (step 8) and Commit (step 9):

1. Read inputs: current PRODUCT.md, all L1 summaries, release notes from step 5
2. Update Capabilities: add new from this release, remove dropped, keep accurate existing
3. Update How It Works: if release changes workflow mechanics
4. Update Current Version: set to new version
5. Significance check:
   - Version-only change → auto-apply silently
   - Capabilities or How It Works changed → present diff for user approval

### 3. Retro Bubble Scope Fix

In `skills/_shared/retro.md`, section "6. Bottom-Up Summary Bubble":
- Remove step 2 ("Update L0 summary") entirely
- L0 updates are now release-only via step 8.5
- Retro continues to own L2→L1 propagation (step 1)

### 4. Capability Sourcing

Release flow already reads commit messages (step 4) and generates release notes (step 5). The rollup step uses these same sources to detect new capabilities:
- `feat:` commits introducing new user-facing patterns → new capability entry
- `fix:` or `chore:` commits → no capability change unless enabling something new
- State artifacts (`.beastmode/state/design/`) provide detailed context

## Files Affected

| File | Change |
|------|--------|
| `skills/release/phases/1-execute.md` | Add step 8.5 (PRODUCT.md rollup) |
| `skills/_shared/retro.md` | Remove L0 update from bottom-up bubble (step 2 of section 6) |
| `.beastmode/PRODUCT.md` | Restructure to 5 sections, populate Capabilities from existing features |

## Acceptance Criteria

- [ ] /release includes a PRODUCT.md rollup step between retro and commit
- [ ] PRODUCT.md has 5 sections: Vision, Goals, Capabilities, How It Works, Current Version
- [ ] Capabilities section lists all current features with bold label + description
- [ ] Retro bubble no longer touches L0 (removed from retro.md section 6)
- [ ] Version-only updates auto-apply; capability changes require user approval
- [ ] An agent reading only PRODUCT.md understands what beastmode does today

## Testing Strategy

1. Run /release on a feature branch and verify PRODUCT.md is updated
2. Check that the Capabilities section matches the feature inventory
3. Verify retro no longer attempts L0 updates
4. Confirm auto-apply for version-only changes, approval prompt for capability changes

## Deferred Ideas

None.
