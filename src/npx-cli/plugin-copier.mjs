// src/npx-cli/plugin-copier.mjs
import { cp, rm, mkdir, symlink } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Copy plugin files to Claude Code's plugin directories.
 *
 * @param {object} opts
 * @param {string} opts.homeDir - user home directory
 * @param {string} opts.packageDir - root of the npm package (contains plugin/ and .claude-plugin/)
 * @param {string} opts.version - plugin version
 */
export async function copyPlugin({ homeDir, packageDir, version }) {
  const pluginSourceDir = join(packageDir, 'plugin');
  const pluginMetaDir = join(packageDir, '.claude-plugin');

  const marketplaceDir = join(homeDir, '.claude', 'plugins', 'marketplaces', 'bugroger');
  const cacheDir = join(homeDir, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode', version);

  // Clean-replace marketplace directory
  await rm(marketplaceDir, { recursive: true, force: true });
  await mkdir(join(marketplaceDir, '.claude-plugin'), { recursive: true });

  // Copy marketplace.json into .claude-plugin/ subdir (where Claude Code expects it)
  await cp(
    join(pluginMetaDir, 'marketplace.json'),
    join(marketplaceDir, '.claude-plugin', 'marketplace.json')
  );

  // Clean-replace cache directory
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });

  // Copy plugin tree to cache dir (includes plugin.json, skills/, agents/, hooks/)
  await cp(pluginSourceDir, cacheDir, { recursive: true });

  // Symlink plugin content into marketplace dir so "source": "./plugin" resolves
  await symlink(cacheDir, join(marketplaceDir, 'plugin'));

  console.log(`Plugin files copied to ${marketplaceDir}`);
  console.log(`Plugin cache written to ${cacheDir}`);
}
