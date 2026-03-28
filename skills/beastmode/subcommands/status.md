# status

Show features grouped by current workflow phase. Reads manifest JSON files for per-feature status and (when GitHub is enabled) shows issue links.

## Steps

### 1. Scan Worktrees and Manifests

List all active worktrees and look for manifest files:

```bash
ls -d .claude/worktrees/*/ 2>/dev/null
```

For each worktree, scan for manifest files:

```bash
ls .claude/worktrees/*/\.beastmode/state/plan/*.manifest.json 2>/dev/null
```

Also check the main repo for manifests (in case of completed releases):

```bash
ls .beastmode/state/plan/*.manifest.json 2>/dev/null
```

### 2. Scan State Directory (Fallback)

For designs without manifests, fall back to scanning state directories:

```bash
ls .beastmode/state/design/*.md 2>/dev/null
ls .beastmode/state/plan/*.md 2>/dev/null
ls .beastmode/state/validate/*.md 2>/dev/null
ls .beastmode/state/release/*.md 2>/dev/null
```

Extract feature names from `YYYY-MM-DD-<feature>.md` pattern. Strip date prefix and suffix.

### 3. Determine Current Phase

For each unique design:
- If a release artifact exists → **completed**, show in "Completed" section
- Otherwise, determine phase from the most advanced state artifact: validate > implement > plan > design

### 4. Read Manifest Details

For each manifest JSON found:
- Parse `features` array for per-feature statuses
- Parse `github` block for Epic issue number (if present)
- Parse per-feature `github.issue` for feature issue numbers (if present)

### 5. Read GitHub Config

```bash
grep 'enabled: true' .beastmode/config.yaml 2>/dev/null
```

If `github.enabled` is true and manifests have `github` blocks, include issue references in output.

### 6. Display Output

**With manifests (preferred):**

```
## Active Designs

### <design-name> (feature/<design-name>)
Phase: <current-phase> | Epic: #<epic-number>

Features:
  ✓ <feature-slug> — completed
  ● <feature-slug> — in-progress (#<issue>)
  ○ <feature-slug> — pending (#<issue>)
  ✗ <feature-slug> — blocked (#<issue>)
```

Status symbols: `✓` completed, `●` in-progress, `○` pending, `✗` blocked.

GitHub issue numbers shown only when the manifest has `github` blocks.

**Without manifests (fallback — legacy designs):**

```
### <phase>
- <feature> (worktree: .claude/worktrees/<feature>)
```

**Completed designs:**

```
## Completed
- <design-name> (released YYYY-MM-DD)
```

If no active designs and no completed designs: "No active features."
