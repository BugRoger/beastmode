// src/npx-cli/verify.mjs

/**
 * Verify the installation by checking that key commands work.
 * Returns { beastmode: boolean, claude: boolean, failures: string[] }
 *
 * @param {object} opts
 * @param {function} opts.execCommand - shell command executor
 * @param {string} [opts.platform] - override process.platform (for testing)
 */
export async function verifyInstall({ execCommand, platform = process.platform }) {
  const failures = [];
  let beastmodeOk = false;
  let claudeOk = false;

  // Use 'help' instead of '--version' — help exits 0 on all platforms
  const beastmodeCmd = platform === 'win32' ? 'beastmode help' : 'beastmode --version';
  try {
    execCommand(beastmodeCmd);
    beastmodeOk = true;
  } catch {
    failures.push(
      'beastmode command is not working. ' +
      'Try running: bun link (in the CLI directory)'
    );
  }

  try {
    execCommand('claude --version');
    claudeOk = true;
  } catch {
    failures.push(
      'claude command is not working. ' +
      'Reinstall Claude Code from https://claude.ai/download'
    );
  }

  return { beastmode: beastmodeOk, claude: claudeOk, failures };
}
