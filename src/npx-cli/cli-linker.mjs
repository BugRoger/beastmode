// src/npx-cli/cli-linker.mjs

/**
 * Install CLI dependencies and link the beastmode command.
 *
 * @param {object} opts
 * @param {string} opts.cliDir - path to the cli/ directory in the cache
 * @param {function} opts.execCommand - shell command executor
 */
export async function linkCli({ cliDir, execCommand }) {
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

  try {
    execCommand(`cd "${cliDir}" && bun link`);
  } catch (err) {
    throw new Error(
      `Failed to link CLI. The beastmode command may not be available on your PATH.\n` +
      `Try running manually: cd "${cliDir}" && bun link\n` +
      `Error: ${err.message}`
    );
  }

  console.log('CLI linked.');
}
