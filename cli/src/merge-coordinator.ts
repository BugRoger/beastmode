/**
 * Merge Coordinator
 *
 * Handles post-implementation branch merging with conflict awareness.
 * Uses git merge-tree for pre-merge simulation, computes optimal merge
 * order, and executes merges sequentially — spawning Claude sessions
 * for conflict resolution when needed.
 */

// --- Types ---

export interface MergeSimulation {
  branch: string;
  base: string;
  hasConflicts: boolean;
  conflictingFiles: string[];
}

export interface MergeOrder {
  branches: string[];
  reason: string;
}

export type MergeStatus = "success" | "conflict-resolved" | "failed";

export interface MergeResult {
  branch: string;
  status: MergeStatus;
  conflictingFiles?: string[];
  error?: string;
}

export interface MergeReport {
  results: MergeResult[];
  totalBranches: number;
  succeeded: number;
  conflictResolved: number;
  failed: number;
}

export interface MergeCoordinatorOptions {
  cwd: string;
  targetBranch?: string;
  spawnConflictResolver?: (opts: {
    cwd: string;
    branch: string;
    conflictingFiles: string[];
  }) => Promise<boolean>;
}

// --- Git helpers ---

async function git(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

// --- Simulation ---

/**
 * Simulate a merge between two branches using `git merge-tree`.
 * This is a read-only operation — no working tree changes.
 */
export async function simulateMerge(
  branch: string,
  base: string,
  cwd: string,
): Promise<MergeSimulation> {
  // git merge-tree --write-tree --no-messages <base> <branch>
  // Exit 0 = clean merge, exit 1 = conflicts
  const result = await git(
    ["merge-tree", "--write-tree", "--no-messages", base, branch],
    cwd,
  );

  if (result.exitCode === 0) {
    return { branch, base, hasConflicts: false, conflictingFiles: [] };
  }

  // Parse conflicting files from stderr/stdout
  // git merge-tree outputs conflicting file paths after the tree hash
  const lines = result.stdout.split("\n").filter((l) => l.length > 0);
  // First line is the tree hash, remaining lines are conflict info
  const conflictingFiles: string[] = [];
  for (const line of lines.slice(1)) {
    // Format: "<path>" or more complex conflict markers
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("CONFLICT")) {
      conflictingFiles.push(trimmed);
    } else if (trimmed.startsWith("CONFLICT")) {
      // Extract file path from CONFLICT messages like:
      // "CONFLICT (content): Merge conflict in <path>"
      const match = trimmed.match(/Merge conflict in (.+)$/);
      if (match) {
        conflictingFiles.push(match[1]);
      }
    }
  }

  return { branch, base, hasConflicts: true, conflictingFiles };
}

/**
 * Simulate merges for all branches against a base branch.
 */
export async function simulateAll(
  branches: string[],
  base: string,
  cwd: string,
): Promise<MergeSimulation[]> {
  const results: MergeSimulation[] = [];
  for (const branch of branches) {
    results.push(await simulateMerge(branch, base, cwd));
  }
  return results;
}

// --- Merge Order Optimizer ---

/**
 * Compute optimal merge order from simulation results.
 *
 * Strategy:
 * 1. Non-conflicting branches first (free merges)
 * 2. Branches conflicting only with already-merged branches next
 * 3. Branches with most conflicts last
 */
export function computeMergeOrder(simulations: MergeSimulation[]): MergeOrder {
  const clean = simulations
    .filter((s) => !s.hasConflicts)
    .map((s) => s.branch);

  const conflicting = simulations
    .filter((s) => s.hasConflicts)
    .sort((a, b) => a.conflictingFiles.length - b.conflictingFiles.length)
    .map((s) => s.branch);

  const branches = [...clean, ...conflicting];

  const cleanCount = clean.length;
  const conflictCount = conflicting.length;

  let reason: string;
  if (conflictCount === 0) {
    reason = `All ${cleanCount} branches merge cleanly`;
  } else if (cleanCount === 0) {
    reason = `All ${conflictCount} branches have conflicts, ordered by conflict count (fewest first)`;
  } else {
    reason = `${cleanCount} clean merges first, then ${conflictCount} conflicting branches by conflict count`;
  }

  return { branches, reason };
}

// --- Merge Executor ---

/**
 * Execute a single merge. For clean merges, run git merge directly.
 * For conflicting merges, invoke the conflict resolver.
 */
export async function executeMerge(
  branch: string,
  simulation: MergeSimulation,
  options: MergeCoordinatorOptions,
): Promise<MergeResult> {
  const { cwd, spawnConflictResolver } = options;

  if (!simulation.hasConflicts) {
    // Clean merge — execute directly
    const result = await git(["merge", branch, "--no-edit"], cwd);

    if (result.exitCode === 0) {
      return { branch, status: "success" };
    }

    // Unexpected failure on a "clean" simulation — treat as conflict
    // Abort the failed merge first
    await git(["merge", "--abort"], cwd);
    return {
      branch,
      status: "failed",
      error: `Merge failed unexpectedly: ${result.stderr}`,
    };
  }

  // Conflicting merge — attempt merge then resolve
  const mergeResult = await git(["merge", branch, "--no-edit"], cwd);

  if (mergeResult.exitCode === 0) {
    // Simulation predicted conflicts but merge was clean (can happen if base moved)
    return { branch, status: "success" };
  }

  // Merge produced conflicts — invoke resolver
  if (spawnConflictResolver) {
    try {
      const resolved = await spawnConflictResolver({
        cwd,
        branch,
        conflictingFiles: simulation.conflictingFiles,
      });

      if (resolved) {
        // Resolver should have staged and committed the resolution
        return {
          branch,
          status: "conflict-resolved",
          conflictingFiles: simulation.conflictingFiles,
        };
      }
    } catch (err) {
      // Resolver failed — abort merge
      await git(["merge", "--abort"], cwd);
      return {
        branch,
        status: "failed",
        conflictingFiles: simulation.conflictingFiles,
        error: `Conflict resolver failed: ${err}`,
      };
    }
  }

  // No resolver or resolver returned false — abort
  await git(["merge", "--abort"], cwd);
  return {
    branch,
    status: "failed",
    conflictingFiles: simulation.conflictingFiles,
    error: "No conflict resolver available",
  };
}

// --- Coordinator ---

/**
 * Coordinate merging of multiple feature branches back to the target branch.
 *
 * 1. Checkout target branch
 * 2. Simulate all merges
 * 3. Compute optimal order
 * 4. Execute merges sequentially
 * 5. Report results
 */
export async function coordinateMerges(
  branches: string[],
  options: MergeCoordinatorOptions,
): Promise<MergeReport> {
  const { cwd, targetBranch = "main" } = options;

  if (branches.length === 0) {
    return {
      results: [],
      totalBranches: 0,
      succeeded: 0,
      conflictResolved: 0,
      failed: 0,
    };
  }

  // Ensure we're on the target branch
  const checkoutResult = await git(["checkout", targetBranch], cwd);
  if (checkoutResult.exitCode !== 0) {
    throw new Error(
      `Failed to checkout ${targetBranch}: ${checkoutResult.stderr}`,
    );
  }

  // Simulate all merges
  const simulations = await simulateAll(branches, targetBranch, cwd);

  // Compute optimal order
  const order = computeMergeOrder(simulations);

  // Build simulation lookup
  const simMap = new Map<string, MergeSimulation>();
  for (const sim of simulations) {
    simMap.set(sim.branch, sim);
  }

  // Execute in order
  const results: MergeResult[] = [];
  for (const branch of order.branches) {
    const sim = simMap.get(branch)!;
    const result = await executeMerge(branch, sim, options);
    results.push(result);
  }

  // Build report
  const succeeded = results.filter((r) => r.status === "success").length;
  const conflictResolved = results.filter(
    (r) => r.status === "conflict-resolved",
  ).length;
  const failed = results.filter((r) => r.status === "failed").length;

  return {
    results,
    totalBranches: branches.length,
    succeeded,
    conflictResolved,
    failed,
  };
}

/**
 * Convenience function for single-branch merge (used by run command).
 */
export async function mergeSingleBranch(
  branch: string,
  options: MergeCoordinatorOptions,
): Promise<MergeResult> {
  const report = await coordinateMerges([branch], options);
  return report.results[0];
}
