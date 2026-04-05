import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory";

// --- Module-level mocks (hoisted) ---
const mockGhIssueCreate = vi.hoisted(() => vi.fn());
vi.mock("../github/cli.js", () => ({
  ghIssueCreate: mockGhIssueCreate,
}));

const mockLoadSyncRefs = vi.hoisted(() => vi.fn());
const mockSaveSyncRefs = vi.hoisted(() => vi.fn());
vi.mock("../github/sync-refs.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../github/sync-refs.js")>();
  return {
    ...actual,
    loadSyncRefs: (...args: unknown[]) => mockLoadSyncRefs(...args),
    saveSyncRefs: (...args: unknown[]) => mockSaveSyncRefs(...args),
  };
});

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
  let store: InMemoryTaskStore;
  let epicId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverGitHub.mockResolvedValue({ repo: "owner/repo" });
    mockLoadSyncRefs.mockReturnValue({});
    store = new InMemoryTaskStore();
    const epic = store.addEpic({ name: "My Epic", slug: "my-epic" });
    epicId = epic.id;
  });

  describe("epic stub creation (design phase)", () => {
    it("creates epic stub issue before design phase when sync file has no epic issue", async () => {
      mockGhIssueCreate.mockResolvedValue(42);

      await ensureEarlyIssues({
        phase: "design",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "owner/repo",
        "My Epic",
        expect.any(String),
        ["type/epic", "phase/design"],
        { logger: nullLogger },
      );
      expect(mockSaveSyncRefs).toHaveBeenCalled();
    });

    it("skips epic creation when sync file already has epic issue number", async () => {
      mockLoadSyncRefs.mockReturnValue({ [epicId]: { issue: 42 } });

      await ensureEarlyIssues({
        phase: "design",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips epic creation for non-design phases", async () => {
      await ensureEarlyIssues({
        phase: "plan",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("warns and continues when epic creation fails", async () => {
      mockGhIssueCreate.mockResolvedValue(undefined);

      const warnSpy = vi.fn();
      const logger = { ...nullLogger, warn: warnSpy };

      await ensureEarlyIssues({
        phase: "design",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("epic stub"));
      expect(mockSaveSyncRefs).not.toHaveBeenCalled();
    });
  });

  describe("feature stub creation (implement phase)", () => {
    it("creates feature stub issues before implement phase", async () => {
      // Set up epic with sync ref
      mockLoadSyncRefs.mockReturnValue({ [epicId]: { issue: 10 } });

      // Add features to store
      store.addFeature({ parent: epicId, name: "Feat A", slug: "feat-a" });
      store.addFeature({ parent: epicId, name: "Feat B", slug: "feat-b" });

      mockGhIssueCreate
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(21);

      await ensureEarlyIssues({
        phase: "implement",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledTimes(2);
      expect(mockSaveSyncRefs).toHaveBeenCalled();
    });

    it("skips features that already have issue numbers", async () => {
      const featA = store.addFeature({ parent: epicId, name: "Feat A", slug: "feat-a" });
      store.addFeature({ parent: epicId, name: "Feat B", slug: "feat-b" });

      // feat-a already has an issue
      mockLoadSyncRefs.mockReturnValue({
        [epicId]: { issue: 10 },
        [featA.id]: { issue: 20 },
      });

      mockGhIssueCreate.mockResolvedValue(21);

      await ensureEarlyIssues({
        phase: "implement",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledTimes(1);
      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "owner/repo",
        "My Epic: feat-b",
        expect.any(String),
        ["type/feature", "status/ready"],
        { logger: nullLogger },
      );
    });

    it("skips feature creation for non-implement phases", async () => {
      store.addFeature({ parent: epicId, name: "Feat A", slug: "feat-a" });

      await ensureEarlyIssues({
        phase: "validate",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips feature creation when epic has no issue number", async () => {
      store.addFeature({ parent: epicId, name: "Feat A", slug: "feat-a" });
      mockLoadSyncRefs.mockReturnValue({}); // no epic ref

      await ensureEarlyIssues({
        phase: "implement",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });
  });

  describe("guards", () => {
    it("skips entirely when github.enabled is false", async () => {
      await ensureEarlyIssues({
        phase: "design",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: false } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockDiscoverGitHub).not.toHaveBeenCalled();
    });

    it("skips when GitHub discovery fails", async () => {
      mockDiscoverGitHub.mockResolvedValue(undefined);

      await ensureEarlyIssues({
        phase: "design",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips when epic not found in store", async () => {
      await ensureEarlyIssues({
        phase: "design",
        epicId: "nonexistent",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("uses pre-resolved GitHub data when provided", async () => {
      mockGhIssueCreate.mockResolvedValue(42);

      await ensureEarlyIssues({
        phase: "design",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store,
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
      const warnSpy = vi.fn();
      const logger = { ...nullLogger, warn: warnSpy };

      // Use a store that throws
      const badStore = {
        getEpic: () => { throw new Error("kaboom"); },
      } as any;

      await ensureEarlyIssues({
        phase: "design",
        epicId,
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        store: badStore,
        logger,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("kaboom"));
    });
  });
});
