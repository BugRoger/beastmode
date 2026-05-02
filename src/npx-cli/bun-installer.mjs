// src/npx-cli/bun-installer.mjs

/**
 * Ensure bun is available. If not, install it via the official script.
 * Returns { installed: boolean, alreadyPresent: boolean }
 *
 * @param {object} opts
 * @param {function} opts.execCommand - shell command executor
 */
export async function ensureBun({ execCommand, platform = process.platform }) {
  // Check if bun is already available
  const bunCheck = platform === 'win32' ? 'where bun' : 'command -v bun';
  try {
    execCommand(bunCheck);
    return { installed: false, alreadyPresent: true };
  } catch {
    // bun not found — install it
  }

  console.log('bun not found. Installing...');

  try {
    if (platform === 'win32') {
      execCommand('powershell -c "irm bun.sh/install.ps1 | iex"');
    } else {
      execCommand('curl -fsSL https://bun.sh/install | bash');
    }
  } catch (err) {
    const hint = platform === 'win32'
      ? 'powershell -c "irm bun.sh/install.ps1 | iex"'
      : 'curl -fsSL https://bun.sh/install | bash';
    throw new Error(
      `Failed to install bun. You can install it manually: ${hint}\n` +
      `Error: ${err.message}`
    );
  }

  console.log('bun installed.');
  return { installed: true, alreadyPresent: false };
}
