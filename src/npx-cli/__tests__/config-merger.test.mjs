// src/npx-cli/__tests__/config-merger.test.mjs
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeConfigs } from '../config-merger.mjs';

describe('mergeConfigs', () => {
  let homeDir;

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'beastmode-merger-'));
    const pluginsDir = join(homeDir, '.claude', 'plugins');
    await mkdir(pluginsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
  });

  it('creates config files from scratch when none exist', async () => {
    await mergeConfigs({ homeDir, version: '0.99.0' });

    const settings = JSON.parse(
      await readFile(join(homeDir, '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(settings.enabledPlugins['beastmode@beastmode-marketplace'], true);

    const installed = JSON.parse(
      await readFile(join(homeDir, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    assert.ok(installed.plugins['beastmode@beastmode-marketplace']);

    const marketplaces = JSON.parse(
      await readFile(join(homeDir, '.claude', 'plugins', 'known_marketplaces.json'), 'utf8')
    );
    assert.ok(marketplaces['beastmode-marketplace']);
  });

  it('preserves existing settings when merging', async () => {
    // Write existing settings
    await mkdir(join(homeDir, '.claude'), { recursive: true });
    await writeFile(
      join(homeDir, '.claude', 'settings.json'),
      JSON.stringify({
        permissions: { allow: ['Bash(git:*)'] },
        enabledPlugins: { 'other-plugin@other': true },
      }, null, 2)
    );

    await mergeConfigs({ homeDir, version: '0.99.0' });

    const settings = JSON.parse(
      await readFile(join(homeDir, '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(settings.permissions.allow[0], 'Bash(git:*)');
    assert.equal(settings.enabledPlugins['other-plugin@other'], true);
    assert.equal(settings.enabledPlugins['beastmode@beastmode-marketplace'], true);
  });

  it('preserves existing plugin registrations', async () => {
    await writeFile(
      join(homeDir, '.claude', 'plugins', 'installed_plugins.json'),
      JSON.stringify({
        version: 2,
        plugins: {
          'other@marketplace': [{ scope: 'user', version: '1.0.0' }],
        },
      }, null, 2)
    );

    await mergeConfigs({ homeDir, version: '0.99.0' });

    const installed = JSON.parse(
      await readFile(join(homeDir, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    assert.ok(installed.plugins['other@marketplace'], 'Existing plugin should be preserved');
    assert.ok(installed.plugins['beastmode@beastmode-marketplace'], 'New plugin should be added');
  });

  it('updates version on re-install without duplicating', async () => {
    // First install
    await mergeConfigs({ homeDir, version: '0.98.0' });
    // Second install with new version
    await mergeConfigs({ homeDir, version: '0.99.0' });

    const installed = JSON.parse(
      await readFile(join(homeDir, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    const entries = installed.plugins['beastmode@beastmode-marketplace'];
    assert.equal(entries.length, 1, 'Should have exactly one entry');
    assert.equal(entries[0].version, '0.99.0', 'Version should be updated');
  });
});
