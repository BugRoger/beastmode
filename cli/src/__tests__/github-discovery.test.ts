/**
 * Unit tests for GitHub discovery — cache management and orchestration.
 *
 * Mocks the gh.ts module to control discovery results and uses a
 * temporary directory for cache file operations.
 */

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock infrastructure ---

let mockRepoDiscover: (() => Promise<string | undefined>) | undefined;
let mockProjectDiscover:
  | ((owner: string, name: string) => Promise<{ number: number; id: string } | undefined>)
  | undefined;
let mockFieldDiscover:
  | ((projectId: string, fieldName: string) => Promise<{ fieldId: string; options: Record<string, string> } | undefined>)
  | undefined;

mock.module("../github/cli", () => ({
  ghRepoDiscover: async (...args: unknown[]) => {
    return mockRepoDiscover ? mockRepoDiscover() : undefined;
  },
  ghProjectDiscover: async (owner: string, name: string, ...rest: unknown[]) => {
    return mockProjectDiscover ? mockProjectDiscover(owner, name) : undefined;
  },
  ghFieldDiscover: async (projectId: string, fieldName: string, ...rest: unknown[]) => {
    return mockFieldDiscover ? mockFieldDiscover(projectId, fieldName) : undefined;
  },
}));

import { discoverGitHub, type ResolvedGitHub } from "../github/discovery";

// --- Test helpers ---

let tmpDir: string;

function setupTmpDir(): void {
  tmpDir = mkdtempSync(join(tmpdir(), "beastmode-discovery-test-"));
  // Create the .beastmode/state directory
  const stateDir = join(tmpDir, ".beastmode", "state");
  mkdtempSync; // noop, just for visibility
  Bun.spawnSync(["mkdir", "-p", stateDir]);
}

function teardownTmpDir(): void {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function cachePath(): string {
  return join(tmpDir, ".beastmode", "state", "github-discovery.cache.json");
}

function writeTestCache(data: Record<string, unknown>): void {
  writeFileSync(cachePath(), JSON.stringify(data));
}

function readTestCache(): Record<string, unknown> {
  return JSON.parse(readFileSync(cachePath(), "utf-8"));
}

function resetMocks(): void {
  mockRepoDiscover = undefined;
  mockProjectDiscover = undefined;
  mockFieldDiscover = undefined;
}

// --- Tests ---

describe("discoverGitHub", () => {
  beforeEach(() => {
    resetMocks();
    setupTmpDir();
  });

  afterEach(teardownTmpDir);

  // -------------------------------------------------------
  // Cache hit
  // -------------------------------------------------------
  describe("cache hit", () => {
    test("returns cached values without calling gh", async () => {
      let repoCalled = false;
      mockRepoDiscover = async () => {
        repoCalled = true;
        return "org/repo";
      };

      writeTestCache({
        repo: "cached/repo",
        projectName: "My Project",
        projectNumber: 5,
        projectId: "PVT_cached",
        fieldId: "PVTSSF_cached",
        fieldOptions: { Design: "opt-1" },
        cachedAt: new Date().toISOString(),
      });

      const result = await discoverGitHub(tmpDir, "My Project");

      expect(result).toBeDefined();
      expect(result!.repo).toBe("cached/repo");
      expect(result!.projectId).toBe("PVT_cached");
      expect(repoCalled).toBe(false);
    });

    test("returns cache even without project-name if none requested", async () => {
      writeTestCache({
        repo: "cached/repo",
        cachedAt: new Date().toISOString(),
      });

      const result = await discoverGitHub(tmpDir);

      expect(result).toBeDefined();
      expect(result!.repo).toBe("cached/repo");
    });
  });

  // -------------------------------------------------------
  // Cache invalidation
  // -------------------------------------------------------
  describe("cache invalidation", () => {
    test("re-discovers when project-name changes", async () => {
      mockRepoDiscover = async () => "org/repo";
      mockProjectDiscover = async () => ({ number: 3, id: "PVT_new" });
      mockFieldDiscover = async () => ({
        fieldId: "PVTSSF_new",
        options: { Plan: "opt-plan" },
      });

      writeTestCache({
        repo: "org/repo",
        projectName: "Old Project",
        projectNumber: 1,
        projectId: "PVT_old",
        cachedAt: new Date().toISOString(),
      });

      const result = await discoverGitHub(tmpDir, "New Project");

      expect(result).toBeDefined();
      expect(result!.projectId).toBe("PVT_new");
    });

    test("re-discovers when cache has no repo", async () => {
      mockRepoDiscover = async () => "org/repo";

      writeTestCache({
        cachedAt: new Date().toISOString(),
      });

      const result = await discoverGitHub(tmpDir);

      expect(result).toBeDefined();
      expect(result!.repo).toBe("org/repo");
    });
  });

  // -------------------------------------------------------
  // Cache miss — full discovery
  // -------------------------------------------------------
  describe("cache miss", () => {
    test("discovers repo, project, and field — writes cache", async () => {
      mockRepoDiscover = async () => "org/repo";
      mockProjectDiscover = async () => ({ number: 7, id: "PVT_123" });
      mockFieldDiscover = async () => ({
        fieldId: "PVTSSF_456",
        options: { Design: "opt-d", Plan: "opt-p" },
      });

      const result = await discoverGitHub(tmpDir, "Test Board");

      expect(result).toBeDefined();
      expect(result!.repo).toBe("org/repo");
      expect(result!.projectNumber).toBe(7);
      expect(result!.projectId).toBe("PVT_123");
      expect(result!.fieldId).toBe("PVTSSF_456");
      expect(result!.fieldOptions).toEqual({ Design: "opt-d", Plan: "opt-p" });

      // Verify cache was written
      expect(existsSync(cachePath())).toBe(true);
      const cache = readTestCache();
      expect(cache.repo).toBe("org/repo");
      expect(cache.projectName).toBe("Test Board");
    });

    test("discovers repo only when no project-name given", async () => {
      mockRepoDiscover = async () => "org/repo";

      const result = await discoverGitHub(tmpDir);

      expect(result).toBeDefined();
      expect(result!.repo).toBe("org/repo");
      expect(result!.projectNumber).toBeUndefined();
      expect(result!.projectId).toBeUndefined();
    });
  });

  // -------------------------------------------------------
  // Repo discovery failure — hard fail
  // -------------------------------------------------------
  describe("repo discovery failure", () => {
    test("returns undefined when repo discovery fails", async () => {
      mockRepoDiscover = async () => undefined;

      const result = await discoverGitHub(tmpDir, "Test Board");

      expect(result).toBeUndefined();
      // Should not write cache
      expect(existsSync(cachePath())).toBe(false);
    });
  });

  // -------------------------------------------------------
  // Partial discovery — graceful degradation
  // -------------------------------------------------------
  describe("graceful degradation", () => {
    test("returns partial when project discovery fails", async () => {
      mockRepoDiscover = async () => "org/repo";
      mockProjectDiscover = async () => undefined;

      const result = await discoverGitHub(tmpDir, "Test Board");

      expect(result).toBeDefined();
      expect(result!.repo).toBe("org/repo");
      expect(result!.projectNumber).toBeUndefined();
      expect(result!.projectId).toBeUndefined();
      expect(result!.fieldId).toBeUndefined();
    });

    test("returns partial when field discovery fails", async () => {
      mockRepoDiscover = async () => "org/repo";
      mockProjectDiscover = async () => ({ number: 7, id: "PVT_123" });
      mockFieldDiscover = async () => undefined;

      const result = await discoverGitHub(tmpDir, "Test Board");

      expect(result).toBeDefined();
      expect(result!.repo).toBe("org/repo");
      expect(result!.projectNumber).toBe(7);
      expect(result!.projectId).toBe("PVT_123");
      expect(result!.fieldId).toBeUndefined();
      expect(result!.fieldOptions).toBeUndefined();
    });
  });

  // -------------------------------------------------------
  // Corrupt cache — re-discovers
  // -------------------------------------------------------
  describe("corrupt cache", () => {
    test("re-discovers when cache file is invalid JSON", async () => {
      mockRepoDiscover = async () => "org/repo";

      writeFileSync(cachePath(), "not valid json {{{");

      const result = await discoverGitHub(tmpDir);

      expect(result).toBeDefined();
      expect(result!.repo).toBe("org/repo");
    });
  });
});
