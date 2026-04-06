import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Remove beastmode entries from Claude Code's JSON config files.
 * Preserves all non-beastmode content.
 *
 * @param {object} opts
 * @param {string} opts.homeDir - user home directory
 * @returns {{ removedEntries: number }}
 */
export async function removeConfigs({ homeDir }) {
  let removedEntries = 0;

  removedEntries += await removeFromSettings(homeDir);
  removedEntries += await removeFromInstalledPlugins(homeDir);
  removedEntries += await removeFromKnownMarketplaces(homeDir);

  return { removedEntries };
}

async function readJsonSafe(filePath, defaultValue) {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

async function writeJson(filePath, data) {
  const dir = join(filePath, '..');
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

async function removeFromSettings(homeDir) {
  const filePath = join(homeDir, '.claude', 'settings.json');
  const data = await readJsonSafe(filePath, null);
  if (!data) return 0;

  if (data.enabledPlugins && data.enabledPlugins['beastmode@beastmode-marketplace'] !== undefined) {
    delete data.enabledPlugins['beastmode@beastmode-marketplace'];
    await writeJson(filePath, data);
    return 1;
  }

  return 0;
}

async function removeFromInstalledPlugins(homeDir) {
  const filePath = join(homeDir, '.claude', 'plugins', 'installed_plugins.json');
  const data = await readJsonSafe(filePath, null);
  if (!data) return 0;

  if (data.plugins && data.plugins['beastmode@beastmode-marketplace'] !== undefined) {
    delete data.plugins['beastmode@beastmode-marketplace'];
    await writeJson(filePath, data);
    return 1;
  }

  return 0;
}

async function removeFromKnownMarketplaces(homeDir) {
  const filePath = join(homeDir, '.claude', 'plugins', 'known_marketplaces.json');
  const data = await readJsonSafe(filePath, null);
  if (!data) return 0;

  if (data['beastmode-marketplace'] !== undefined) {
    delete data['beastmode-marketplace'];
    await writeJson(filePath, data);
    return 1;
  }

  return 0;
}
