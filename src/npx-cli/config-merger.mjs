// src/npx-cli/config-merger.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Merge beastmode entries into Claude Code's JSON config files.
 * Preserves all existing content — only adds/updates beastmode entries.
 *
 * @param {object} opts
 * @param {string} opts.homeDir - user home directory
 * @param {string} opts.version - plugin version being installed
 */
export async function mergeConfigs({ homeDir, version }) {
  await mergeKnownMarketplaces(homeDir);
  await mergeInstalledPlugins(homeDir, version);
  await mergeSettings(homeDir);
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

async function mergeKnownMarketplaces(homeDir) {
  const filePath = join(homeDir, '.claude', 'plugins', 'known_marketplaces.json');
  const data = await readJsonSafe(filePath, {});

  data['beastmode-marketplace'] = {
    source: {
      source: 'directory',
      path: join(homeDir, '.claude', 'plugins', 'marketplaces', 'bugroger'),
    },
    installLocation: join(homeDir, '.claude', 'plugins', 'marketplaces', 'bugroger'),
    lastUpdated: new Date().toISOString(),
  };

  await writeJson(filePath, data);
}

async function mergeInstalledPlugins(homeDir, version) {
  const filePath = join(homeDir, '.claude', 'plugins', 'installed_plugins.json');
  const data = await readJsonSafe(filePath, { version: 2, plugins: {} });

  if (!data.plugins) data.plugins = {};

  // Replace (not append) the beastmode entry — idempotent
  data.plugins['beastmode@beastmode-marketplace'] = [
    {
      scope: 'user',
      installPath: join(
        homeDir, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode', version
      ),
      version,
      installedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      gitCommitSha: 'npm',
    },
  ];

  await writeJson(filePath, data);
}

async function mergeSettings(homeDir) {
  const filePath = join(homeDir, '.claude', 'settings.json');
  const data = await readJsonSafe(filePath, {});

  if (!data.enabledPlugins) data.enabledPlugins = {};
  data.enabledPlugins['beastmode@beastmode-marketplace'] = true;

  await writeJson(filePath, data);
}
