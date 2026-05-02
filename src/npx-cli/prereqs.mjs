// src/npx-cli/prereqs.mjs

/**
 * Check installation prerequisites.
 * Returns { ok: boolean, errors: string[] }
 *
 * @param {object} opts
 * @param {string} opts.platform - process.platform value
 * @param {function} opts.execCommand - shell command executor
 */
export async function checkPrereqs({ platform, execCommand }) {
  const errors = [];

  // Check supported platform (macOS, Linux, Windows)
  if (platform !== 'darwin' && platform !== 'linux' && platform !== 'win32') {
    errors.push(
      `beastmode requires macOS, Linux, or Windows. Detected platform: ${platform}.`
    );
    return { ok: false, errors };
  }

  // Check Claude Code
  const claudeCheck = platform === 'win32' ? 'where claude' : 'command -v claude';
  try {
    execCommand(claudeCheck);
  } catch {
    errors.push(
      'Claude Code is not installed. ' +
      'Install it from https://claude.ai/download and run `claude` once to complete setup.'
    );
  }

  return { ok: errors.length === 0, errors };
}
