# Compare URL Implementation Tasks

## Goal

Add compare URL generation to the epic issue body. Active epics show `main...feature/{slug}`, released epics show `{version-tag}...archive/{slug}`, with fallback to branch-based URL when no archive tag exists.

## Architecture

- **Pure computation** — compare URL is generated in `formatEpicBody()` from inputs; no I/O in the formatter
- **Two-phase URL strategy** — active development uses branch-based URL, post-release uses archive tag range
- **Presence-based rendering** — compare URL line only appears when `gitMetadata.compareUrl` is set
- **Resolver computes URL** — `resolveGitMetadata()` builds the compare URL from manifest state and passes it through `gitMetadata`

## Tech Stack

- TypeScript, Bun runtime
- Vitest for testing
- Files in `cli/src/github/sync.ts` and `cli/src/__tests__/body-format.test.ts`

## Acceptance Criteria (from plan)

- Active epic body contains compare URL `main...feature/{slug}`
- Compare URL appears in the git metadata section of the epic body
- Compare URL is a clickable markdown link
- Released epic body uses archive tag range `{version-tag}...archive/feature/{slug}`
- Fallback to branch-based URL when no archive tag exists
- Unit tests for both active and post-release URL generation

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/github/sync.ts` | Modify | Add `compareUrl` to `EpicBodyInput.gitMetadata` type, render it in `formatEpicBody()`, compute it in `resolveGitMetadata()` |
| `cli/src/__tests__/body-format.test.ts` | Modify | Add tests for compare URL rendering in active and post-release scenarios |

---

### Task 1: Add compare URL to type and formatter

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:69-74` (gitMetadata type)
- Modify: `cli/src/github/sync.ts:132-150` (formatEpicBody git metadata rendering)
- Test: `cli/src/__tests__/body-format.test.ts`

- [x] **Step 1: Write failing tests for compare URL rendering**

Add the following tests to `cli/src/__tests__/body-format.test.ts` inside the `formatEpicBody` describe block, after the existing gitMetadata tests (after line 340):

```typescript
  test("renders compare URL as clickable link in git metadata", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        branch: "feature/my-epic",
        compareUrl: "https://github.com/org/repo/compare/main...feature/my-epic",
      },
    });
    expect(body).toContain("## Git");
    expect(body).toContain("**Compare:** [View Changes](https://github.com/org/repo/compare/main...feature/my-epic)");
  });

  test("renders compare URL alongside other git metadata fields", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        branch: "feature/epic-branch",
        phaseTags: { design: "beastmode/epic/design" },
        compareUrl: "https://github.com/org/repo/compare/main...feature/epic-branch",
      },
    });
    expect(body).toContain("**Branch:** `feature/epic-branch`");
    expect(body).toContain("**Tags:** `beastmode/epic/design`");
    expect(body).toContain("**Compare:** [View Changes](https://github.com/org/repo/compare/main...feature/epic-branch)");
  });

  test("renders archive-based compare URL for released epics", () => {
    const body = formatEpicBody({
      ...makeManifest({ phase: "done" }),
      gitMetadata: {
        compareUrl: "https://github.com/org/repo/compare/v1.0.0...archive/my-epic",
      },
    });
    expect(body).toContain("**Compare:** [View Changes](https://github.com/org/repo/compare/v1.0.0...archive/my-epic)");
  });

  test("omits compare URL line when compareUrl absent", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: { branch: "feature/my-branch" },
    });
    expect(body).not.toContain("**Compare:**");
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run cli/src/__tests__/body-format.test.ts`
Expected: FAIL — TypeScript error on `compareUrl` property (not in type)

- [x] **Step 3: Add compareUrl to gitMetadata type**

In `cli/src/github/sync.ts`, update the `gitMetadata` type in `EpicBodyInput` (lines 69-74) to add `compareUrl`:

```typescript
  /** Git metadata for traceability — branch, tags, version, merge commit. */
  gitMetadata?: {
    branch?: string;
    phaseTags?: Record<string, string>;  // phase -> tag name
    version?: string;
    mergeCommit?: { sha: string; url: string };
    compareUrl?: string;
  };
```

- [x] **Step 4: Render compare URL in formatEpicBody**

In `cli/src/github/sync.ts`, in the `formatEpicBody` function's git metadata section (around line 146, after the `mergeCommit` block), add:

```typescript
    if (meta.compareUrl) {
      lines.push(`**Compare:** [View Changes](${meta.compareUrl})`);
    }
```

This goes right after the `if (meta.mergeCommit)` block and before the `if (lines.length > 0)` check.

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run cli/src/__tests__/body-format.test.ts`
Expected: PASS — all 46 tests pass (42 existing + 4 new)

- [x] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/body-format.test.ts
git commit -m "feat(compare-url): add compareUrl to gitMetadata type and render in epic body"
```

---

### Task 2: Generate compare URL in resolveGitMetadata

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/sync.ts:361-393` (resolveGitMetadata function)
- Test: `cli/src/__tests__/body-format.test.ts`

- [ ] **Step 1: Write failing tests for compare URL generation**

These tests verify the complete flow through `formatEpicBody` with the compare URL. Since `resolveGitMetadata` is a private function, we test its effect via the public `syncGitHub` function indirectly — but for pure unit testing, we test via `formatEpicBody` with the expected `gitMetadata` shape. The actual `resolveGitMetadata` logic is a resolver implementation detail tested via integration.

However, we need a dedicated unit test for the URL construction logic. Extract it as a testable helper. Add to `cli/src/github/sync.ts` a new exported function:

```typescript
/**
 * Build a compare URL for the epic body.
 * Active epics: main...{branch}
 * Released epics: {versionTag}...archive/{slug} (fallback to branch-based if no archive tag)
 */
export function buildCompareUrl(opts: {
  repo: string;
  branch: string;
  slug: string;
  phase: Phase;
  archiveTag?: string;
  versionTag?: string;
}): string {
  const base = `https://github.com/${opts.repo}/compare`;
  if (opts.phase === "done" && opts.archiveTag && opts.versionTag) {
    return `${base}/${opts.versionTag}...${opts.archiveTag}`;
  }
  return `${base}/main...${opts.branch}`;
}
```

Add these tests in a new describe block at the end of `cli/src/__tests__/body-format.test.ts`:

```typescript
// --- buildCompareUrl ---

describe("buildCompareUrl", () => {
  test("active epic returns branch-based compare URL", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      slug: "my-epic",
      phase: "implement",
    });
    expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
  });

  test("released epic with archive tag returns tag-based compare URL", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      slug: "my-epic",
      phase: "done",
      archiveTag: "archive/my-epic",
      versionTag: "v1.2.0",
    });
    expect(url).toBe("https://github.com/org/repo/compare/v1.2.0...archive/my-epic");
  });

  test("released epic without archive tag falls back to branch-based URL", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      slug: "my-epic",
      phase: "done",
    });
    expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
  });

  test("released epic with archive tag but no version tag falls back to branch-based URL", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      slug: "my-epic",
      phase: "done",
      archiveTag: "archive/my-epic",
    });
    expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
  });

  test("cancelled epic returns branch-based URL", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      slug: "my-epic",
      phase: "cancelled",
    });
    expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
  });
});
```

Also add the import at the top of the test file:

```typescript
import { formatEpicBody, formatFeatureBody, formatClosingComment, buildCompareUrl } from "../github/sync";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run cli/src/__tests__/body-format.test.ts`
Expected: FAIL — `buildCompareUrl` is not exported from sync.ts yet

- [ ] **Step 3: Implement buildCompareUrl and wire into resolveGitMetadata**

Add the `buildCompareUrl` function to `cli/src/github/sync.ts` right before the `resolveGitMetadata` function (around line 355):

```typescript
/**
 * Build a compare URL for the epic body.
 * Active epics: main...{branch}
 * Released epics: {versionTag}...archive/{slug} (fallback to branch-based if no archive tag)
 */
export function buildCompareUrl(opts: {
  repo: string;
  branch: string;
  slug: string;
  phase: Phase;
  archiveTag?: string;
  versionTag?: string;
}): string {
  const base = `https://github.com/${opts.repo}/compare`;
  if (opts.phase === "done" && opts.archiveTag && opts.versionTag) {
    return `${base}/${opts.versionTag}...${opts.archiveTag}`;
  }
  return `${base}/main...${opts.branch}`;
}
```

Then update `resolveGitMetadata` to accept `repo`, `phase`, and `slug` parameters and compute the compare URL. Change the function signature:

```typescript
function resolveGitMetadata(
  manifest: PipelineManifest,
  repo?: string,
): EpicBodyInput["gitMetadata"] | undefined {
```

Inside `resolveGitMetadata`, after the phase tags block (around line 389) and still inside the `if (manifest.worktree?.branch)` block, add:

```typescript
    // Compare URL — requires repo to build full GitHub URL
    if (repo) {
      const archiveTagName = `archive/${manifest.slug}`;
      let archiveTag: string | undefined;
      try {
        const archiveResult = Bun.spawnSync(["git", "rev-parse", "--verify", `refs/tags/${archiveTagName}`]);
        if (archiveResult.exitCode === 0) {
          archiveTag = archiveTagName;
        }
      } catch {
        // No archive tag
      }

      const versionTag = readVersionTag(manifest.slug);
      meta.compareUrl = buildCompareUrl({
        repo,
        branch: manifest.worktree.branch,
        slug: manifest.slug,
        phase: manifest.phase,
        archiveTag,
        versionTag,
      });
    }
```

Add a helper to read the version tag (before `resolveGitMetadata`):

```typescript
/** Read the most recent version tag — returns tag name or undefined. */
function readVersionTag(slug: string): string | undefined {
  try {
    const result = Bun.spawnSync(["git", "describe", "--tags", "--match", "v*", "--abbrev=0"]);
    return result.exitCode === 0 ? result.stdout.toString().trim() || undefined : undefined;
  } catch {
    return undefined;
  }
}
```

Finally, update the two call sites of `resolveGitMetadata` in `syncGitHub` to pass `repo`:

```typescript
  const gitMetadata = resolveGitMetadata(manifest, repo);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run cli/src/__tests__/body-format.test.ts`
Expected: PASS — all 51 tests pass (42 existing + 4 from Task 1 + 5 new)

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests pass

- [x] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/body-format.test.ts
git commit -m "feat(compare-url): generate compare URL in resolveGitMetadata with active/archive strategy"
```
