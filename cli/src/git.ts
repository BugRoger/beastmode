/**
 * Git subprocess helper — runs git commands via Bun.spawn and returns output.
 */

export interface GitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a git command and return structured result.
 * Throws on non-zero exit unless `allowFailure` is true.
 */
export async function git(
  args: string[],
  opts: { cwd?: string; allowFailure?: boolean } = {},
): Promise<GitResult> {
  const proc = Bun.spawn(["git", ...args], {
    cwd: opts.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  if (exitCode !== 0 && !opts.allowFailure) {
    throw new Error(
      `git ${args.join(" ")} failed (exit ${exitCode}):\n${stderr.trim()}`,
    );
  }

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

/**
 * Run a git command, return true if exit code is 0.
 */
export async function gitCheck(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const result = await git(args, { ...opts, allowFailure: true });
  return result.exitCode === 0;
}
