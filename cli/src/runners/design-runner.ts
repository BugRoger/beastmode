/**
 * Runs the design phase as an interactive Claude session.
 *
 * Design requires human interaction (interview-style), so instead of the SDK
 * we spawn the `claude` CLI directly with inherited stdio. The user interacts
 * with Claude in their terminal as normal.
 */

import type { PhaseResult } from "../types";

export interface DesignRunnerOptions {
  topic: string;
  cwd: string;
}

export async function runDesignInteractive(
  options: DesignRunnerOptions,
): Promise<PhaseResult> {
  const { topic, cwd } = options;
  const startTime = Date.now();

  const proc = Bun.spawn(
    ["claude", "--dangerously-skip-permissions", "--", `/beastmode:design ${topic}`],
    {
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  // Wire Ctrl+C — Bun.spawn propagates signals to the child, but we
  // track it for exit_status reporting
  let cancelled = false;
  const onSigint = () => {
    cancelled = true;
    proc.kill("SIGINT");
  };
  process.on("SIGINT", onSigint);

  try {
    const exitCode = await proc.exited;
    const durationMs = Date.now() - startTime;

    let exitStatus: PhaseResult["exit_status"];
    if (cancelled) {
      exitStatus = "cancelled";
    } else if (exitCode === 0) {
      exitStatus = "success";
    } else {
      exitStatus = "error";
    }

    return {
      exit_status: exitStatus,
      cost_usd: null,
      duration_ms: durationMs,
      session_id: null,
    };
  } finally {
    process.off("SIGINT", onSigint);
  }
}
