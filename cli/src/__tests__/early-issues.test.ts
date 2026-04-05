import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Module-level mocks (hoisted) ---
const mockGhIssueCreate = vi.hoisted(() => vi.fn());
vi.mock("../github/cli.js", () => ({
  ghIssueCreate: mockGhIssueCreate,
}));

const mockStoreLoad = vi.hoisted(() => vi.fn());
const mockStoreTransact = vi.hoisted(() => vi.fn());
vi.mock("../manifest/store.js", () => ({
  load: mockStoreLoad,
  transact: mockStoreTransact,
}));

const mockDiscoverGitHub = vi.hoisted(() => vi.fn());
vi.mock("../github/discovery.js", () => ({
  discoverGitHub: mockDiscoverGitHub,
}));

import { ensureEarlyIssues } from "../github/early-issues.js";

const nullLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  child: () => nullLogger,
} as any;

describe("ensureEarlyIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverGitHub.mockResolvedValue({ repo: "owner/repo" });
  });

  describe("epic stub creation (design phase)", () => {
    it("creates epic stub issue before design phase when manifest has no epic issue", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(42);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn({ slug: "my-epic", phase: "design", features: [], artifacts: {}, lastUpdated: new Date().toISOString() });
      });

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "owner/repo",
        "my-epic",
        expect.any(String),
        ["type/epic", "phase/design"],
        { logger: nullLogger },
      );
      expect(mockStoreTransact).toHaveBeenCalled();
    });

    it("skips epic creation when manifest already has epic issue number", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        github: { epic: 42, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips epic creation for non-design phases", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "plan",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "plan",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("warns and continues when epic creation fails", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(undefined);

      const warnSpy = vi.fn();
      const logger = { ...nullLogger, warn: warnSpy };

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("epic stub"));
      expect(mockStoreTransact).not.toHaveBeenCalled();
    });
  });

  describe("feature stub creation (implement phase)", () => {
    it("creates feature stub issues before implement phase", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending" },
          { slug: "feat-b", plan: "plan-b", status: "pending" },
        ],
        artifacts: {},
        github: { epic: 10, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(21);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn(mockStoreLoad());
      });

      await ensureEarlyIssues({
        phase: "implement",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledTimes(2);
      expect(mockStoreTransact).toHaveBeenCalled();
    });

    it("skips features that already have issue numbers", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending", github: { issue: 20 } },
          { slug: "feat-b", plan: "plan-b", status: "pending" },
        ],
        artifacts: {},
        github: { epic: 10, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(21);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn(mockStoreLoad());
      });

      await ensureEarlyIssues({
        phase: "implement",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledTimes(1);
      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "owner/repo",
        "feat-b",
        expect.any(String),
        ["type/feature", "status/ready"],
        { logger: nullLogger },
      );
    });

    it("skips feature creation for non-implement phases", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "validate",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending" },
        ],
        artifacts: {},
        github: { epic: 10, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "validate",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips feature creation when epic has no issue number", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending" },
        ],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "implement",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });
  });

  describe("guards", () => {
    it("skips entirely when github.enabled is false", async () => {
      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: false } } as any,
        logger: nullLogger,
      });

      expect(mockStoreLoad).not.toHaveBeenCalled();
      expect(mockDiscoverGitHub).not.toHaveBeenCalled();
    });

    it("skips when GitHub discovery fails", async () => {
      mockDiscoverGitHub.mockResolvedValue(undefined);

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips when manifest not found", async () => {
      mockStoreLoad.mockReturnValue(null);

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("uses pre-resolved GitHub data when provided", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(42);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn(mockStoreLoad());
      });

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        resolved: { repo: "pre/resolved" } as any,
        logger: nullLogger,
      });

      expect(mockDiscoverGitHub).not.toHaveBeenCalled();
      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "pre/resolved",
        expect.any(String),
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("never throws — catches exceptions and warns", async () => {
      mockStoreLoad.mockImplementation(() => { throw new Error("kaboom"); });

      const warnSpy = vi.fn();
      const logger = { ...nullLogger, warn: warnSpy };

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("kaboom"));
    });
  });
});
