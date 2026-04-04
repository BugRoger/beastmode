# Compare URLs — Implementation Tasks

## Goal

Add compare URL generation to the epic issue body's `## Git` section. During active development, the URL compares `main...feature/{slug}`. After release (phase `done`), it switches to `{version-tag}...archive/{slug}` so links survive branch deletion. Falls back to the branch-based URL when no archive tag exists.

## Architecture & Constraints

- **Pure computation** — `formatEpicBody()` receives all inputs, no I/O in the formatter
- **Presence-based rendering** — present field = render section, absent field = omit
- **`EpicBodyInput.gitMetadata`** — existing type with `branch`, `phaseTags`, `version`, `mergeCommit`; new `compareUrl` field added here
- **`resolveGitMetadata()`** — existing function in `sync.ts` that reads manifest and git state; computes compare URL here
- **Archive tag format** — `archive/{slug}` (from `git/worktree.ts:381`)
- **Test runner** — `bun --bun vitest run` with vitest imports
- **No I/O in formatEpicBody** — compare URL is pre-computed by the caller

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/github/sync.ts` | Modify | Add `compareUrl` to `gitMetadata` type, render in `formatEpicBody()`, compute in `resolveGitMetadata()` |
| `cli/src/__tests__/body-format.test.ts` | Modify | Add tests for compare URL rendering in the `## Git` section |

---

## Task 1: Add compare URL rendering to formatEpicBody

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:49-77` (EpicBodyInput interface)
- Modify: `cli/src/github/sync.ts:132-150` (Git metadata rendering)
- Test: `cli/src/__tests__/body-format.test.ts`

- [x] **Step 1: Write failing tests for compare URL rendering**

Add the following tests to the `gitMetadata` section of `body-format.test.ts`, after the existing "omits tags line when phaseTags is empty object" test (line 340):

```typescript
  test("renders compare URL as clickable link in git section", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        branch: "feature/my-epic",
        compareUrl: "https://github.com/org/repo/compare/main...feature/my-epic",
      },
    });
    expect(body).toContain("## Git");
    expect(body).toContain(
      "**Compare:** [main...feature/my-epic](https://github.com/org/repo/compare/main...feature/my-epic)",
    );
  });

  test("renders archive compare URL after release", () => {
    const body = formatEpicBody({
      ...makeManifest({ phase: "done" }),
      gitMetadata: {
        version: "1.2.0",
        compareUrl: "https://github.com/org/repo/compare/v1.2.0...archive/my-epic",
      },
    });
    expect(body).toContain(
      "**Compare:** [v1.2.0...archive/my-epic](https://github.com/org/repo/compare/v1.2.0...archive/my-epic)",
    );
  });

  test("omits compare line when compareUrl absent", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: { branch: "feature/my-epic" },
    });
    expect(body).not.toContain("**Compare:**");
  });

  test("compare URL appears after branch line in git section", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        branch: "feature/my-epic",
        compareUrl: "https://github.com/org/repo/compare/main...feature/my-epic",
      },
    });
    const branchIdx = body.indexOf("**Branch:**");
    const compareIdx = body.indexOf("**Compare:**");
    expect(branchIdx).toBeGreaterThan(-1);
    expect(compareIdx).toBeGreaterThan(branchIdx);
  });

  test("full git section includes compare URL alongside other fields", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        branch: "feature/epic-branch",
        phaseTags: { design: "beastmode/epic/design" },
        version: "2.0.0",
        mergeCommit: { sha: "deadbeef12345678", url: "https://github.com/org/repo/commit/deadbeef12345678" },
        compareUrl: "https://github.com/org/repo/compare/main...feature/epic-branch",
      },
    });
    expect(body).toContain("**Branch:** `feature/epic-branch`");
    expect(body).toContain("**Compare:** [main...feature/epic-branch](https://github.com/org/repo/compare/main...feature/epic-branch)");
    expect(body).toContain("**Tags:** `beastmode/epic/design`");
    expect(body).toContain("**Version:** 2.0.0");
    expect(body).toContain("**Merge Commit:** [deadbee](https://github.com/org/repo/commit/deadbeef12345678)");
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: FAIL — `compareUrl` does not exist on the type, tests fail to compile or assertions fail.

- [x] **Step 3: Add `compareUrl` to the `gitMetadata` type and render it**

In `cli/src/github/sync.ts`, update the `gitMetadata` field in `EpicBodyInput` (line 69-74) to add `compareUrl`:

```typescript
  /** Git metadata for traceability — branch, tags, version, merge commit. */
  gitMetadata?: {
    branch?: string;
    phaseTags?: Record<string, string>;  // phase -> tag name
    version?: string;
    mergeCommit?: { sha: string; url: string };
    /** Compare URL for viewing the full diff — branch-based or archive-based. */
    compareUrl?: string;
  };
```

In `formatEpicBody()`, add the compare URL rendering after the branch line (after line 136), extracting the label from the URL path:

```typescript
    if (meta.compareUrl) {
      // Extract the range label from the URL path: everything after /compare/
      const rangeLabel = meta.compareUrl.split("/compare/").pop() ?? meta.compareUrl;
      lines.push(`**Compare:** [${rangeLabel}](${meta.compareUrl})`);
    }
```

- [x] **Step 4: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: ALL PASS (42 existing + 5 new = 47 tests)

- [x] **Step 5: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/body-format.test.ts
git commit -m "feat(compare-urls): add compareUrl field to gitMetadata and render in epic body"
```

---

## Task 2: Compute compare URL in resolveGitMetadata

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/sync.ts:361-393` (resolveGitMetadata function)
- Modify: `cli/src/github/sync.ts:435-440` (syncGitHub function signature/call)
- Test: `cli/src/__tests__/body-format.test.ts`

- [x] **Step 1: Write failing tests for compare URL computation**

The `resolveGitMetadata()` function is not exported — it's a private helper called from `syncGitHub()`. The compare URL logic is pure computation based on inputs, so we test it indirectly through `formatEpicBody()` which already covers rendering. What we need to verify is the computation in `resolveGitMetadata()`.

Since `resolveGitMetadata()` uses `Bun.spawnSync` for git operations (not testable in unit tests), and the plan says "no I/O in the formatter", the computation of the URL itself should be extracted into a **pure, exported helper** that `resolveGitMetadata()` calls.

Add a test section to `body-format.test.ts` for the new helper:

```typescript
import { formatEpicBody, formatFeatureBody, formatClosingComment, buildCompareUrl } from "../github/sync";

// --- buildCompareUrl ---

describe("buildCompareUrl", () => {
  test("returns branch-based URL during active development", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      phase: "implement",
      slug: "my-epic",
    });
    expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
  });

  test("returns archive-based URL when phase is done and version is present", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      phase: "done",
      slug: "my-epic",
      versionTag: "v1.2.0",
      hasArchiveTag: true,
    });
    expect(url).toBe("https://github.com/org/repo/compare/v1.2.0...archive/my-epic");
  });

  test("falls back to branch-based URL when done but no archive tag", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      phase: "done",
      slug: "my-epic",
      versionTag: "v1.2.0",
      hasArchiveTag: false,
    });
    expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
  });

  test("falls back to branch-based URL when done but no version tag", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      branch: "feature/my-epic",
      phase: "done",
      slug: "my-epic",
      hasArchiveTag: true,
    });
    expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
  });

  test("returns undefined when repo is missing", () => {
    const url = buildCompareUrl({
      branch: "feature/my-epic",
      phase: "implement",
      slug: "my-epic",
    });
    expect(url).toBeUndefined();
  });

  test("returns undefined when branch is missing", () => {
    const url = buildCompareUrl({
      repo: "org/repo",
      phase: "implement",
      slug: "my-epic",
    });
    expect(url).toBeUndefined();
  });

  test("returns branch-based URL for all non-done phases", () => {
    for (const phase of ["design", "plan", "implement", "validate", "release"] as const) {
      const url = buildCompareUrl({
        repo: "org/repo",
        branch: "feature/my-epic",
        phase,
        slug: "my-epic",
      });
      expect(url).toBe("https://github.com/org/repo/compare/main...feature/my-epic");
    }
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: FAIL — `buildCompareUrl` is not exported from `sync.ts`.

- [x] **Step 3: Implement `buildCompareUrl` and wire into `resolveGitMetadata`**

In `cli/src/github/sync.ts`, add the `buildCompareUrl` function (after `formatClosingComment`, before `resolveArtifactLinks`). Also export it:

```typescript
/** Input for building a compare URL — pure computation, no I/O. */
export interface CompareUrlInput {
  repo?: string;
  branch?: string;
  phase: Phase;
  slug: string;
  versionTag?: string;
  hasArchiveTag?: boolean;
}

/**
 * Build a GitHub compare URL for an epic.
 *
 * Active development: main...feature/{slug}
 * Post-release with archive tag: {versionTag}...archive/{slug}
 * Fallback: branch-based URL when archive tag missing.
 */
export function buildCompareUrl(input: CompareUrlInput): string | undefined {
  if (!input.repo || !input.branch) return undefined;

  const base = `https://github.com/${input.repo}/compare`;

  // Post-release with archive tag — use version range
  if (input.phase === "done" && input.versionTag && input.hasArchiveTag) {
    return `${base}/${input.versionTag}...archive/${input.slug}`;
  }

  // Active development or fallback — branch-based
  return `${base}/main...${input.branch}`;
}
```

Then update `resolveGitMetadata()` to accept `repo` and `slug` params and compute the compare URL. Change the function signature from:

```typescript
function resolveGitMetadata(
  manifest: PipelineManifest,
): EpicBodyInput["gitMetadata"] | undefined {
```

to:

```typescript
function resolveGitMetadata(
  manifest: PipelineManifest,
  repo?: string,
): EpicBodyInput["gitMetadata"] | undefined {
```

Add this block inside `resolveGitMetadata()`, after the phase tags section (after the closing brace of the `if (manifest.worktree?.branch)` block, before the final return):

```typescript
  // Compare URL — pure computation from available metadata
  if (repo) {
    // Check for archive tag
    let hasArchiveTag = false;
    try {
      const archiveCheck = Bun.spawnSync(["git", "rev-parse", "--verify", `refs/tags/archive/${manifest.slug}`]);
      hasArchiveTag = archiveCheck.exitCode === 0;
    } catch {
      // Git not available — skip
    }

    // Read version tag if available
    const versionTag = readVersionTag(manifest.slug);

    const compareUrl = buildCompareUrl({
      repo,
      branch: manifest.worktree?.branch,
      phase: manifest.phase,
      slug: manifest.slug,
      versionTag,
      hasArchiveTag,
    });
    if (compareUrl) meta.compareUrl = compareUrl;
  }
```

Add a helper to read the version tag (near `readReleaseTag`):

```typescript
/** Read the version tag for this epic — returns undefined if no tag exists. */
function readVersionTag(slug: string): string | undefined {
  try {
    // Look for version tags like v1.2.0 that point to the same commit as the release tag
    const releaseTagName = `beastmode/${slug}/release`;
    const releaseRef = Bun.spawnSync(["git", "rev-parse", "--verify", `refs/tags/${releaseTagName}`]);
    if (releaseRef.exitCode !== 0) return undefined;
    const releaseSha = releaseRef.stdout.toString().trim();

    // Find version tags (vX.Y.Z) pointing to the same commit
    const tagsResult = Bun.spawnSync(["git", "tag", "-l", "v*", "--points-at", releaseSha]);
    if (tagsResult.exitCode !== 0) return undefined;
    const tags = tagsResult.stdout.toString().trim().split("\n").filter(Boolean);
    return tags[0] || undefined;
  } catch {
    return undefined;
  }
}
```

Finally, update the two `resolveGitMetadata()` call sites in `syncGitHub()` (line 470):

From: `const gitMetadata = resolveGitMetadata(manifest);`
To: `const gitMetadata = resolveGitMetadata(manifest, repo);`

- [x] **Step 4: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: ALL PASS (47 existing + 7 new = 54 tests)

- [x] **Step 5: Run full test suite**

Run: `bun --bun vitest run`
Expected: ALL PASS — no regressions

- [x] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/body-format.test.ts
git commit -m "feat(compare-urls): add buildCompareUrl helper and wire into resolveGitMetadata"
```
