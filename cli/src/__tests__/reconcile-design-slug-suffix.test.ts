/**
 * Integration test: reconcileDesign preserves collision-proof hex suffix.
 *
 * When the design phase outputs a human-readable realSlug, the reconciler
 * must append the epic's 4-char hex ID to produce the final slug.
 * e.g., realSlug "dashboard-stats" + epic bm-a3f2 -> "dashboard-stats-a3f2"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock artifact reader ---
let mockDesignOutput: unknown = undefined;

vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: () => mockDesignOutput,
  loadWorktreeFeatureOutput: () => undefined,
}));

// --- Mock git tags ---
const renamedTags: { from: string; to: string }[] = [];

vi.mock("../git/tags.js", () => ({
  renameTags: async (from: string, to: string) => {
    renamedTags.push({ from, to });
  },
}));

import { reconcileDesign } from "../pipeline/reconcile.js";
import { JsonFileStore } from "../store/index.js";
import { resolve } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("reconcileDesign preserves collision-proof hex suffix", () => {
  let projectRoot: string;
  let storePath: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(resolve(tmpdir(), "bm-test-"));
    const stateDir = resolve(projectRoot, ".beastmode", "state");
    mkdirSync(stateDir, { recursive: true });
    storePath = resolve(stateDir, "store.json");
    writeFileSync(storePath, JSON.stringify({ entities: {} }));
    renamedTags.length = 0;
  });

  function seedEpic(name: string): { store: JsonFileStore; epicId: string; originalSlug: string } {
    const store = new JsonFileStore(storePath);
    store.load();
    const epic = store.addEpic({ name });
    store.save();
    return { store, epicId: epic.id, originalSlug: epic.slug };
  }

  it("should append hex suffix from epic ID to realSlug", async () => {
    const { epicId, originalSlug } = seedEpic("f00d");
    const shortId = epicId.replace("bm-", "");

    // Design phase outputs a human-readable slug
    mockDesignOutput = {
      status: "completed",
      artifacts: {
        slug: "dashboard-stats-persistence",
        summary: { problem: "stats lost", solution: "persist them" },
        design: "2026-04-11-dashboard-stats-persistence.md",
      },
    };

    const result = await reconcileDesign(projectRoot, epicId, "/tmp/fake-wt");

    expect(result).toBeDefined();
    expect(result!.epic.slug).toBe(`dashboard-stats-persistence-${shortId}`);
    // Name stays human-readable (no hex suffix)
    expect(result!.epic.name).toBe("dashboard-stats-persistence");
  });

  it("should preserve original slug when no realSlug is provided", async () => {
    const { epicId, originalSlug } = seedEpic("abcd");

    mockDesignOutput = {
      status: "completed",
      artifacts: {
        summary: { problem: "broken", solution: "fix it" },
      },
    };

    const result = await reconcileDesign(projectRoot, epicId, "/tmp/fake-wt");

    expect(result).toBeDefined();
    // Slug unchanged — still has the original hex-derived slug
    expect(result!.epic.slug).toBe(originalSlug);
  });

  it("should rename git tags to the suffixed slug", async () => {
    const { epicId, originalSlug } = seedEpic("beef");
    const shortId = epicId.replace("bm-", "");

    mockDesignOutput = {
      status: "completed",
      artifacts: {
        slug: "auth-redesign",
        summary: { problem: "auth bad", solution: "redo it" },
      },
    };

    await reconcileDesign(projectRoot, epicId, "/tmp/fake-wt");

    expect(renamedTags).toHaveLength(1);
    expect(renamedTags[0].from).toBe(originalSlug);
    expect(renamedTags[0].to).toBe(`auth-redesign-${shortId}`);
  });

  it("should produce slug matching pattern {realSlug}-{4-hex}", async () => {
    const { epicId } = seedEpic("cafe");

    mockDesignOutput = {
      status: "completed",
      artifacts: {
        slug: "my-cool-feature",
      },
    };

    const result = await reconcileDesign(projectRoot, epicId, "/tmp/fake-wt");

    expect(result).toBeDefined();
    // Must end with 4 hex chars
    expect(result!.epic.slug).toMatch(/^my-cool-feature-[0-9a-f]{4}$/);
    // And specifically the epic's own ID suffix
    const shortId = epicId.replace("bm-", "");
    expect(result!.epic.slug).toBe(`my-cool-feature-${shortId}`);
  });
});
