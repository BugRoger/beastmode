/**
 * Unit tests for artifact link path normalization and rendering.
 *
 * Verifies that buildArtifactsMap correctly normalizes all path shapes
 * the store can produce, and that formatEpicBody renders clean
 * repo-relative paths in the artifact links table.
 */
import { describe, test, expect } from "vitest";
import { buildArtifactsMap, formatEpicBody } from "../github/sync";
import type { EpicBodyInput } from "../github/sync";

// ---------------------------------------------------------------------------
// buildArtifactsMap -- path normalization
// ---------------------------------------------------------------------------

describe("buildArtifactsMap path normalization", () => {
  test("normalizes absolute path to repo-relative format", () => {
    const result = buildArtifactsMap({
      design: "/Users/someone/.claude/worktrees/my-epic/.beastmode/artifacts/design/2026-04-12-my-epic.md",
    });
    expect(result).toBeDefined();
    expect(result!["design"]).toEqual([".beastmode/artifacts/design/2026-04-12-my-epic.md"]);
  });

  test("normalizes worktree-relative path to repo-relative format", () => {
    const result = buildArtifactsMap({
      plan: ".claude/worktrees/my-epic/.beastmode/artifacts/plan/2026-04-12-my-epic-feat.md",
    });
    expect(result).toBeDefined();
    expect(result!["plan"]).toEqual([".beastmode/artifacts/plan/2026-04-12-my-epic-feat.md"]);
  });

  test("preserves already-correct repo-relative path", () => {
    const result = buildArtifactsMap({
      implement: ".beastmode/artifacts/implement/2026-04-12-my-epic-impl.md",
    });
    expect(result).toBeDefined();
    expect(result!["implement"]).toEqual([".beastmode/artifacts/implement/2026-04-12-my-epic-impl.md"]);
  });

  test("normalizes bare filename to repo-relative format", () => {
    const result = buildArtifactsMap({
      validate: "2026-04-12-my-epic-validate.md",
    });
    expect(result).toBeDefined();
    expect(result!["validate"]).toEqual([".beastmode/artifacts/validate/2026-04-12-my-epic-validate.md"]);
  });

  test("normalizes all five phase types simultaneously", () => {
    const result = buildArtifactsMap({
      design: "/abs/path/.beastmode/artifacts/design/design.md",
      plan: ".claude/worktrees/slug/.beastmode/artifacts/plan/plan.md",
      implement: ".beastmode/artifacts/implement/implement.md",
      validate: "validate.md",
      release: "/tmp/worktree/.beastmode/artifacts/release/release.md",
    });
    expect(result).toBeDefined();
    expect(result!["design"]).toEqual([".beastmode/artifacts/design/design.md"]);
    expect(result!["plan"]).toEqual([".beastmode/artifacts/plan/plan.md"]);
    expect(result!["implement"]).toEqual([".beastmode/artifacts/implement/implement.md"]);
    expect(result!["validate"]).toEqual([".beastmode/artifacts/validate/validate.md"]);
    expect(result!["release"]).toEqual([".beastmode/artifacts/release/release.md"]);
  });

  test("returns undefined when no phase fields are present", () => {
    const result = buildArtifactsMap({});
    expect(result).toBeUndefined();
  });

  test("skips undefined phase fields", () => {
    const result = buildArtifactsMap({
      design: "/abs/design.md",
      plan: undefined,
    });
    expect(result).toBeDefined();
    expect(Object.keys(result!)).toEqual(["design"]);
  });

  test("handles path with spaces in directory names", () => {
    const result = buildArtifactsMap({
      design: "/Users/John Doe/Code/project/.beastmode/artifacts/design/my-file.md",
    });
    expect(result).toBeDefined();
    expect(result!["design"]).toEqual([".beastmode/artifacts/design/my-file.md"]);
  });

  test("handles deeply nested absolute path", () => {
    const result = buildArtifactsMap({
      design: "/a/b/c/d/e/f/g/.beastmode/artifacts/design/deep.md",
    });
    expect(result).toBeDefined();
    expect(result!["design"]).toEqual([".beastmode/artifacts/design/deep.md"]);
  });
});

// ---------------------------------------------------------------------------
// formatEpicBody -- artifact links table rendering
// ---------------------------------------------------------------------------

describe("formatEpicBody artifact links rendering", () => {
  function makeEpicInput(overrides: Partial<EpicBodyInput> = {}): EpicBodyInput {
    return {
      slug: "test-epic",
      phase: "implement",
      features: [],
      ...overrides,
    };
  }

  test("renders repo-relative path as plain text when no permalink", () => {
    const body = formatEpicBody(makeEpicInput({
      artifactLinks: {
        design: { repoPath: ".beastmode/artifacts/design/2026-04-12-test.md" },
      },
    }));
    expect(body).toContain("## Artifacts");
    expect(body).toContain("| design | .beastmode/artifacts/design/2026-04-12-test.md |");
  });

  test("renders permalink as markdown link when available", () => {
    const body = formatEpicBody(makeEpicInput({
      artifactLinks: {
        design: {
          repoPath: ".beastmode/artifacts/design/2026-04-12-test.md",
          permalink: "https://github.com/org/repo/blob/abc123/.beastmode/artifacts/design/2026-04-12-test.md",
        },
      },
    }));
    expect(body).toContain("[.beastmode/artifacts/design/2026-04-12-test.md](https://github.com/org/repo/blob/abc123/.beastmode/artifacts/design/2026-04-12-test.md)");
  });

  test("does not contain absolute filesystem paths in rendered body", () => {
    const body = formatEpicBody(makeEpicInput({
      artifactLinks: {
        design: { repoPath: ".beastmode/artifacts/design/test.md" },
        plan: {
          repoPath: ".beastmode/artifacts/plan/test.md",
          permalink: "https://github.com/org/repo/blob/def456/.beastmode/artifacts/plan/test.md",
        },
      },
    }));
    expect(body).not.toMatch(/\/(Users|home|tmp|var)\//);
    expect(body).not.toContain("worktrees");
  });

  test("renders multiple phase artifacts in table", () => {
    const body = formatEpicBody(makeEpicInput({
      artifactLinks: {
        design: { repoPath: ".beastmode/artifacts/design/d.md" },
        plan: { repoPath: ".beastmode/artifacts/plan/p.md" },
        implement: {
          repoPath: ".beastmode/artifacts/implement/i.md",
          permalink: "https://github.com/org/repo/blob/sha/.beastmode/artifacts/implement/i.md",
        },
      },
    }));
    expect(body).toContain("| Phase | Link |");
    expect(body).toContain("| design | .beastmode/artifacts/design/d.md |");
    expect(body).toContain("| plan | .beastmode/artifacts/plan/p.md |");
    expect(body).toContain("[.beastmode/artifacts/implement/i.md]");
  });

  test("omits artifact table when artifactLinks is undefined", () => {
    const body = formatEpicBody(makeEpicInput());
    expect(body).not.toContain("## Artifacts");
  });

  test("omits artifact table when artifactLinks is empty", () => {
    const body = formatEpicBody(makeEpicInput({ artifactLinks: {} }));
    expect(body).not.toContain("## Artifacts");
  });
});

// ---------------------------------------------------------------------------
// End-to-end: buildArtifactsMap output -> formatEpicBody rendering
// ---------------------------------------------------------------------------

describe("buildArtifactsMap -> formatEpicBody pipeline", () => {
  test("absolute path produces clean artifact table via full pipeline", () => {
    const artifactsMap = buildArtifactsMap({
      design: "/Users/dev/.claude/worktrees/my-slug/.beastmode/artifacts/design/2026-04-12-slug.md",
      plan: "/tmp/beastmode/.beastmode/artifacts/plan/2026-04-12-slug-feat.md",
    });
    expect(artifactsMap).toBeDefined();

    // Simulate what resolveArtifactLinks does (without git): use repo paths from map, no permalink
    const artifactLinks: Record<string, { repoPath: string }> = {};
    for (const [phase, paths] of Object.entries(artifactsMap!)) {
      artifactLinks[phase] = { repoPath: paths[0] };
    }

    const body = formatEpicBody({
      slug: "test-epic",
      phase: "implement",
      features: [],
      artifactLinks,
    });

    // Body should contain clean repo-relative paths
    expect(body).toContain(".beastmode/artifacts/design/2026-04-12-slug.md");
    expect(body).toContain(".beastmode/artifacts/plan/2026-04-12-slug-feat.md");

    // Body should NOT contain any absolute path fragments
    expect(body).not.toContain("/Users/dev");
    expect(body).not.toContain("/tmp/beastmode");
    expect(body).not.toContain("worktrees");
  });

  test("worktree-relative path produces clean artifact table via full pipeline", () => {
    const artifactsMap = buildArtifactsMap({
      design: ".claude/worktrees/epic-slug/.beastmode/artifacts/design/design-doc.md",
    });
    expect(artifactsMap).toBeDefined();

    const artifactLinks: Record<string, { repoPath: string }> = {};
    for (const [phase, paths] of Object.entries(artifactsMap!)) {
      artifactLinks[phase] = { repoPath: paths[0] };
    }

    const body = formatEpicBody({
      slug: "test-epic",
      phase: "plan",
      features: [],
      artifactLinks,
    });

    expect(body).toContain(".beastmode/artifacts/design/design-doc.md");
    expect(body).not.toContain(".claude/worktrees");
  });

  test("mixed path shapes all normalize correctly in pipeline", () => {
    const artifactsMap = buildArtifactsMap({
      design: "/abs/path/design-file.md",
      plan: ".claude/worktrees/slug/.beastmode/artifacts/plan/plan-file.md",
      implement: ".beastmode/artifacts/implement/impl-file.md",
      validate: "validate-file.md",
    });
    expect(artifactsMap).toBeDefined();

    const artifactLinks: Record<string, { repoPath: string }> = {};
    for (const [phase, paths] of Object.entries(artifactsMap!)) {
      artifactLinks[phase] = { repoPath: paths[0] };
    }

    const body = formatEpicBody({
      slug: "test-epic",
      phase: "validate",
      features: [],
      artifactLinks,
    });

    expect(body).toContain(".beastmode/artifacts/design/design-file.md");
    expect(body).toContain(".beastmode/artifacts/plan/plan-file.md");
    expect(body).toContain(".beastmode/artifacts/implement/impl-file.md");
    expect(body).toContain(".beastmode/artifacts/validate/validate-file.md");
    expect(body).not.toMatch(/\/(abs|Users|home|tmp)\//);
    expect(body).not.toContain("worktrees");
  });
});
