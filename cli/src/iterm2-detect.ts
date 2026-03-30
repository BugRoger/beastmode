/**
 * iTerm2 environment detection — checks whether we're running inside iTerm2
 * and whether the `it2` CLI tool is available.
 */

// Re-use the same SpawnFn type from cmux-client for consistency
export type SpawnFn = (
  cmd: string[],
  opts: { stdout: "pipe"; stderr: "pipe" },
) => {
  stdout: ReadableStream | null;
  stderr: ReadableStream | null;
  exited: Promise<number>;
};

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

export interface ITerm2EnvResult {
  detected: boolean;
  sessionId?: string;
}

/**
 * Detect whether the current process is running inside iTerm2.
 * Checks both TERM_PROGRAM and ITERM_SESSION_ID environment variables.
 */
export function detectITerm2Env(
  env: Record<string, string | undefined> = process.env,
): ITerm2EnvResult {
  const isITerm = env.TERM_PROGRAM === "iTerm.app";
  const sessionId = env.ITERM_SESSION_ID;

  if (isITerm && sessionId) {
    return { detected: true, sessionId };
  }
  return { detected: false };
}

// ---------------------------------------------------------------------------
// it2 CLI availability
// ---------------------------------------------------------------------------

/**
 * Check if the `it2` CLI binary is available and responds.
 * Runs `it2 --version` and checks for a zero exit code.
 */
export async function checkIt2Available(
  spawn: SpawnFn = (cmd, opts) => Bun.spawn(cmd, opts),
): Promise<boolean> {
  try {
    const proc = spawn(["it2", "--version"], { stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Combined availability check
// ---------------------------------------------------------------------------

export interface ITerm2AvailabilityResult {
  available: boolean;
  sessionId?: string;
  reason?: string;
}

/**
 * Full iTerm2 availability check — environment detection + it2 binary check.
 * Returns a detailed result explaining why iTerm2 is or isn't available.
 */
export async function iterm2Available(
  spawn?: SpawnFn,
  env?: Record<string, string | undefined>,
): Promise<ITerm2AvailabilityResult> {
  const envResult = detectITerm2Env(env);

  if (!envResult.detected) {
    return {
      available: false,
      reason: "Not running inside iTerm2 (TERM_PROGRAM !== 'iTerm.app' or ITERM_SESSION_ID not set)",
    };
  }

  const it2Ok = await checkIt2Available(spawn);
  if (!it2Ok) {
    return {
      available: false,
      sessionId: envResult.sessionId,
      reason: "iTerm2 detected but `it2` CLI is not available",
    };
  }

  return {
    available: true,
    sessionId: envResult.sessionId,
  };
}

// ---------------------------------------------------------------------------
// Setup instructions
// ---------------------------------------------------------------------------

export const IT2_SETUP_INSTRUCTIONS = `
iTerm2 dispatch strategy requires the \`it2\` CLI tool.

Setup:
  1. Install the iterm2 Python package:
       pip install iterm2
     Or with pipx:
       pipx install iterm2
     Or with uv:
       uv tool install iterm2

  2. Enable the Python API in iTerm2:
       Settings > General > Magic > Enable Python API

  3. Verify installation:
       it2 --version

Once configured, set \`dispatch-strategy: iterm2\` in .beastmode/config.yaml.
`.trim();
