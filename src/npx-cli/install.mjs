// src/npx-cli/install.mjs
import { execSync } from 'node:child_process';
import { readFile, cp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { checkPrereqs } from './prereqs.mjs';
import { ensureBun } from './bun-installer.mjs';
import { copyPlugin } from './plugin-copier.mjs';
import { mergeConfigs } from './config-merger.mjs';
import { linkCli } from './cli-linker.mjs';
import { verifyInstall } from './verify.mjs';

/**
 * Run the full beastmode install flow.
 *
 * @param {object} opts
 * @param {string} opts.homeDir - user home directory (default: os.homedir())
 * @param {boolean} opts.skipPrereqs - skip prerequisite checks
 * @param {function} opts.execCommand - shell executor (default: execSync wrapper)
 * @param {string} opts.packageDir - root of the npm package
 * @param {string} [opts.platform] - override platform (default: process.platform)
 */
export async function install(opts) {
  const {
    homeDir,
    skipPrereqs = false,
    execCommand = defaultExec,
    packageDir,
    platform = process.platform,
  } = opts;

  // Step 1: Prerequisites
  if (!skipPrereqs) {
    const prereqs = await checkPrereqs({ platform, execCommand });
    if (!prereqs.ok) {
      return {
        success: false,
        error: prereqs.errors.join('\n'),
        step: 'prerequisites',
      };
    }
  }

  // Read version from plugin.json
  let version;
  try {
    const pluginJsonPath = join(packageDir, '.claude-plugin', 'plugin.json');
    const content = await readFile(pluginJsonPath, 'utf8');
    version = JSON.parse(content).version;
  } catch (err) {
    return {
      success: false,
      error: `Could not read plugin version: ${err.message}`,
      step: 'version',
    };
  }

  console.log(`Installing beastmode v${version}...`);

  // Step 2: Ensure bun
  try {
    await ensureBun({ execCommand });
  } catch (err) {
    return {
      success: false,
      error: err.message,
      step: 'bun-install',
    };
  }

  // Step 3: Copy plugin files
  try {
    await copyPlugin({ homeDir, packageDir, version });
  } catch (err) {
    return {
      success: false,
      error: `Failed to copy plugin files: ${err.message}`,
      step: 'plugin-copy',
    };
  }

  // Step 4: Copy CLI source to cache (for bun install + bun link)
  const cacheDir = join(homeDir, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode', version);
  const cliDir = join(cacheDir, 'cli');
  try {
    const cliSourceDir = join(packageDir, 'cli');
    await rm(cliDir, { recursive: true, force: true });
    await mkdir(cliDir, { recursive: true });
    await cp(cliSourceDir, cliDir, { recursive: true });
  } catch (err) {
    return {
      success: false,
      error: `Failed to copy CLI source: ${err.message}`,
      step: 'cli-copy',
    };
  }

  // Step 5: Merge JSON configs
  try {
    await mergeConfigs({ homeDir, version });
  } catch (err) {
    return {
      success: false,
      error: `Failed to update Claude Code configuration: ${err.message}`,
      step: 'config-merge',
    };
  }

  // Step 6: Link CLI
  try {
    await linkCli({ cliDir, execCommand });
  } catch (err) {
    return {
      success: false,
      error: err.message,
      step: 'cli-link',
    };
  }

  // Step 7: Verify
  const verification = await verifyInstall({ execCommand });

  // Step 8: Summary
  if (verification.failures.length === 0) {
    console.log('');
    console.log(`beastmode v${version} installed successfully.`);
    console.log('');
    console.log(`  Plugin: ${cacheDir}`);
    console.log(`  CLI:    ${cliDir}`);
    console.log('');
    console.log('Next: Run /beastmode init in your project to get started.');
  } else {
    console.log('');
    console.log(`beastmode v${version} installed with warnings:`);
    for (const f of verification.failures) {
      console.log(`  - ${f}`);
    }
  }

  return {
    success: true,
    version,
    verification: {
      beastmode: verification.beastmode,
      claude: verification.claude,
    },
    paths: {
      plugin: cacheDir,
      cli: cliDir,
    },
  };
}

function defaultExec(cmd) {
  const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  return { stdout: result, stderr: '', exitCode: 0 };
}
