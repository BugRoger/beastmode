// src/npx-cli/verify.mjs

/**
 * Verify the installation by checking that key commands work.
 * Returns { beastmode: boolean, claude: boolean, failures: string[] }
 *
 * @param {object} opts
 * @param {function} opts.execCommand - shell command executor
 */
export async function verifyInstall({ execCommand }) {
  const failures = [];
  let beastmodeOk = false;
  let claudeOk = false;

  try {
    execCommand('beastmode --version');
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
