// src/npx-cli/bun-installer.mjs

/**
 * Ensure bun is available. If not, install it via the official script.
 * Returns { installed: boolean, alreadyPresent: boolean }
 *
 * @param {object} opts
 * @param {function} opts.execCommand - shell command executor
 */
export async function ensureBun({ execCommand }) {
  // Check if bun is already available
  try {
    execCommand('command -v bun');
    return { installed: false, alreadyPresent: true };
  } catch {
    // bun not found — install it
  }

  console.log('bun not found. Installing...');

  try {
    execCommand('curl -fsSL https://bun.sh/install | bash');
  } catch (err) {
    throw new Error(
      `Failed to install bun. ` +
      `You can install it manually: curl -fsSL https://bun.sh/install | bash\n` +
      `Error: ${err.message}`
    );
  }

  console.log('bun installed.');
  return { installed: true, alreadyPresent: false };
}
