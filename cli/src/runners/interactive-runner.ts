/**
 * Universal interactive runner for all manual phase commands.
 *
 * Spawns the `claude` CLI with inherited stdio so the operator gets a live
 * interactive terminal. Works for any phase — design, plan, implement,
 * validate, release.
 */

import type { Phase, PhaseResult } from "../types";

export interface InteractiveRunnerOptions {
  phase: Phase;
  args: string[];
  cwd: string;
}

export async function runInteractive(
  options: InteractiveRunnerOptions,
): Promise<PhaseResult> {
  const { phase, args, cwd } = options;
  const prompt = `/beastmode:${phase} ${args.join(" ")}`.trim();
  const startTime = Date.now();

  const proc = Bun.spawn(
    ["claude", "--dangerously-skip-permissions", "--", prompt],
    {
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );

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
