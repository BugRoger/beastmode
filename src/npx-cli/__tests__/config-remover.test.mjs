import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeConfigs } from '../config-remover.mjs';

describe('removeConfigs', () => {
  let homeDir;

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'beastmode-remover-'));
    const claudeDir = join(homeDir, '.claude');
    const pluginsDir = join(claudeDir, 'plugins');
    await mkdir(pluginsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
  });

  it('removes beastmode entries from all three config files', async () => {
    await writeFile(
      join(homeDir, '.claude', 'settings.json'),
      JSON.stringify({
        permissions: {},
        enabledPlugins: {
          'other@other': true,
          'beastmode@beastmode-marketplace': true,
        },
      }, null, 2)
    );

    await writeFile(
      join(homeDir, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({
        version: 2,
        plugins: {
          'other@marketplace': [{ scope: 'user', version: '1.0.0' }],
          'beastmode@beastmode-marketplace': [{ scope: 'user', version: '0.99.0' }],
        },
      }, null, 2)
    );

    await writeFile(
      join(homeDir, '.claude', 'plugins', 'known_marketplaces.json'),
      JSON.stringify({
        'other-marketplace': { source: { source: 'npm', name: 'other' } },
        'beastmode-marketplace': { source: { source: 'npm', name: 'beastmode' } },
      }, null, 2)
    );

    const result = await removeConfigs({ homeDir });

    const settings = JSON.parse(
      await readFile(join(homeDir, '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(settings.enabledPlugins['beastmode@beastmode-marketplace'], undefined);
    assert.equal(settings.enabledPlugins['other@other'], true);

    const installed = JSON.parse(
      await readFile(join(homeDir, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    assert.equal(installed.plugins['beastmode@beastmode-marketplace'], undefined);
    assert.ok(installed.plugins['other@marketplace']);

    const marketplaces = JSON.parse(
      await readFile(join(homeDir, '.claude', 'plugins', 'known_marketplaces.json'), 'utf8')
    );
    assert.equal(marketplaces['beastmode-marketplace'], undefined);
    assert.ok(marketplaces['other-marketplace']);

    assert.equal(result.removedEntries, 3);
  });

  it('handles missing config files gracefully', async () => {
    const result = await removeConfigs({ homeDir });
    assert.equal(result.removedEntries, 0);
  });

  it('handles config files with no beastmode entries', async () => {
    await writeFile(
      join(homeDir, '.claude', 'settings.json'),
      JSON.stringify({ enabledPlugins: { 'other@other': true } }, null, 2)
    );
    await writeFile(
      join(homeDir, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: {} }, null, 2)
    );
    await writeFile(
      join(homeDir, '.claude', 'plugins', 'known_marketplaces.json'),
      JSON.stringify({}, null, 2)
    );

    const result = await removeConfigs({ homeDir });
    assert.equal(result.removedEntries, 0);
  });
});
