/**
 * `beastmode cancel <slug>`
 *
 * Thin CLI wrapper around the shared cancel-logic module.
 * Parses args, builds config, delegates to cancelEpic(), reports result.
 */

import type { BeastmodeConfig } from "../config";
import { createLogger, createStdioSink } from "../logger";
import { cancelEpic } from "./cancel-logic.js";

export async function cancelCommand(
  args: string[],
  config: BeastmodeConfig,
  verbosity: number = 0,
  force: boolean = false,
): Promise<void> {
  const logger = createLogger(createStdioSink(verbosity), {});
  const slug = args[0];
  if (!slug) {
    logger.error("Usage: beastmode cancel <slug>");
    process.exit(1);
  }

  logger.info(`Cancel: ${slug}`);

  const result = await cancelEpic({
    identifier: slug,
    projectRoot: process.cwd(),
    githubEnabled: config.github.enabled,
    force,
    logger,
  });

  logger.info(
    `Cancel complete: ${result.cleaned.length} cleaned, ${result.warned.length} warnings`,
  );
}
