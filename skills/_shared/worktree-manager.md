# Worktree Manager

Shared artifact resolution operations for all phases. @import this file; do not inline worktree logic.

## Derive Feature Name

Shared derivation used by ALL phases. Single source of truth for feature naming.

Used by: all checkpoints (artifact naming)

**From user topic** (design phase):

```bash
# Input: "Git Branching Strategy" or "git-branching-strategy"
feature=$(echo "$input" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
```

**From artifact path** (internal — used by checkpoints for artifact naming, NOT for argument parsing):

```bash
# Input: .beastmode/state/design/2026-03-08-worktree-artifact-alignment.md
# Output: worktree-artifact-alignment
feature=$(basename "$argument" .md | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
```

Both derivations MUST produce identical output for the same feature. The worktree directory name, branch name suffix, and artifact filename suffix are always the feature name from this section.

## Resolve Artifact

Used by: `/plan` 0-prime (type=design), `/implement` 0-prime (type=plan), `/release` 0-prime (type=plan)

Finds the phase input artifact by convention glob inside the worktree. MUST be called AFTER entering the worktree.

```bash
type="<artifact-type>"  # design, plan, implement, or validate
feature="<feature-name>"

# Convention: artifacts are YYYY-MM-DD-<feature>.md
matches=$(ls .beastmode/state/$type/*-$feature.md 2>/dev/null)

if [ -z "$matches" ]; then
  echo "ERROR: No $type artifact found for feature '$feature'"
  echo "Expected: .beastmode/state/$type/*-$feature.md"
  exit 1
fi

# If multiple, take latest (date prefix sorts chronologically)
artifact=$(echo "$matches" | tail -1)
```

Report: "Resolved `$type` artifact: `$artifact`"

## Resolve Manifest

Used by: `/implement` 0-prime (to find feature in manifest), `/validate` 0-prime (to check all features complete)

Finds the plan manifest for a design inside the worktree. MUST be called AFTER entering the worktree.

```bash
design="<design-name>"  # worktree directory name

# Convention: manifests are YYYY-MM-DD-<design>.manifest.json
matches=$(ls .beastmode/state/plan/*-$design.manifest.json 2>/dev/null)

if [ -z "$matches" ]; then
  echo "ERROR: No manifest found for design '$design'"
  echo "Expected: .beastmode/state/plan/*-$design.manifest.json"
  exit 1
fi

# If multiple, take latest
manifest=$(echo "$matches" | tail -1)
```

Report: "Resolved manifest: `$manifest`"
