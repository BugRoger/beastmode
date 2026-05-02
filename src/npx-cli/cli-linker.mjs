// src/npx-cli/cli-linker.mjs

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Install CLI dependencies and link the beastmode command.
 *
 * @param {object} opts
 * @param {string} opts.cliDir - path to the cli/ directory in the cache
 * @param {function} opts.execCommand - shell command executor
 * @param {string} [opts.platform] - override process.platform (for testing)
 */
export async function linkCli({ cliDir, execCommand, platform = process.platform }) {
  console.log('Installing CLI dependencies...');

  try {
    execCommand(`cd "${cliDir}" && bun install --production`);
  } catch (err) {
    throw new Error(
      `Failed to install CLI dependencies in ${cliDir}.\n` +
      `Try running manually: cd "${cliDir}" && bun install --production\n` +
      `Error: ${err.message}`
    );
  }

  console.log('Linking beastmode CLI...');

  if (platform === 'win32') {
    await linkCliWindows({ cliDir, execCommand });
  } else {
    try {
      execCommand(`cd "${cliDir}" && bun link`);
    } catch (err) {
      throw new Error(
        `Failed to link CLI. The beastmode command may not be available on your PATH.\n` +
        `Try running manually: cd "${cliDir}" && bun link\n` +
        `Error: ${err.message}`
      );
    }
  }

  console.log('CLI linked.');
}

/**
 * Windows-specific CLI linking.
 *
 * `bun link` on Windows creates shims in ~/.bun/bin/ which may not be in PATH,
 * especially when bun was installed via npm rather than the official installer.
 * Instead, we find the directory containing the `bun` command (which IS in PATH)
 * and drop a beastmode.cmd wrapper there.
 */
async function linkCliWindows({ cliDir, execCommand }) {
  // Locate the bun binary directory (first result of `where bun`)
  let bunDir;
  try {
    const result = execCommand('where bun');
    const firstLine = String(result.stdout ?? result).split('\n')[0].trim();
    bunDir = dirname(firstLine);
  } catch {
    // where failed — fall back to bun link and hope for the best
    try {
      execCommand(`cd "${cliDir}" && bun link`);
    } catch {
      // best-effort
    }
    return;
  }

  const entryPoint = join(cliDir, 'src', 'index.ts');
  const wrapperPath = join(bunDir, 'beastmode.cmd');

  // .cmd wrapper that delegates to bun with the full entry-point path
  const cmdContent = [
    '@echo off',
    `bun "${entryPoint}" %*`,
  ].join('\r\n') + '\r\n';

  writeFileSync(wrapperPath, cmdContent, 'utf8');
}
