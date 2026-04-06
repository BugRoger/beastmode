// src/npx-cli/__tests__/plugin-copier.test.mjs
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyPlugin } from '../plugin-copier.mjs';

describe('copyPlugin', () => {
  let homeDir;
  let sourceDir;

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'beastmode-copier-'));
    sourceDir = await mkdtemp(join(tmpdir(), 'beastmode-source-'));

    // Create a fake plugin source tree
    await mkdir(join(sourceDir, 'plugin', 'skills', 'design'), { recursive: true });
    await writeFile(join(sourceDir, 'plugin', 'skills', 'design', 'SKILL.md'), '# Design');
    await mkdir(join(sourceDir, 'plugin', 'agents'), { recursive: true });
    await writeFile(join(sourceDir, 'plugin', 'agents', 'dev.md'), '# Dev');
    await mkdir(join(sourceDir, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(sourceDir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'beastmode', version: '0.99.0' })
    );
    await writeFile(
      join(sourceDir, '.claude-plugin', 'marketplace.json'),
      JSON.stringify({
        name: 'beastmode-marketplace',
        owner: { name: 'bugroger' },
        plugins: [{ name: 'beastmode', version: '0.99.0', source: './' }],
      })
    );
  });

  afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
    await rm(sourceDir, { recursive: true, force: true });
  });

  it('copies plugin to marketplace and cache directories', async () => {
    await copyPlugin({ homeDir, packageDir: sourceDir, version: '0.99.0' });

    const marketplaceDir = join(homeDir, '.claude', 'plugins', 'marketplaces', 'bugroger');
    const cacheDir = join(homeDir, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode', '0.99.0');

    // Marketplace dir has marketplace.json
    const mktJson = JSON.parse(await readFile(join(marketplaceDir, 'marketplace.json'), 'utf8'));
    assert.equal(mktJson.name, 'beastmode-marketplace');

    // Cache dir has plugin files
    const skillFile = await readFile(join(cacheDir, 'skills', 'design', 'SKILL.md'), 'utf8');
    assert.equal(skillFile, '# Design');
  });

  it('clean-replaces existing installation', async () => {
    // Install once
    await copyPlugin({ homeDir, packageDir: sourceDir, version: '0.99.0' });

    // Modify a file in the source
    await writeFile(join(sourceDir, 'plugin', 'skills', 'design', 'SKILL.md'), '# Design v2');

    // Install again
    await copyPlugin({ homeDir, packageDir: sourceDir, version: '0.99.0' });

    const cacheDir = join(homeDir, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode', '0.99.0');
    const content = await readFile(join(cacheDir, 'skills', 'design', 'SKILL.md'), 'utf8');
    assert.equal(content, '# Design v2');
  });
});
