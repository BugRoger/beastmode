import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  simulateMerge,
  simulateAll,
  computeMergeOrder,
  executeMerge,
  coordinateMerges,
  mergeSingleBranch,
  type MergeSimulation,
  type MergeCoordinatorOptions,
} from "../src/merge-coordinator";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// --- Helpers ---

async function git(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  }
  return stdout.trim();
}

async function createTestRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "merge-test-"));
  await git(["init", "-b", "main"], dir);
  await git(["config", "user.email", "test@test.com"], dir);
  await git(["config", "user.name", "Test"], dir);

  // Create initial commit
  await Bun.write(join(dir, "README.md"), "# Test Repo\n");
  await git(["add", "."], dir);
  await git(["commit", "-m", "Initial commit"], dir);

  return dir;
}

async function createBranch(
  dir: string,
  name: string,
  files: Record<string, string>,
): Promise<void> {
  await git(["checkout", "-b", name], dir);
  for (const [path, content] of Object.entries(files)) {
    await Bun.write(join(dir, path), content);
  }
  await git(["add", "."], dir);
  await git(["commit", "-m", `Add ${name} changes`], dir);
  await git(["checkout", "main"], dir);
}

// --- Tests ---

describe("simulateMerge", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await createTestRepo();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("detects clean merge", async () => {
    await createBranch(dir, "feature/clean", {
      "clean.ts": 'export const clean = true;\n',
    });

    const result = await simulateMerge("feature/clean", "main", dir);

    expect(result.branch).toBe("feature/clean");
    expect(result.hasConflicts).toBe(false);
    expect(result.conflictingFiles).toEqual([]);
  });

  test("detects conflicting merge", async () => {
    // Create conflicting changes on main and a branch
    await Bun.write(join(dir, "shared.ts"), 'export const value = "main";\n');
    await git(["add", "."], dir);
    await git(["commit", "-m", "Main change"], dir);

    await git(["checkout", "-b", "feature/conflict"], dir);
    await Bun.write(
      join(dir, "shared.ts"),
      'export const value = "branch";\n',
    );
    await git(["add", "."], dir);
    await git(["commit", "-m", "Branch change"], dir);
    await git(["checkout", "main"], dir);

    // Modify same file on main again to ensure conflict
    await Bun.write(
      join(dir, "shared.ts"),
      'export const value = "main-v2";\n',
    );
    await git(["add", "."], dir);
    await git(["commit", "-m", "Main change v2"], dir);

    const result = await simulateMerge("feature/conflict", "main", dir);

    expect(result.branch).toBe("feature/conflict");
    expect(result.hasConflicts).toBe(true);
  });
});

describe("simulateAll", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await createTestRepo();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("simulates multiple branches", async () => {
    await createBranch(dir, "feature/a", {
      "a.ts": 'export const a = true;\n',
    });
    await createBranch(dir, "feature/b", {
      "b.ts": 'export const b = true;\n',
    });

    const results = await simulateAll(
      ["feature/a", "feature/b"],
      "main",
      dir,
    );

    expect(results).toHaveLength(2);
    expect(results[0].branch).toBe("feature/a");
    expect(results[1].branch).toBe("feature/b");
  });
});

describe("computeMergeOrder", () => {
  test("puts clean merges first", () => {
    const simulations: MergeSimulation[] = [
      {
        branch: "feature/conflict",
        base: "main",
        hasConflicts: true,
        conflictingFiles: ["a.ts", "b.ts"],
      },
      {
        branch: "feature/clean",
        base: "main",
        hasConflicts: false,
        conflictingFiles: [],
      },
    ];

    const order = computeMergeOrder(simulations);

    expect(order.branches[0]).toBe("feature/clean");
    expect(order.branches[1]).toBe("feature/conflict");
  });

  test("orders conflicting branches by conflict count (fewest first)", () => {
    const simulations: MergeSimulation[] = [
      {
        branch: "feature/many",
        base: "main",
        hasConflicts: true,
        conflictingFiles: ["a.ts", "b.ts", "c.ts"],
      },
      {
        branch: "feature/few",
        base: "main",
        hasConflicts: true,
        conflictingFiles: ["x.ts"],
      },
    ];

    const order = computeMergeOrder(simulations);

    expect(order.branches[0]).toBe("feature/few");
    expect(order.branches[1]).toBe("feature/many");
  });

  test("handles all-clean branches", () => {
    const simulations: MergeSimulation[] = [
      {
        branch: "feature/a",
        base: "main",
        hasConflicts: false,
        conflictingFiles: [],
      },
      {
        branch: "feature/b",
        base: "main",
        hasConflicts: false,
        conflictingFiles: [],
      },
    ];

    const order = computeMergeOrder(simulations);

    expect(order.branches).toHaveLength(2);
    expect(order.reason).toContain("merge cleanly");
  });

  test("handles empty input", () => {
    const order = computeMergeOrder([]);
    expect(order.branches).toEqual([]);
  });
});

describe("executeMerge", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await createTestRepo();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("executes clean merge successfully", async () => {
    await createBranch(dir, "feature/clean", {
      "clean.ts": 'export const clean = true;\n',
    });

    const sim: MergeSimulation = {
      branch: "feature/clean",
      base: "main",
      hasConflicts: false,
      conflictingFiles: [],
    };

    const options: MergeCoordinatorOptions = { cwd: dir };
    const result = await executeMerge("feature/clean", sim, options);

    expect(result.status).toBe("success");
    expect(result.branch).toBe("feature/clean");
  });

  test("fails conflicting merge without resolver", async () => {
    // Create conflict
    await Bun.write(join(dir, "shared.ts"), 'export const v = "main";\n');
    await git(["add", "."], dir);
    await git(["commit", "-m", "Main"], dir);

    await git(["checkout", "-b", "feature/conflict"], dir);
    await Bun.write(join(dir, "shared.ts"), 'export const v = "branch";\n');
    await git(["add", "."], dir);
    await git(["commit", "-m", "Branch"], dir);
    await git(["checkout", "main"], dir);

    await Bun.write(join(dir, "shared.ts"), 'export const v = "main2";\n');
    await git(["add", "."], dir);
    await git(["commit", "-m", "Main2"], dir);

    const sim: MergeSimulation = {
      branch: "feature/conflict",
      base: "main",
      hasConflicts: true,
      conflictingFiles: ["shared.ts"],
    };

    const options: MergeCoordinatorOptions = { cwd: dir };
    const result = await executeMerge("feature/conflict", sim, options);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("No conflict resolver");
  });

  test("uses conflict resolver when provided", async () => {
    // Create conflict
    await Bun.write(join(dir, "shared.ts"), 'export const v = "main";\n');
    await git(["add", "."], dir);
    await git(["commit", "-m", "Main"], dir);

    await git(["checkout", "-b", "feature/conflict"], dir);
    await Bun.write(join(dir, "shared.ts"), 'export const v = "branch";\n');
    await git(["add", "."], dir);
    await git(["commit", "-m", "Branch"], dir);
    await git(["checkout", "main"], dir);

    await Bun.write(join(dir, "shared.ts"), 'export const v = "main2";\n');
    await git(["add", "."], dir);
    await git(["commit", "-m", "Main2"], dir);

    const sim: MergeSimulation = {
      branch: "feature/conflict",
      base: "main",
      hasConflicts: true,
      conflictingFiles: ["shared.ts"],
    };

    const resolver = async (opts: {
      cwd: string;
      branch: string;
      conflictingFiles: string[];
    }) => {
      // Resolve conflict by choosing "ours" and committing
      await Bun.write(
        join(opts.cwd, "shared.ts"),
        'export const v = "resolved";\n',
      );
      const proc1 = Bun.spawn(["git", "add", "."], {
        cwd: opts.cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc1.exited;
      const proc2 = Bun.spawn(
        ["git", "commit", "--no-edit", "-m", "Resolved conflict"],
        { cwd: opts.cwd, stdout: "pipe", stderr: "pipe" },
      );
      await proc2.exited;
      return true;
    };

    const options: MergeCoordinatorOptions = {
      cwd: dir,
      spawnConflictResolver: resolver,
    };
    const result = await executeMerge("feature/conflict", sim, options);

    expect(result.status).toBe("conflict-resolved");
  });
});

describe("coordinateMerges", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await createTestRepo();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("merges multiple clean branches", async () => {
    await createBranch(dir, "feature/a", {
      "a.ts": 'export const a = true;\n',
    });
    await createBranch(dir, "feature/b", {
      "b.ts": 'export const b = true;\n',
    });

    const options: MergeCoordinatorOptions = { cwd: dir };
    const report = await coordinateMerges(
      ["feature/a", "feature/b"],
      options,
    );

    expect(report.totalBranches).toBe(2);
    expect(report.succeeded).toBe(2);
    expect(report.conflictResolved).toBe(0);
    expect(report.failed).toBe(0);
  });

  test("handles empty branch list", async () => {
    const options: MergeCoordinatorOptions = { cwd: dir };
    const report = await coordinateMerges([], options);

    expect(report.totalBranches).toBe(0);
    expect(report.results).toEqual([]);
  });
});

describe("mergeSingleBranch", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await createTestRepo();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("merges a single branch", async () => {
    await createBranch(dir, "feature/solo", {
      "solo.ts": 'export const solo = true;\n',
    });

    const options: MergeCoordinatorOptions = { cwd: dir };
    const result = await mergeSingleBranch("feature/solo", options);

    expect(result.status).toBe("success");
    expect(result.branch).toBe("feature/solo");
  });
});
