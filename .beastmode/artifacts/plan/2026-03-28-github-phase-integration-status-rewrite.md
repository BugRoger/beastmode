# Status Rewrite

**Design:** .beastmode/state/design/2026-03-28-github-phase-integration.md
**Architectural Decisions:** see manifest

## User Stories

7. As a developer, I want `/beastmode status` to read manifests from worktrees and (when GitHub is enabled) show GitHub issue links, so that I can see the full state of all features from one command.

## What to Build

Rewrite the /beastmode status subcommand to read manifest JSON files in addition to scanning state directories.

**Manifest-based status (local):**
- Scan all worktrees (`.beastmode/worktrees/*/`)
- For each worktree, look for manifest files (`.beastmode/state/plan/*.manifest.json`)
- Parse each manifest to get feature list with statuses
- Display per-feature status within each design (pending, in-progress, blocked, completed)
- Show the current phase based on the most advanced state artifact

**GitHub-enhanced status (when github.enabled):**
- For each manifest with a `github` block, include the Epic issue URL
- For each feature with a `github.issue` field, include the feature issue URL
- Format: `#42` or full URL depending on terminal context

**Output format:**
```
## Active Designs

### github-phase-integration (feature/github-phase-integration)
Phase: implement | Epic: #41

Features:
  ✓ config-and-setup — completed
  ● shared-github-update — in-progress (#42)
  ○ design-checkpoint-manifest — pending (#43)
  ○ plan-checkpoint-sync — pending (#44)
```

The status command should gracefully handle:
- Worktrees without manifests (show design-only status, no features)
- Manifests without GitHub blocks (show local status only)
- Completed designs (from state/release/) shown as completed, not active

## Acceptance Criteria

- [ ] Status command reads manifest JSON from worktrees
- [ ] Per-feature status displayed (pending, in-progress, blocked, completed)
- [ ] GitHub issue numbers shown when manifest has github blocks
- [ ] Graceful fallback when no manifests exist (current behavior preserved)
- [ ] Completed designs not shown in active section
