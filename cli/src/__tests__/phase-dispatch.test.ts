import { describe, test, expect, beforeEach, afterEach, it } from "vitest";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { list } from "../manifest/store.js";

const PHASE_TS_PATH = resolve(import.meta.dirname, "../commands/phase.ts");
const phaseSource = readFileSync(PHASE_TS_PATH, "utf-8");

describe("uniform dispatch — all phases use interactive runner", () => {
  test("phase.ts imports runInteractive from dispatch/factory", () => {
    expect(phaseSource).toContain('from "../dispatch/factory"');
    expect(phaseSource).toContain("runInteractive");
  });

  test("phase.ts does NOT import from sdk-runner", () => {
    expect(phaseSource).not.toContain("sdk-runner");
    expect(phaseSource).not.toContain("runPhaseWithSdk");
  });

  test("phase.ts does NOT import from design-runner", () => {
    expect(phaseSource).not.toContain("design-runner");
    expect(phaseSource).not.toContain("runDesignInteractive");
  });

  test("phase.ts calls runInteractive with phase, args, cwd", () => {
    expect(phaseSource).toContain("runInteractive({ phase, args, cwd })");
  });

  test("no phase-specific dispatch branching for implement", () => {
    expect(phaseSource).not.toContain("runImplementFanOut");
    expect(phaseSource).not.toContain('phase === "implement"');
  });

  test("no phase-specific dispatch branching for design (except worktree slug)", () => {
    // Design appears in deriveWorktreeSlug for slug generation — that's expected
    // But it should NOT appear in the dispatch logic (no separate runDesignInteractive call)
    expect(phaseSource).not.toContain("runDesignInteractive");
  });
});

describe("fan-out code removed", () => {
  test("FanOutResult interface is gone", () => {
    expect(phaseSource).not.toContain("FanOutResult");
  });

  test("FeatureDispatch interface is gone", () => {
    expect(phaseSource).not.toContain("FeatureDispatch");
  });

  test("runImplementFanOut function is gone", () => {
    expect(phaseSource).not.toContain("runImplementFanOut");
  });

  test("no manifest imports (fan-out dependency)", () => {
    expect(phaseSource).not.toContain("loadManifest");
    expect(phaseSource).not.toContain("getPendingFeatures");
  });

  test("no Promise.allSettled (fan-out pattern)", () => {
    expect(phaseSource).not.toContain("Promise.allSettled");
  });
});

describe("release teardown simplified", () => {
  test("archiveWorktree is removed", () => {
    expect(phaseSource).not.toContain("archiveWorktree");
  });

  test("mergeWorktree is removed", () => {
    expect(phaseSource).not.toContain("mergeWorktree");
  });

  test("release teardown delegated to pipeline runner", () => {
    // In the unified pipeline architecture, release teardown (removeWorktree,
    // merge, archive) is handled by pipeline/runner.ts, not commands/phase.ts
    expect(phaseSource).not.toContain("removeWorktree");
    expect(phaseSource).toContain("runPipeline");
  });
});

describe("SDK runner removed", () => {
  test("sdk-runner.ts is deleted", () => {
    const sdkRunnerPath = resolve(import.meta.dirname, "../runners/sdk-runner.ts");
    expect(existsSync(sdkRunnerPath)).toBe(false);
  });

  test("sdk-runner is NOT referenced by phase.ts", () => {
    expect(phaseSource).not.toContain("sdk-runner");
  });
});

describe("backwards compatibility", () => {
  test("slugify is still exported", async () => {
    const mod = await import("../commands/phase");
    expect(typeof mod.slugify).toBe("function");
  });

  test("phaseCommand is still exported", async () => {
    const mod = await import("../commands/phase");
    expect(typeof mod.phaseCommand).toBe("function");
  });

  test("slugify produces correct output", async () => {
    const { slugify } = await import("../commands/phase");
    expect(slugify("My Cool Topic")).toBe("my-cool-topic");
    expect(slugify("TypeScript's Pipeline!")).toBe("typescripts-pipeline");
    expect(slugify("foo  --  bar")).toBe("foo-bar");
  });
});

describe("phase command is simplified", () => {
  test("phase.ts stays compact (worktree detection + manifest seeding included)", () => {
    const lineCount = phaseSource.split("\n").length;
    expect(lineCount).toBeLessThan(215);
  });

  test("two dispatch paths — cmux (direct) and manual (via pipeline runner)", () => {
    const matches = phaseSource.match(/runInteractive\(/g);
    expect(matches).not.toBeNull();
    // cmux path calls runInteractive directly; manual path wraps it in a dispatch fn for runPipeline
    expect(matches!.length).toBe(2);
  });
});

describe("manifest list() FIFO ordering", () => {
  const FIFO_ROOT = resolve(import.meta.dirname, "../../.test-fifo-tmp");

  beforeEach(() => {
    rmSync(FIFO_ROOT, { recursive: true, force: true });
    mkdirSync(resolve(FIFO_ROOT, ".beastmode", "state"), { recursive: true });
  });

  afterEach(() => {
    rmSync(FIFO_ROOT, { recursive: true, force: true });
  });

  it("returns manifests sorted by filename (oldest first)", () => {
    const stateDir = resolve(FIFO_ROOT, ".beastmode", "state");

    // Write newer manifest first (filesystem order would keep this first)
    writeFileSync(
      resolve(stateDir, "2026-01-15-newer-epic.manifest.json"),
      JSON.stringify({
        slug: "newer-epic",
        phase: "release",
        features: [],
        artifacts: {},
        lastUpdated: "2026-01-15T00:00:00Z",
      }),
    );

    // Write older manifest second
    writeFileSync(
      resolve(stateDir, "2026-01-01-older-epic.manifest.json"),
      JSON.stringify({
        slug: "older-epic",
        phase: "release",
        features: [],
        artifacts: {},
        lastUpdated: "2026-01-01T00:00:00Z",
      }),
    );

    const manifests = list(FIFO_ROOT);
    expect(manifests).toHaveLength(2);
    expect(manifests[0].slug).toBe("older-epic");
    expect(manifests[1].slug).toBe("newer-epic");
  });
});
