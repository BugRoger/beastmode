import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

/**
 * Integration test for git-push feature.
 *
 * Verifies that the pipeline runner pushes branches and tags
 * after each phase checkpoint, with proper error handling.
 */

// ---------- module-level mocks ----------

const mockCreate = vi.hoisted(() => vi.fn(async (slug: string) => ({
  slug,
  path: `/tmp/test-project/.claude/worktrees/${slug}`,
  branch: `feature/${slug}`,
})));
const mockRebase = vi.hoisted(() => vi.fn(async () => ({
  outcome: "success" as const,
  message: "rebased",
})));

vi.mock("../git/worktree.js", () => ({
  create: mockCreate,
  rebase: mockRebase,
  archive: vi.fn(async () => "archive/test-epic"),
  remove: vi.fn(async () => {}),
  createImplBranch: vi.fn(async (slug: string, feature: string) => `impl/${slug}--${feature}`),
}));

vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: vi.fn(() => ({ status: "completed", artifacts: {} }) as any),
}));

vi.mock("../manifest/store.js", () => ({
  load: vi.fn(() => ({
    slug: "test-epic",
    phase: "plan",
    features: [{ slug: "my-feature", github: { issue: 42 } }],
    artifacts: {},
    worktree: { branch: "feature/test-epic", path: "/tmp" },
    lastUpdated: new Date().toISOString(),
  }) as any),
  save: vi.fn(),
  transact: vi.fn(async (_r: string, _s: string, fn: Function) => fn({ slug: "test-epic" })),
  rename: vi.fn(async () => ({ renamed: false, finalSlug: "test-epic", completedSteps: [] })),
}));

vi.mock("../manifest/reconcile.js", () => ({
  reconcileDesign: vi.fn(async () => ({ phase: "plan", manifest: { slug: "test-epic" } })),
  reconcilePlan: vi.fn(async () => ({ phase: "implement", manifest: { slug: "test-epic" } })),
  reconcileFeature: vi.fn(async () => ({ phase: "implement", manifest: { slug: "test-epic" } })),
  reconcileImplement: vi.fn(async () => ({ phase: "validate", manifest: { slug: "test-epic" } })),
  reconcileValidate: vi.fn(async () => ({ phase: "release", manifest: { slug: "test-epic" } })),
  reconcileRelease: vi.fn(async () => ({ phase: "done", manifest: { slug: "test-epic" } })),
}));

vi.mock("../git/tags.js", () => ({ createTag: vi.fn(async () => {}) }));
vi.mock("../github/sync.js", () => ({ syncGitHub: vi.fn(async () => ({ mutations: [] })), syncGitHubForEpic: vi.fn(async () => {}) }));
vi.mock("../github/discovery.js", () => ({ discoverGitHub: vi.fn(async () => null) }));
vi.mock("../manifest/pure.js", () => ({
  setGitHubEpic: vi.fn((m: any) => m),
  setFeatureGitHubIssue: vi.fn((m: any) => m),
  setEpicBodyHash: vi.fn((m: any) => m),
  setFeatureBodyHash: vi.fn((m: any) => m),
}));
vi.mock("../github/early-issues.js", () => ({ ensureEarlyIssues: vi.fn(async () => {}) }));
vi.mock("../git/commit-issue-ref.js", () => ({
  amendCommitsInRange: vi.fn(async () => ({ amended: 0, skipped: 0 })),
}));

// Mock push module — will be created in Task 1
const mockHasRemote = vi.hoisted(() => vi.fn(async () => true));
const mockPushBranches = vi.hoisted(() => vi.fn(async () => {}));
const mockPushTags = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../git/push.js", () => ({
  hasRemote: mockHasRemote,
  pushBranches: mockPushBranches,
  pushTags: mockPushTags,
}));

import { run } from "../pipeline/runner.js";
import type { PipelineConfig } from "../pipeline/runner.js";
import type { BeastmodeConfig } from "../config.js";

const noop = () => {};
const nullLogger = {
  log: noop, detail: noop, debug: noop, trace: noop, warn: noop, error: noop,
  child: () => nullLogger,
} as any;

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    phase: "plan",
    epicSlug: "test-epic",
    args: ["test-epic"],
    projectRoot: "/tmp/test-project",
    strategy: "interactive",
    config: {
      hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
      "file-permissions": { timeout: 60, "claude-settings": "test" },
      github: { enabled: false },
      cli: {},
    } as BeastmodeConfig,
    dispatch: async () => ({ success: true }),
    logger: nullLogger,
    ...overrides,
  };
}

// ---------- tests ----------

describe("@github-sync-polish: git-push integration", () => {
  beforeEach(() => {
    mockHasRemote.mockClear();
    mockPushBranches.mockClear();
    mockPushTags.mockClear();
    mockHasRemote.mockImplementation(async () => true);
    mockPushBranches.mockImplementation(async () => {});
    mockPushTags.mockImplementation(async () => {});
  });

  afterAll(() => vi.restoreAllMocks());

  describe("Feature branch pushed after design phase checkpoint", () => {
    it("pushes feature branch after design phase completes", async () => {
      await run(makeConfig({ phase: "design" }));

      expect(mockHasRemote).toHaveBeenCalled();
      expect(mockPushBranches).toHaveBeenCalled();
    });
  });

  describe("Impl branch pushed after implement phase checkpoint", () => {
    it("pushes impl branch during implement phase", async () => {
      await run(makeConfig({ phase: "implement", featureSlug: "my-feature" }));

      expect(mockPushBranches).toHaveBeenCalled();
      const callArgs = mockPushBranches.mock.calls[0];
      expect(callArgs).toBeDefined();
    });
  });

  describe("Feature branch pushed after each successive phase", () => {
    it("pushes feature branch on plan phase", async () => {
      await run(makeConfig({ phase: "plan" }));

      expect(mockPushBranches).toHaveBeenCalled();
    });
  });

  describe("Phase tags pushed after checkpoint", () => {
    it("pushes tags after checkpoint", async () => {
      await run(makeConfig({ phase: "plan" }));

      expect(mockPushTags).toHaveBeenCalled();
    });
  });

  describe("Archive tags pushed during release", () => {
    it("pushes tags during release phase", async () => {
      await run(makeConfig({ phase: "release" }));

      expect(mockPushTags).toHaveBeenCalled();
    });
  });

  describe("Push failure does not block the phase checkpoint", () => {
    it("continues when push fails", async () => {
      mockPushBranches.mockRejectedValue(new Error("remote unreachable"));

      const result = await run(makeConfig({ phase: "plan" }));

      expect(result.success).toBe(true);
    });

    it("continues when tag push fails", async () => {
      mockPushTags.mockRejectedValue(new Error("remote unreachable"));

      const result = await run(makeConfig({ phase: "plan" }));

      expect(result.success).toBe(true);
    });
  });

  describe("No push when no remote", () => {
    it("skips push when hasRemote returns false", async () => {
      mockHasRemote.mockImplementation(async () => false);

      await run(makeConfig({ phase: "plan" }));

      expect(mockPushBranches).not.toHaveBeenCalled();
      expect(mockPushTags).not.toHaveBeenCalled();
    });
  });
});
