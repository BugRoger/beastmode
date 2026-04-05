# Body Enrichment — Implementation Tasks

## Goal

Enrich GitHub issue titles and bodies with human-readable names and full artifact content. Epic titles use `manifest.epic` instead of hex slugs. Feature titles use `{epic}: {feature}` format. Epic bodies render the full PRD (6 sections). Feature bodies render the full plan (4 sections). Git section removed from epic bodies.

## Architecture

- **Formatters** are pure functions in `cli/src/github/sync.ts` — `formatEpicBody()`, `formatFeatureBody()`
- **Section extraction** via `extractSection`/`extractSections` from `cli/src/artifacts/reader.ts`
- **Sync engine** in `cli/src/github/sync.ts` — `syncGitHub()` and `syncFeature()` orchestrate creation/updates
- **gh CLI wrapper** in `cli/src/github/cli.ts` — `ghIssueCreate()`, `ghIssueEdit()`
- **Types** in `cli/src/manifest/store.ts` — `PipelineManifest` has `epic?: string`
- **Tests** in `cli/src/__tests__/body-format.test.ts`

## Tech Stack

- TypeScript, Bun runtime, Vitest test framework
- Run tests: `bun --bun vitest run`

## File Structure

| File | Responsibility |
|------|---------------|
| `cli/src/github/cli.ts` | Add `title` support to `ghIssueEdit` |
| `cli/src/github/sync.ts` | Update formatters, enrichment data flow, title logic in sync |
| `cli/src/__tests__/body-format.test.ts` | Update/add tests for formatters and title logic |

---

### Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/body-enrichment.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, test, expect } from "vitest";
import { formatEpicBody, formatFeatureBody } from "../github/sync";
import type { EpicBodyInput, FeatureBodyInput } from "../github/sync";

describe("Body Enrichment Integration", () => {
  describe("Epic issue title uses the human-readable epic name", () => {
    test("epic title should be the human-readable name, not the slug", () => {
      // The sync engine should use manifest.epic for titles
      // This is tested indirectly through the sync flow — we verify
      // that the formatter input accepts epic name and the sync engine
      // passes it through
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "design",
        features: [],
      };
      // The body should reference the slug internally but the title
      // is set in the sync engine (not in the formatter)
      const body = formatEpicBody(input);
      expect(body).toBeDefined();
    });
  });

  describe("Feature issue title is prefixed with the epic name", () => {
    test("feature title format is '{epic}: {feature}'", () => {
      // The sync engine builds the title — we verify the formatter
      // handles the enriched body content
      const input: FeatureBodyInput = {
        slug: "core-logger",
        description: "Core logger implementation",
        userStory: "As a user...",
        whatToBuild: "Build the core logger",
        acceptanceCriteria: "- [ ] Logger works",
      };
      const body = formatFeatureBody(input, 42);
      expect(body).toContain("## What to Build");
      expect(body).toContain("Build the core logger");
      expect(body).toContain("## Acceptance Criteria");
      expect(body).toContain("- [ ] Logger works");
      expect(body).toContain("**Epic:** #42");
    });
  });

  describe("Epic body contains full PRD sections", () => {
    test("renders all six PRD sections", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "implement",
        features: [],
        prdSections: {
          problem: "The logging system is inconsistent",
          solution: "Unify all loggers under a single interface",
          userStories: "1. As a developer, I want consistent logs",
          decisions: "- Use structured logging\n- Use pino as backend",
          testingDecisions: "- Unit test each logger adapter",
          outOfScope: "- Log aggregation service\n- Dashboard",
        },
      };
      const body = formatEpicBody(input);
      expect(body).toContain("## Problem");
      expect(body).toContain("The logging system is inconsistent");
      expect(body).toContain("## Solution");
      expect(body).toContain("Unify all loggers");
      expect(body).toContain("## User Stories");
      expect(body).toContain("consistent logs");
      expect(body).toContain("## Decisions");
      expect(body).toContain("structured logging");
      expect(body).toContain("## Testing Decisions");
      expect(body).toContain("Unit test each logger adapter");
      expect(body).toContain("## Out of Scope");
      expect(body).toContain("Log aggregation service");
    });

    test("retains phase badge and feature checklist", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "implement",
        features: [
          { slug: "core-logger", status: "completed", github: { issue: 10 } },
          { slug: "adapter", status: "pending" },
        ],
        prdSections: {
          problem: "Problem text",
          solution: "Solution text",
        },
      };
      const body = formatEpicBody(input);
      expect(body).toContain("**Phase:** implement");
      expect(body).toContain("- [x]");
      expect(body).toContain("- [ ]");
    });

    test("does not contain Git section", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "implement",
        features: [],
        prdSections: {
          problem: "Problem",
          solution: "Solution",
        },
      };
      const body = formatEpicBody(input);
      expect(body).not.toContain("## Git");
    });
  });

  describe("Feature body contains full plan sections", () => {
    test("renders description, user stories, what to build, acceptance criteria", () => {
      const input: FeatureBodyInput = {
        slug: "core-logger",
        description: "Implement the core logger module",
        userStory: "1. As a developer, I want structured logging",
        whatToBuild: "### Logger Interface\n\nCreate a Logger interface with info, warn, error methods",
        acceptanceCriteria: "- [ ] Logger interface defined\n- [ ] Default implementation works",
      };
      const body = formatFeatureBody(input, 42);
      expect(body).toContain("Implement the core logger module");
      expect(body).toContain("## User Story");
      expect(body).toContain("structured logging");
      expect(body).toContain("## What to Build");
      expect(body).toContain("Logger Interface");
      expect(body).toContain("## Acceptance Criteria");
      expect(body).toContain("Logger interface defined");
      expect(body).toContain("**Epic:** #42");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --bun vitest run src/__tests__/body-enrichment.integration.test.ts`
Expected: FAIL — `EpicBodyInput` doesn't have `epic`, `testingDecisions`, `outOfScope` fields; `FeatureBodyInput` doesn't have `whatToBuild`, `acceptanceCriteria` fields; `formatEpicBody` doesn't render Testing Decisions/Out of Scope; `formatFeatureBody` doesn't render What to Build/Acceptance Criteria.

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/body-enrichment.integration.test.ts
git commit -m "test(body-enrichment): add integration test — RED"
```

---

### Task 1: Add title support to ghIssueEdit

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/cli.ts:122-151`

- [ ] **Step 1: Write the failing test**

No separate test file — `ghIssueEdit` is a thin CLI wrapper. The sync engine tests will exercise title updates. Instead, verify manually that the type accepts `title`.

- [ ] **Step 2: Add title parameter to ghIssueEdit**

In `cli/src/github/cli.ts`, add `title?: string` to the `edits` parameter of `ghIssueEdit` and pass it as `--title` to `gh issue edit`:

```typescript
export async function ghIssueEdit(
  repo: string,
  issueNumber: number,
  edits: {
    title?: string;
    addLabels?: string[];
    removeLabels?: string[];
    state?: "open" | "closed";
    body?: string;
  },
  opts: { cwd?: string; logger?: Logger } = {},
): Promise<boolean> {
  const args = ["issue", "edit", String(issueNumber), "--repo", repo];
  if (edits.title !== undefined) args.push("--title", edits.title);
  if (edits.body !== undefined) args.push("--body", edits.body);
  if (edits.addLabels?.length)
    args.push("--add-label", edits.addLabels.join(","));
  if (edits.removeLabels?.length)
    args.push("--remove-label", edits.removeLabels.join(","));
  const result = await gh(args, { cwd: opts.cwd, logger: opts.logger });

  if (result !== undefined && edits.state === "closed") {
    return (
      (await gh(
        ["issue", "close", String(issueNumber), "--repo", repo],
        { cwd: opts.cwd, logger: opts.logger },
      )) !== undefined
    );
  }

  return result !== undefined;
}
```

- [ ] **Step 3: Commit**

```bash
git add cli/src/github/cli.ts
git commit -m "feat(body-enrichment): add title support to ghIssueEdit"
```

---

### Task 2: Expand EpicBodyInput and prdSections, remove Git section

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:50-79` (EpicBodyInput interface)
- Modify: `cli/src/github/sync.ts:96-173` (formatEpicBody function)
- Modify: `cli/src/github/sync.ts:326-355` (readPrdSections function)
- Modify: `cli/src/__tests__/body-format.test.ts`

- [ ] **Step 1: Write failing tests for new PRD sections and Git removal**

Add tests to `cli/src/__tests__/body-format.test.ts`:

```typescript
// Add inside the formatEpicBody describe block, after the existing decisions test:

test("renders testing decisions section when prdSections.testingDecisions present", () => {
  const body = formatEpicBody({
    ...makeManifest(),
    prdSections: { testingDecisions: "- Unit test coverage > 80%" },
  });
  expect(body).toContain("## Testing Decisions\n\n- Unit test coverage > 80%");
});

test("omits testing decisions section when prdSections.testingDecisions absent", () => {
  const body = formatEpicBody({
    ...makeManifest(),
    prdSections: { problem: "p" },
  });
  expect(body).not.toContain("## Testing Decisions");
});

test("renders out of scope section when prdSections.outOfScope present", () => {
  const body = formatEpicBody({
    ...makeManifest(),
    prdSections: { outOfScope: "- Dashboard\n- Notifications" },
  });
  expect(body).toContain("## Out of Scope\n\n- Dashboard\n- Notifications");
});

test("omits out of scope section when prdSections.outOfScope absent", () => {
  const body = formatEpicBody({
    ...makeManifest(),
    prdSections: { problem: "p" },
  });
  expect(body).not.toContain("## Out of Scope");
});

test("renders all six PRD sections in correct order", () => {
  const body = formatEpicBody({
    ...makeManifest(),
    prdSections: {
      problem: "P",
      solution: "S",
      userStories: "US",
      decisions: "D",
      testingDecisions: "TD",
      outOfScope: "OOS",
    },
  });
  const problemIdx = body.indexOf("## Problem");
  const solutionIdx = body.indexOf("## Solution");
  const storiesIdx = body.indexOf("## User Stories");
  const decisionsIdx = body.indexOf("## Decisions");
  const testingIdx = body.indexOf("## Testing Decisions");
  const oosIdx = body.indexOf("## Out of Scope");
  expect(problemIdx).toBeLessThan(solutionIdx);
  expect(solutionIdx).toBeLessThan(storiesIdx);
  expect(storiesIdx).toBeLessThan(decisionsIdx);
  expect(decisionsIdx).toBeLessThan(testingIdx);
  expect(testingIdx).toBeLessThan(oosIdx);
});
```

Also update the existing Git metadata tests to expect NO Git section. Replace all git metadata tests to verify removal:

```typescript
test("does not render git metadata section (removed)", () => {
  const body = formatEpicBody({
    ...makeManifest(),
    gitMetadata: {
      branch: "feature/my-branch",
      phaseTags: { design: "beastmode/my-epic/design" },
      version: "1.0.0",
      mergeCommit: { sha: "abc1234def5678", url: "https://github.com/org/repo/commit/abc1234def5678" },
      compareUrl: "https://github.com/org/repo/compare/main...feature/my-branch",
    },
  });
  expect(body).not.toContain("## Git");
  expect(body).not.toContain("**Branch:**");
  expect(body).not.toContain("**Tags:**");
  expect(body).not.toContain("**Version:**");
  expect(body).not.toContain("**Merge Commit:**");
  expect(body).not.toContain("**Compare:**");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: FAIL — new prdSections fields don't exist, Git section still renders.

- [ ] **Step 3: Expand EpicBodyInput interface**

In `cli/src/github/sync.ts`, add `testingDecisions` and `outOfScope` to the `prdSections` type, and add the `epic` field:

```typescript
export interface EpicBodyInput {
  slug: string;
  /** Human-readable epic name for title construction. */
  epic?: string;
  phase: Phase;
  summary?: { problem: string; solution: string };
  features: Array<{
    slug: string;
    status: "pending" | "in-progress" | "completed" | "blocked" | "cancelled";
    github?: { issue: number };
  }>;
  /** PRD sections extracted from design artifact. */
  prdSections?: {
    problem?: string;
    solution?: string;
    userStories?: string;
    decisions?: string;
    testingDecisions?: string;
    outOfScope?: string;
  };
  /** Artifact links per phase — repo path + optional permalink. */
  artifactLinks?: Record<string, { repoPath: string; permalink?: string }>;
  /** GitHub repo in "owner/repo" format — needed for permalink construction. */
  repo?: string;
}
```

Note: `gitMetadata` field removed from EpicBodyInput entirely.

- [ ] **Step 4: Update formatEpicBody to render new sections and remove Git**

Replace the function body in `cli/src/github/sync.ts`:

```typescript
export function formatEpicBody(input: EpicBodyInput): string {
  const sections: string[] = [];

  // Phase badge
  sections.push(`**Phase:** ${input.phase}`);

  // Problem/solution — prdSections override summary when present
  const problem = input.prdSections?.problem ?? input.summary?.problem;
  if (problem) {
    sections.push(`## Problem\n\n${problem}`);
  }
  const solution = input.prdSections?.solution ?? input.summary?.solution;
  if (solution) {
    sections.push(`## Solution\n\n${solution}`);
  }

  // PRD user stories and decisions (only from prdSections)
  if (input.prdSections?.userStories) {
    sections.push(`## User Stories\n\n${input.prdSections.userStories}`);
  }
  if (input.prdSections?.decisions) {
    sections.push(`## Decisions\n\n${input.prdSections.decisions}`);
  }
  if (input.prdSections?.testingDecisions) {
    sections.push(`## Testing Decisions\n\n${input.prdSections.testingDecisions}`);
  }
  if (input.prdSections?.outOfScope) {
    sections.push(`## Out of Scope\n\n${input.prdSections.outOfScope}`);
  }

  // Artifact links table
  if (input.artifactLinks) {
    const entries = Object.entries(input.artifactLinks);
    if (entries.length > 0) {
      const rows = entries.map(([phase, { repoPath, permalink }]) => {
        const link = permalink ? `[${repoPath}](${permalink})` : repoPath;
        return `| ${phase} | ${link} |`;
      });
      sections.push(
        `## Artifacts\n\n| Phase | Link |\n|-------|------|\n${rows.join("\n")}`,
      );
    }
  }

  // Feature checklist — exclude cancelled
  const activeFeatures = input.features.filter(
    (f) => f.status !== "cancelled",
  );
  if (activeFeatures.length > 0) {
    const lines = activeFeatures.map((f) => {
      const checked = f.status === "completed" ? "x" : " ";
      const ref = f.github?.issue ? `#${f.github.issue}` : f.slug;
      return `- [${checked}] ${ref} ${f.slug}`;
    });
    sections.push(`## Features\n\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}
```

- [ ] **Step 5: Update readPrdSections to extract Testing Decisions and Out of Scope**

In `cli/src/github/sync.ts`, update `readPrdSections()`:

```typescript
function readPrdSections(
  manifest: PipelineManifest,
  projectRoot: string,
): EpicBodyInput["prdSections"] | undefined {
  const designPaths = manifest.artifacts?.["design"];
  if (!designPaths || designPaths.length === 0) return undefined;

  const designPath = resolve(projectRoot, designPaths[0]);
  if (!existsSync(designPath)) return undefined;

  try {
    const content = readFileSync(designPath, "utf-8");
    const sections = extractSections(content, [
      "Problem Statement",
      "Solution",
      "User Stories",
      "Implementation Decisions",
      "Testing Decisions",
      "Out of Scope",
    ]);

    const result: EpicBodyInput["prdSections"] = {};
    if (sections["Problem Statement"]) result.problem = sections["Problem Statement"];
    if (sections["Solution"]) result.solution = sections["Solution"];
    if (sections["User Stories"]) result.userStories = sections["User Stories"];
    if (sections["Implementation Decisions"]) result.decisions = sections["Implementation Decisions"];
    if (sections["Testing Decisions"]) result.testingDecisions = sections["Testing Decisions"];
    if (sections["Out of Scope"]) result.outOfScope = sections["Out of Scope"];

    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 6: Remove resolveGitMetadata calls from syncGitHub**

In `syncGitHub()`, remove the `gitMetadata` variable and stop passing it to `formatEpicBody`:

1. Remove line `const gitMetadata = resolveGitMetadata(manifest, repo);`
2. Remove `gitMetadata,` from both `formatEpicBody()` call sites (creation at ~line 570, update at ~line 604)

- [ ] **Step 7: Update existing tests — remove Git metadata tests, update for no Git section**

In `cli/src/__tests__/body-format.test.ts`:
- Remove all individual `gitMetadata` test cases (lines 262-407) — the entire `// --- gitMetadata ---` section
- Replace with a single "no Git section" test (from Step 1 above)

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/body-format.test.ts
git commit -m "feat(body-enrichment): expand epic body with full PRD, remove Git section"
```

---

### Task 3: Expand FeatureBodyInput with plan sections

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:82-87` (FeatureBodyInput interface)
- Modify: `cli/src/github/sync.ts:181-201` (formatFeatureBody function)
- Modify: `cli/src/github/sync.ts:720-733` (syncFeature — read plan sections)
- Modify: `cli/src/__tests__/body-format.test.ts`

- [ ] **Step 1: Write failing tests for new feature body sections**

Add tests to `cli/src/__tests__/body-format.test.ts` inside the `formatFeatureBody` describe block:

```typescript
test("renders what-to-build section when whatToBuild present", () => {
  const body = formatFeatureBody(
    { slug: "feat-a", description: "desc", whatToBuild: "### Component\n\nBuild the thing" },
    42,
  );
  expect(body).toContain("## What to Build\n\n### Component\n\nBuild the thing");
});

test("omits what-to-build section when whatToBuild absent", () => {
  const body = formatFeatureBody(
    { slug: "feat-a", description: "desc" },
    42,
  );
  expect(body).not.toContain("## What to Build");
});

test("renders acceptance criteria section when acceptanceCriteria present", () => {
  const body = formatFeatureBody(
    { slug: "feat-a", description: "desc", acceptanceCriteria: "- [ ] Works\n- [ ] Tests pass" },
    42,
  );
  expect(body).toContain("## Acceptance Criteria\n\n- [ ] Works\n- [ ] Tests pass");
});

test("omits acceptance criteria section when acceptanceCriteria absent", () => {
  const body = formatFeatureBody(
    { slug: "feat-a", description: "desc" },
    42,
  );
  expect(body).not.toContain("## Acceptance Criteria");
});

test("feature body sections appear in correct order: description, user story, what to build, acceptance criteria, epic ref", () => {
  const body = formatFeatureBody(
    {
      slug: "feat-a",
      description: "Description text",
      userStory: "As a user...",
      whatToBuild: "Build this",
      acceptanceCriteria: "- [ ] Done",
    },
    42,
  );
  const descIdx = body.indexOf("Description text");
  const storyIdx = body.indexOf("## User Story");
  const buildIdx = body.indexOf("## What to Build");
  const criteriaIdx = body.indexOf("## Acceptance Criteria");
  const epicIdx = body.indexOf("**Epic:** #42");
  expect(descIdx).toBeLessThan(storyIdx);
  expect(storyIdx).toBeLessThan(buildIdx);
  expect(buildIdx).toBeLessThan(criteriaIdx);
  expect(criteriaIdx).toBeLessThan(epicIdx);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: FAIL — FeatureBodyInput doesn't have `whatToBuild` or `acceptanceCriteria`.

- [ ] **Step 3: Expand FeatureBodyInput interface**

In `cli/src/github/sync.ts`:

```typescript
/** Minimal feature input — decoupled from full ManifestFeature. */
export interface FeatureBodyInput {
  slug: string;
  description?: string;
  /** User story text extracted from the feature plan. */
  userStory?: string;
  /** What to Build section from the feature plan. */
  whatToBuild?: string;
  /** Acceptance Criteria section from the feature plan. */
  acceptanceCriteria?: string;
}
```

- [ ] **Step 4: Update formatFeatureBody to render new sections**

```typescript
export function formatFeatureBody(
  input: FeatureBodyInput,
  epicNumber: number,
): string {
  const sections: string[] = [];

  if (input.description) {
    sections.push(input.description);
  } else {
    sections.push(`## ${input.slug}`);
  }

  // User story (optional, from feature plan)
  if (input.userStory) {
    sections.push(`## User Story\n\n${input.userStory}`);
  }

  // What to Build (optional, from feature plan)
  if (input.whatToBuild) {
    sections.push(`## What to Build\n\n${input.whatToBuild}`);
  }

  // Acceptance Criteria (optional, from feature plan)
  if (input.acceptanceCriteria) {
    sections.push(`## Acceptance Criteria\n\n${input.acceptanceCriteria}`);
  }

  sections.push(`**Epic:** #${epicNumber}`);

  return sections.join("\n\n");
}
```

- [ ] **Step 5: Update syncFeature to extract What to Build and Acceptance Criteria from plan**

In `cli/src/github/sync.ts`, update the plan reading in `syncFeature()`:

```typescript
  // Read plan sections from feature plan (if projectRoot available)
  let userStory: string | undefined;
  let whatToBuild: string | undefined;
  let acceptanceCriteria: string | undefined;
  if (opts.projectRoot && feature.plan) {
    const planPath = resolve(opts.projectRoot, feature.plan);
    try {
      if (existsSync(planPath)) {
        const planContent = readFileSync(planPath, "utf-8");
        const section = extractSection(planContent, "User Stories");
        if (section) userStory = section;
        const wtb = extractSection(planContent, "What to Build");
        if (wtb) whatToBuild = wtb;
        const ac = extractSection(planContent, "Acceptance Criteria");
        if (ac) acceptanceCriteria = ac;
      }
    } catch {
      // Graceful degradation
    }
  }
```

Then update both `formatFeatureBody` call sites (create at ~line 741, update at ~line 800) to pass the new fields:

```typescript
const featureBody = formatFeatureBody(
  { slug: feature.slug, description: feature.description, userStory, whatToBuild, acceptanceCriteria },
  epicNumber,
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/body-format.test.ts
git commit -m "feat(body-enrichment): expand feature body with full plan sections"
```

---

### Task 4: Epic and feature title enrichment

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- Modify: `cli/src/github/sync.ts:556-620` (syncGitHub — epic title logic)
- Modify: `cli/src/github/sync.ts:711-773` (syncFeature — feature title logic)
- Modify: `cli/src/__tests__/body-format.test.ts` (title tests)

- [ ] **Step 1: Write failing tests for title formatting**

Add to `cli/src/__tests__/body-format.test.ts`:

```typescript
// At the top, import the title helpers:
import { epicTitle, featureTitle } from "../github/sync";

// New describe block after the existing ones:

describe("epicTitle", () => {
  test("returns epic name when available", () => {
    expect(epicTitle("a1b2c3", "logging-cleanup")).toBe("logging-cleanup");
  });

  test("falls back to slug when epic name is undefined", () => {
    expect(epicTitle("a1b2c3", undefined)).toBe("a1b2c3");
  });

  test("falls back to slug when epic name is empty string", () => {
    expect(epicTitle("a1b2c3", "")).toBe("a1b2c3");
  });
});

describe("featureTitle", () => {
  test("prefixes feature slug with epic name", () => {
    expect(featureTitle("logging-cleanup", "core-logger")).toBe("logging-cleanup: core-logger");
  });

  test("uses just feature slug when epic name is undefined", () => {
    expect(featureTitle(undefined, "core-logger")).toBe("core-logger");
  });

  test("uses just feature slug when epic name is empty", () => {
    expect(featureTitle("", "core-logger")).toBe("core-logger");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: FAIL — `epicTitle` and `featureTitle` don't exist.

- [ ] **Step 3: Add title helper functions**

In `cli/src/github/sync.ts`, after the formatters but before the sync engine section, add:

```typescript
/**
 * Build the epic issue title from the human-readable epic name.
 * Falls back to slug if epic name is unavailable.
 */
export function epicTitle(slug: string, epicName?: string): string {
  return epicName || slug;
}

/**
 * Build the feature issue title with epic name prefix.
 * Format: "{epic}: {feature}" or just "{feature}" if epic name unavailable.
 */
export function featureTitle(epicName: string | undefined, featureSlug: string): string {
  return epicName ? `${epicName}: ${featureSlug}` : featureSlug;
}
```

- [ ] **Step 4: Update syncGitHub to use epicTitle for creation**

In `syncGitHub()`, replace:
```typescript
epicNumber = await ghIssueCreate(
  repo,
  manifest.slug,
  initialEpicBody,
```
with:
```typescript
epicNumber = await ghIssueCreate(
  repo,
  epicTitle(manifest.slug, manifest.epic),
  initialEpicBody,
```

- [ ] **Step 5: Update syncGitHub to update epic title on body updates**

In the epic body update block (after `if (!epicJustCreated)`), add title update before the body hash check:

```typescript
  // Update epic title to use human-readable name
  const expectedEpicTitle = epicTitle(manifest.slug, manifest.epic);
  await ghIssueEdit(repo, epicNumber, { title: expectedEpicTitle }, { logger: opts.logger });
```

- [ ] **Step 6: Update syncFeature to use featureTitle for creation**

In `syncFeature()`, replace:
```typescript
featureNumber = await ghIssueCreate(
  repo,
  feature.slug,
  featureBody,
```
with:
```typescript
featureNumber = await ghIssueCreate(
  repo,
  featureTitle(manifest.epic, feature.slug),
  featureBody,
```

But `syncFeature` doesn't have access to `manifest.epic`. We need to thread it through. Update the function signature:

```typescript
async function syncFeature(
  repo: string,
  owner: string,
  epicNumber: number,
  epicName: string | undefined,
  feature: ManifestFeature,
  ...
```

And the call site:
```typescript
await syncFeature(repo, owner, epicNumber, manifest.epic, feature, resolved, result, opts);
```

- [ ] **Step 7: Update syncFeature to update feature title on body updates**

In the feature body update block (after `if (!featureJustCreated)`), add title update:

```typescript
  // Update feature title with epic name prefix
  const expectedFeatureTitle = featureTitle(epicName, feature.slug);
  await ghIssueEdit(repo, featureNumber, { title: expectedFeatureTitle }, { logger: opts.logger });
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun --bun vitest run src/__tests__/body-format.test.ts`
Expected: PASS

- [ ] **Step 9: Run full test suite**

Run: `bun --bun vitest run`
Expected: All previously-passing tests still pass.

- [ ] **Step 10: Commit**

```bash
git add cli/src/github/sync.ts cli/src/github/cli.ts cli/src/__tests__/body-format.test.ts
git commit -m "feat(body-enrichment): use human-readable names for issue titles"
```

---

### Task 5: Integration test GREEN verification

**Wave:** 3
**Depends on:** Task 2, Task 3, Task 4

**Files:**
- Modify: `cli/src/__tests__/body-enrichment.integration.test.ts` (fix any type issues from Task 0)

- [ ] **Step 1: Run the integration test**

Run: `bun --bun vitest run src/__tests__/body-enrichment.integration.test.ts`
Expected: PASS — all assertions should now be satisfied.

- [ ] **Step 2: Fix any remaining type/assertion issues**

If any tests fail due to type changes or assertion mismatches, fix the integration test to match the actual API.

- [ ] **Step 3: Run full test suite**

Run: `bun --bun vitest run`
Expected: All previously-passing tests still pass, integration test passes.

- [ ] **Step 4: Commit (if changes were needed)**

```bash
git add cli/src/__tests__/body-enrichment.integration.test.ts
git commit -m "test(body-enrichment): integration test GREEN"
```
