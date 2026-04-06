import { rm, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { removeConfigs } from './config-remover.mjs';

/**
 * Run the full beastmode uninstall flow.
 *
 * @param {object} opts
 * @param {string} opts.homeDir - user home directory
 * @param {function} opts.execCommand - shell executor (default: execSync wrapper)
 */
export async function uninstall(opts) {
  const {
    homeDir,
    execCommand = defaultExec,
  } = opts;

  const marketplaceDir = join(homeDir, '.claude', 'plugins', 'marketplaces', 'bugroger');
  const cacheBaseDir = join(homeDir, '.claude', 'plugins', 'cache', 'bugroger');

  // Check if beastmode is installed
  const isInstalled = await detectInstallation({ homeDir, marketplaceDir, cacheBaseDir });

  if (!isInstalled) {
    console.log('beastmode is not installed — nothing to remove.');
    return { success: true, wasInstalled: false };
  }

  console.log('Uninstalling beastmode...');

  // Step 1: Unlink CLI (before deleting files — needs the cli dir)
  const unlinkResult = await unlinkCli({ execCommand });

  // Step 2: Remove JSON config entries
  const configResult = await removeConfigs({ homeDir });

  // Step 3: Delete plugin directories
  const dirsRemoved = [];

  try {
    await rm(marketplaceDir, { recursive: true, force: true });
    dirsRemoved.push(marketplaceDir);
  } catch {
    // Directory may not exist — that's fine
  }

  try {
    await rm(cacheBaseDir, { recursive: true, force: true });
    dirsRemoved.push(cacheBaseDir);
  } catch {
    // Directory may not exist — that's fine
  }

  // Summary
  console.log('');
  console.log('beastmode uninstalled.');
  console.log('');
  if (configResult.removedEntries > 0) {
    console.log('  Removed plugin registration from Claude Code config.');
  }
  if (dirsRemoved.length > 0) {
    console.log('  Removed cached plugin files.');
  }
  if (unlinkResult.unlinked) {
    console.log('  Removed beastmode CLI from PATH.');
  } else if (unlinkResult.skipped) {
    console.log('  CLI unlink skipped (bun not available).');
  }
  console.log('');
  console.log('  Project-level .beastmode/ data was preserved.');

  return {
    success: true,
    wasInstalled: true,
    configEntriesRemoved: configResult.removedEntries,
    dirsRemoved: dirsRemoved.length,
    cliUnlinked: unlinkResult.unlinked,
  };
}

async function detectInstallation({ homeDir, marketplaceDir, cacheBaseDir }) {
  const checks = [
    pathExists(marketplaceDir),
    pathExists(cacheBaseDir),
    checkJsonHasBeastmode(join(homeDir, '.claude', 'settings.json')),
    checkJsonHasBeastmode(join(homeDir, '.claude', 'plugins', 'installed_plugins.json')),
  ];

  const results = await Promise.all(checks);
  return results.some(Boolean);
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function checkJsonHasBeastmode(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return content.includes('beastmode');
  } catch {
    return false;
  }
}

async function unlinkCli({ execCommand }) {
  try {
    execCommand('command -v bun');
  } catch {
    return { unlinked: false, skipped: true };
  }

  try {
    execCommand('bun unlink beastmode');
    return { unlinked: true, skipped: false };
  } catch {
    return { unlinked: false, skipped: false };
  }
}

function defaultExec(cmd) {
  const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  return { stdout: result, stderr: '', exitCode: 0 };
}
