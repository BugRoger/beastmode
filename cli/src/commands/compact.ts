/**
 * Standalone context-tree compaction command.
 *
 * Dispatches the compaction agent via the interactive runner.
 * Always runs regardless of .last-compaction timestamp.
 * Does NOT update .last-compaction — that counter is for release cadence only.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createLogger, createStdioSink } from "../logger";

export async function compactCommand(): Promise<void> {
  const projectRoot = process.cwd();
  const beastmodeDir = resolve(projectRoot, ".beastmode");

  if (!existsSync(beastmodeDir)) {
    console.error("Not a beastmode project (missing .beastmode/ directory)");
    process.exit(1);
  }

  const logger = createLogger(createStdioSink(0), { phase: "compact" });
  logger.log("Dispatching compaction agent...");

  const proc = Bun.spawn(
    [
      "claude",
      "--dangerously-skip-permissions",
      "--",
      "Read and execute agents/compaction.md against this project's .beastmode/ context tree.",
    ],
    {
      cwd: projectRoot,
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

    if (cancelled) {
      logger.warn("Compaction cancelled.");
    } else if (exitCode === 0) {
      logger.log("Compaction complete.");
    } else {
      logger.error(`Compaction failed (exit code ${exitCode}).`);
      process.exit(exitCode ?? 1);
    }
  } finally {
    process.off("SIGINT", onSigint);
  }
}
