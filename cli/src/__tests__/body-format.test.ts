import { describe, test, expect } from "vitest";
import type { EpicBodyInput, FeatureBodyInput } from "../github/sync";
import { formatEpicBody, formatFeatureBody, formatClosingComment, buildCompareUrl, epicTitle, featureTitle } from "../github/sync";

type EpicFeature = EpicBodyInput["features"][0];

function makeManifest(
  overrides: Partial<EpicBodyInput> = {},
): EpicBodyInput {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    ...overrides,
  };
}

/** Factory for epic feature list entries (used in EpicBodyInput.features). */
function makeFeature(
  overrides: Partial<EpicFeature> = {},
): EpicFeature {
  return {
    slug: "feat-a",
    status: "pending",
    ...overrides,
  };
}

/** Factory for FeatureBodyInput (used with formatFeatureBody). */
function makeFeatureBody(
  overrides: Partial<FeatureBodyInput> = {},
): FeatureBodyInput {
  return {
    slug: "feat-a",
    ...overrides,
  };
}

// --- formatEpicBody ---

describe("formatEpicBody", () => {
  test("does not include phase badge", () => {
    const manifest = makeManifest({ phase: "design" });
    const body = formatEpicBody(manifest);

    expect(body).not.toContain("**Phase:**");
  });

  test("includes problem and solution sections when summary present", () => {
    const manifest = makeManifest();
    const body = formatEpicBody({
      ...manifest,
      summary: { problem: "The problem", solution: "The solution" },
    });

    expect(body).toContain("## Problem\n\nThe problem");
    expect(body).toContain("## Solution\n\nThe solution");
  });

  test("omits problem and solution when summary missing", () => {
    const manifest = makeManifest();
    const body = formatEpicBody(manifest);

    expect(body).not.toContain("## Problem");
    expect(body).not.toContain("## Solution");
  });

  test("omits problem section when problem is empty string", () => {
    const manifest = makeManifest();
    const body = formatEpicBody({
      ...manifest,
      summary: { problem: "", solution: "The solution" },
    });

    expect(body).not.toContain("## Problem");
  });

  test("shows feature checklist with checkboxes", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "pending" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("- [ ]");
    expect(body).toContain("- [x]");
  });

  test("shows issue link when feature has github issue", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", github: { issue: 42 } }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("#42");
  });

  test("shows plain slug when feature has no github issue", () => {
    const manifest = makeManifest({
      features: [makeFeature({ slug: "feat-a" })],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("feat-a");
    // Feature line should not have an issue number reference like #42
    expect(body).not.toMatch(/#\d+/);
  });

  test("excludes cancelled features", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-keep", status: "pending" }),
        makeFeature({ slug: "feat-drop", status: "cancelled" as any }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("feat-keep");
    expect(body).not.toContain("feat-drop");
  });

  test("preserves manifest array order", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "charlie", status: "pending" }),
        makeFeature({ slug: "alpha", status: "pending" }),
        makeFeature({ slug: "bravo", status: "pending" }),
      ],
    });
    const body = formatEpicBody(manifest);

    const charlieIdx = body.indexOf("charlie");
    const alphaIdx = body.indexOf("alpha");
    const bravoIdx = body.indexOf("bravo");

    expect(charlieIdx).toBeLessThan(alphaIdx);
    expect(alphaIdx).toBeLessThan(bravoIdx);
  });

  test("handles empty feature list", () => {
    const manifest = makeManifest({ features: [] });
    const body = formatEpicBody(manifest);

    // No features section when list is empty — nothing to show
    expect(body).not.toContain("## Features");
  });

  test("handles all features completed", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "completed" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    // All should be checked
    expect(body).not.toContain("- [ ]");
    expect(body).toContain("- [x]");
  });

  test("graceful fallback: checklist without summary, no phase badge", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "pending" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).not.toContain("**Phase:**");
    expect(body).toContain("- [ ]");
    expect(body).toContain("- [x]");
    expect(body).not.toContain("## Problem");
    expect(body).not.toContain("## Solution");
  });

  // --- prdSections ---

  test("renders prdSections.problem overriding summary.problem", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      summary: { problem: "short", solution: "sol" },
      prdSections: { problem: "Rich PRD problem statement" },
    });
    expect(body).toContain("## Problem\n\nRich PRD problem statement");
    expect(body).not.toContain("short");
  });

  test("falls back to summary.problem when prdSections.problem absent", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      summary: { problem: "short problem", solution: "sol" },
      prdSections: { userStories: "stories" },
    });
    expect(body).toContain("## Problem\n\nshort problem");
  });

  test("renders prdSections.solution overriding summary.solution", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      summary: { problem: "p", solution: "short sol" },
      prdSections: { solution: "Rich PRD solution" },
    });
    expect(body).toContain("## Solution\n\nRich PRD solution");
    expect(body).not.toContain("short sol");
  });

  test("renders user stories section when prdSections.userStories present", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      prdSections: { userStories: "1. As a user..." },
    });
    expect(body).toContain("## User Stories\n\n1. As a user...");
  });

  test("omits user stories section when prdSections.userStories absent", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      prdSections: { problem: "p" },
    });
    expect(body).not.toContain("## User Stories");
  });

  test("renders decisions section when prdSections.decisions present", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      prdSections: { decisions: "- Decision 1\n- Decision 2" },
    });
    expect(body).toContain("## Decisions\n\n- Decision 1\n- Decision 2");
  });

  test("omits decisions section when prdSections absent", () => {
    const body = formatEpicBody(makeManifest());
    expect(body).not.toContain("## Decisions");
  });

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

  // --- artifactLinks ---

  test("renders artifact links table with permalinks", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      artifactLinks: {
        design: { repoPath: ".beastmode/artifacts/design/slug.md", permalink: "https://github.com/owner/repo/blob/abc123/.beastmode/artifacts/design/slug.md" },
        plan: { repoPath: ".beastmode/artifacts/plan/slug.md" },
      },
    });
    expect(body).toContain("## Artifacts");
    expect(body).toContain("| Phase | Link |");
    expect(body).toContain("[.beastmode/artifacts/design/slug.md](https://github.com/owner/repo/blob/abc123/.beastmode/artifacts/design/slug.md)");
    expect(body).toContain("| plan | .beastmode/artifacts/plan/slug.md |");
  });

  test("omits artifact links section when artifactLinks absent", () => {
    const body = formatEpicBody(makeManifest());
    expect(body).not.toContain("## Artifacts");
  });

  test("omits artifact links section when artifactLinks is empty object", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      artifactLinks: {},
    });
    expect(body).not.toContain("## Artifacts");
  });

  // --- gitMetadata removed ---

  test("does not render git metadata section (removed)", () => {
    // gitMetadata field removed from EpicBodyInput — Git section no longer rendered
    const body = formatEpicBody(makeManifest());
    expect(body).not.toContain("## Git");
  });

});

// --- formatFeatureBody ---

describe("formatFeatureBody", () => {
  test("includes description when present", () => {
    const feature = makeFeatureBody({ slug: "feat-a" });
    const body = formatFeatureBody(
      { ...feature, description: "Feature details" },
      42,
    );

    expect(body).toContain("Feature details");
  });

  test("includes epic back-reference", () => {
    const feature = makeFeatureBody({ slug: "feat-a" });
    const body = formatFeatureBody(feature, 42);

    expect(body).toContain("**Epic:** #42");
  });

  test("falls back to stub format when description missing", () => {
    const feature = makeFeatureBody({ slug: "feat-a" });
    const body = formatFeatureBody(feature, 42);

    expect(body).toContain("feat-a");
    expect(body).toContain("**Epic:** #42");
  });

  test("falls back to stub format when description is empty string", () => {
    const feature = makeFeatureBody({ slug: "feat-a" });
    const body = formatFeatureBody({ ...feature, description: "" }, 42);

    expect(body).toContain("feat-a");
    expect(body).toContain("**Epic:** #42");
  });

  // --- userStory ---

  test("renders user story section when userStory present", () => {
    const body = formatFeatureBody(
      { slug: "feat-a", description: "desc", userStory: "As a user, I want..." },
      42,
    );
    expect(body).toContain("## User Story\n\nAs a user, I want...");
  });

  test("omits user story section when userStory absent", () => {
    const body = formatFeatureBody(
      { slug: "feat-a", description: "desc" },
      42,
    );
    expect(body).not.toContain("## User Story");
  });

  test("omits user story section when userStory is empty string", () => {
    const body = formatFeatureBody(
      { slug: "feat-a", description: "desc", userStory: "" },
      42,
    );
    expect(body).not.toContain("## User Story");
  });

  test("user story appears before epic back-reference", () => {
    const body = formatFeatureBody(
      { slug: "feat-a", userStory: "As a user..." },
      42,
    );
    const storyIdx = body.indexOf("## User Story");
    const epicIdx = body.indexOf("**Epic:** #42");
    expect(storyIdx).toBeGreaterThan(-1);
    expect(epicIdx).toBeGreaterThan(storyIdx);
  });

  // --- whatToBuild ---

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

  // --- acceptanceCriteria ---

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

  // --- section ordering ---

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
});

// --- formatClosingComment ---

describe("formatClosingComment", () => {
  test("renders release header with version", () => {
    const comment = formatClosingComment({
      version: "1.2.0",
      releaseTag: "v1.2.0",
      mergeCommit: "abc1234567890",
      repo: "org/repo",
    });
    expect(comment).toContain("## Released: 1.2.0");
  });

  test("renders tag link", () => {
    const comment = formatClosingComment({
      version: "1.2.0",
      releaseTag: "v1.2.0",
      mergeCommit: "abc1234567890",
      repo: "org/repo",
    });
    expect(comment).toContain("[`v1.2.0`](https://github.com/org/repo/tree/v1.2.0)");
  });

  test("renders merge commit link with short SHA", () => {
    const comment = formatClosingComment({
      version: "1.2.0",
      releaseTag: "v1.2.0",
      mergeCommit: "abc1234567890",
      repo: "org/repo",
    });
    expect(comment).toContain("[`abc1234`](https://github.com/org/repo/commit/abc1234567890)");
  });

  test("renders all fields together", () => {
    const comment = formatClosingComment({
      version: "0.65.0",
      releaseTag: "v0.65.0",
      mergeCommit: "deadbeef1234567",
      repo: "org/repo",
    });
    expect(comment).toContain("## Released: 0.65.0");
    expect(comment).toContain("[`v0.65.0`](https://github.com/org/repo/tree/v0.65.0)");
    expect(comment).toContain("[`deadbee`](https://github.com/org/repo/commit/deadbeef1234567)");
  });
});

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

// --- epicTitle ---

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

// --- featureTitle ---

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
