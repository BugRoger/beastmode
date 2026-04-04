# Parallel Feature Merge File Loss

## Context
flashy-dashboard ran three parallel features (nyan-banner, layout-polish, overview-panel). After sequential merging, files created by one feature were absent from the final tree — the merge-tree conflict simulation passed (no text conflicts), but a file newly added by one feature was not present in the merge base of a subsequent feature's branch.

## Decision
After all parallel feature impl branches are merged, run a file presence verification pass against the expected output tree (from the Write Plan file structure tables) before checkpoint. If files are missing, restore from the originating impl branch before it is deleted.

## Rationale
`git merge-tree` simulates content conflicts but does not flag missing files when a feature adds a file that another feature's merge base predates. Sequential merge order does not eliminate this — only post-merge tree verification does. The fix was a manual restore commit; the convention codifies an automated check.

## Source
- .beastmode/artifacts/release/2026-04-04-flashy-dashboard.md (fix(overview-panel): restore files lost during parallel feature merges)
