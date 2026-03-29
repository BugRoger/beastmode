/**
 * Detect the GitHub repo (owner/name) from the git remote origin URL.
 */

/**
 * Detect the GitHub repo (owner/name) from the git remote origin URL.
 * Returns "owner/repo" or undefined if detection fails.
 */
export function detectRepo(projectRoot: string): string | undefined {
  try {
    const result = Bun.spawnSync(["git", "remote", "get-url", "origin"], {
      cwd: projectRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (result.exitCode !== 0) return undefined;
    const url = result.stdout.toString().trim();
    return parseGitUrl(url);
  } catch {
    return undefined;
  }
}

/**
 * Parse owner/repo from a git remote URL.
 * Supports HTTPS (https://github.com/owner/repo.git) and SSH (git@github.com:owner/repo.git).
 */
function parseGitUrl(url: string): string | undefined {
  // HTTPS: https://github.com/owner/repo.git or https://github.com/owner/repo
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

  // SSH: git@github.com:owner/repo.git or git@github.com:owner/repo
  const sshMatch = url.match(/github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

  return undefined;
}

export { parseGitUrl as _parseGitUrl }; // exported for testing only
