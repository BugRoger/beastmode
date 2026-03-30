/** Logger instance returned by createLogger. */
export interface Logger {
  /** Level 0 — always shown. Writes to stdout. */
  log(msg: string): void;
  /** Level 1 — shown at -v. Writes to stdout. */
  detail(msg: string): void;
  /** Level 2 — shown at -vv. Writes to stdout. */
  debug(msg: string): void;
  /** Level 3 — shown at -vvv. Writes to stdout. */
  trace(msg: string): void;
  /** Always shown — writes to stderr. */
  warn(msg: string): void;
  /** Always shown — writes to stderr. */
  error(msg: string): void;
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

/**
 * Create a scoped logger with verbosity gating.
 *
 * Messages at or below the verbosity level are shown.
 * warn() and error() always show regardless of verbosity.
 *
 * Output format: `HH:MM:SS slug: message`
 * stderr format: `HH:MM:SS slug: message`
 */
export function createLogger(verbosity: number, slug: string): Logger {
  const fmt = (msg: string) => `${ts()} ${slug}: ${msg}`;

  return {
    log(msg: string) {
      if (verbosity >= 0) process.stdout.write(fmt(msg) + "\n");
    },
    detail(msg: string) {
      if (verbosity >= 1) process.stdout.write(fmt(msg) + "\n");
    },
    debug(msg: string) {
      if (verbosity >= 2) process.stdout.write(fmt(msg) + "\n");
    },
    trace(msg: string) {
      if (verbosity >= 3) process.stdout.write(fmt(msg) + "\n");
    },
    warn(msg: string) {
      process.stderr.write(fmt(msg) + "\n");
    },
    error(msg: string) {
      process.stderr.write(fmt(msg) + "\n");
    },
  };
}

/** Create a no-op logger that suppresses all output. Useful for tests. */
export function createNullLogger(): Logger {
  const noop = () => {};
  return { log: noop, detail: noop, debug: noop, trace: noop, warn: noop, error: noop };
}
