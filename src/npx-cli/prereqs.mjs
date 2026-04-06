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

  // Check macOS
  if (platform !== 'darwin') {
    errors.push(
      `beastmode requires macOS. Detected platform: ${platform}. ` +
      `Linux and Windows are not supported yet.`
    );
    // Fail fast — no point checking other prereqs on wrong OS
    return { ok: false, errors };
  }

  // Check Claude Code
  try {
    execCommand('command -v claude');
  } catch {
    errors.push(
      'Claude Code is not installed. ' +
      'Install it from https://claude.ai/download and run `claude` once to complete setup.'
    );
  }

  return { ok: errors.length === 0, errors };
}
