import { describe, test, expect } from "bun:test";
import type { PipelineManifest, ManifestFeature } from "../manifest-store";
import { formatEpicBody, formatFeatureBody, formatClosingComment } from "../body-format";

function makeManifest(
  overrides: Partial<PipelineManifest> = {},
): PipelineManifest {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: "2026-03-29T00:00:00Z",
    ...overrides,
  };
}

function makeFeature(
  overrides: Partial<ManifestFeature> = {},
): ManifestFeature {
  return {
    slug: "feat-a",
    plan: "plan-a.md",
    status: "pending",
    ...overrides,
  };
}

// --- formatEpicBody ---

describe("formatEpicBody", () => {
  test("includes phase badge", () => {
    const manifest = makeManifest({ phase: "design" });
    const body = formatEpicBody(manifest);

    expect(body).toContain("**Phase:** design");
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

  test("graceful fallback: phase badge and checklist without summary", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "pending" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).toContain("**Phase:** design");
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

  // --- gitMetadata ---

  test("renders git metadata section with branch", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: { branch: "feature/my-branch" },
    });
    expect(body).toContain("## Git");
    expect(body).toContain("**Branch:** `feature/my-branch`");
  });

  test("renders git metadata with phase tags", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        phaseTags: {
          design: "beastmode/my-epic/design",
          plan: "beastmode/my-epic/plan",
        },
      },
    });
    expect(body).toContain("**Tags:** `beastmode/my-epic/design`, `beastmode/my-epic/plan`");
  });

  test("renders git metadata with version", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: { version: "1.2.3" },
    });
    expect(body).toContain("**Version:** 1.2.3");
  });

  test("renders git metadata with merge commit", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        mergeCommit: { sha: "abc1234def5678", url: "https://github.com/org/repo/commit/abc1234def5678" },
      },
    });
    expect(body).toContain("**Merge Commit:** [abc1234](https://github.com/org/repo/commit/abc1234def5678)");
  });

  test("renders full git metadata section with all fields", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {
        branch: "feature/epic-branch",
        phaseTags: { design: "beastmode/epic/design" },
        version: "2.0.0",
        mergeCommit: { sha: "deadbeef12345678", url: "https://github.com/org/repo/commit/deadbeef12345678" },
      },
    });
    expect(body).toContain("## Git");
    expect(body).toContain("**Branch:** `feature/epic-branch`");
    expect(body).toContain("**Tags:** `beastmode/epic/design`");
    expect(body).toContain("**Version:** 2.0.0");
    expect(body).toContain("**Merge Commit:** [deadbee](https://github.com/org/repo/commit/deadbeef12345678)");
  });

  test("omits git metadata section when gitMetadata absent", () => {
    const body = formatEpicBody(makeManifest());
    expect(body).not.toContain("## Git");
  });

  test("omits git metadata section when gitMetadata has no populated fields", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: {},
    });
    expect(body).not.toContain("## Git");
  });

  test("omits tags line when phaseTags is empty object", () => {
    const body = formatEpicBody({
      ...makeManifest(),
      gitMetadata: { branch: "main", phaseTags: {} },
    });
    expect(body).toContain("**Branch:** `main`");
    expect(body).not.toContain("**Tags:**");
  });
});

// --- formatFeatureBody ---

describe("formatFeatureBody", () => {
  test("includes description when present", () => {
    const feature = makeFeature({ slug: "feat-a" });
    const body = formatFeatureBody(
      { ...feature, description: "Feature details" },
      42,
    );

    expect(body).toContain("Feature details");
  });

  test("includes epic back-reference", () => {
    const feature = makeFeature({ slug: "feat-a" });
    const body = formatFeatureBody(feature, 42);

    expect(body).toContain("**Epic:** #42");
  });

  test("falls back to stub format when description missing", () => {
    const feature = makeFeature({ slug: "feat-a" });
    const body = formatFeatureBody(feature, 42);

    expect(body).toContain("feat-a");
    expect(body).toContain("**Epic:** #42");
  });

  test("falls back to stub format when description is empty string", () => {
    const feature = makeFeature({ slug: "feat-a" });
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
