import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function createInstalledSandbox() {
  const home = await mkdtemp(join(tmpdir(), 'beastmode-uninstall-'));
  const claudeDir = join(home, '.claude');
  const pluginsDir = join(claudeDir, 'plugins');

  const marketplaceDir = join(pluginsDir, 'marketplaces', 'bugroger');
  const cacheDir = join(pluginsDir, 'cache', 'bugroger', 'beastmode', '0.99.0');
  await mkdir(marketplaceDir, { recursive: true });
  await mkdir(join(cacheDir, 'skills'), { recursive: true });
  await mkdir(join(cacheDir, 'cli'), { recursive: true });
  await writeFile(join(marketplaceDir, 'marketplace.json'), '{}');
  await writeFile(join(cacheDir, 'plugin.json'), '{}');
  await writeFile(join(cacheDir, 'skills', 'design.md'), '# Design');

  await writeFile(
    join(claudeDir, 'settings.json'),
    JSON.stringify({
      permissions: { allow: ['Bash(git:*)'] },
      enabledPlugins: {
        'other-plugin@other': true,
        'beastmode@beastmode-marketplace': true,
      },
    }, null, 2)
  );

  await writeFile(
    join(pluginsDir, 'installed_plugins.json'),
    JSON.stringify({
      version: 2,
      plugins: {
        'other@marketplace': [{ scope: 'user', version: '1.0.0' }],
        'beastmode@beastmode-marketplace': [{
          scope: 'user',
          installPath: cacheDir,
          version: '0.99.0',
        }],
      },
    }, null, 2)
  );

  await writeFile(
    join(pluginsDir, 'known_marketplaces.json'),
    JSON.stringify({
      'other-marketplace': { source: { source: 'npm', name: 'other' } },
      'beastmode-marketplace': {
        source: { source: 'npm', name: 'beastmode' },
        installLocation: marketplaceDir,
      },
    }, null, 2)
  );

  return { home, claudeDir, pluginsDir, marketplaceDir, cacheDir };
}

describe('Uninstall removes plugin registration and CLI link', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createInstalledSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('removes beastmode from all three JSON config files', async () => {
    const { uninstall } = await import('../uninstall.mjs');

    const result = await uninstall({
      homeDir: sandbox.home,
      execCommand: mockExecCommand({ bun: true }),
    });

    assert.equal(result.success, true);

    const settings = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(settings.enabledPlugins['beastmode@beastmode-marketplace'], undefined);
    assert.equal(settings.enabledPlugins['other-plugin@other'], true);
    assert.deepEqual(settings.permissions, { allow: ['Bash(git:*)'] });

    const installed = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    assert.equal(installed.plugins['beastmode@beastmode-marketplace'], undefined);
    assert.ok(installed.plugins['other@marketplace']);

    const marketplaces = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'plugins', 'known_marketplaces.json'), 'utf8')
    );
    assert.equal(marketplaces['beastmode-marketplace'], undefined);
    assert.ok(marketplaces['other-marketplace']);
  });

  it('deletes marketplace and cache directories', async () => {
    const { uninstall } = await import('../uninstall.mjs');

    await uninstall({
      homeDir: sandbox.home,
      execCommand: mockExecCommand({ bun: true }),
    });

    assert.equal(await pathExists(sandbox.marketplaceDir), false);
    assert.equal(await pathExists(sandbox.cacheDir), false);
  });

  it('calls bun unlink to remove CLI from PATH', async () => {
    const { uninstall } = await import('../uninstall.mjs');
    const commands = [];

    await uninstall({
      homeDir: sandbox.home,
      execCommand: mockExecCommand({ bun: true, onExec: (cmd) => commands.push(cmd) }),
    });

    const unlinkCmd = commands.find(c => c.includes('bun unlink'));
    assert.ok(unlinkCmd, 'Should have called bun unlink');
  });
});

describe('Uninstall preserves project-level beastmode data', () => {
  let sandbox;
  let projectBeastmodeDir;

  beforeEach(async () => {
    sandbox = await createInstalledSandbox();
    projectBeastmodeDir = join(sandbox.home, 'myproject', '.beastmode');
    await mkdir(join(projectBeastmodeDir, 'config'), { recursive: true });
    await writeFile(join(projectBeastmodeDir, 'config', 'config.yaml'), 'github:\n  enabled: false');
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('leaves project .beastmode directories intact', async () => {
    const { uninstall } = await import('../uninstall.mjs');

    await uninstall({
      homeDir: sandbox.home,
      execCommand: mockExecCommand({ bun: true }),
    });

    assert.ok(await pathExists(projectBeastmodeDir), 'Project .beastmode should still exist');
    const config = await readFile(join(projectBeastmodeDir, 'config', 'config.yaml'), 'utf8');
    assert.ok(config.includes('github:'), 'Project config should be intact');
  });
});

describe('Uninstall on a machine where beastmode is not installed', () => {
  let sandbox;

  beforeEach(async () => {
    const home = await mkdtemp(join(tmpdir(), 'beastmode-uninstall-'));
    const claudeDir = join(home, '.claude');
    const pluginsDir = join(claudeDir, 'plugins');
    await mkdir(pluginsDir, { recursive: true });

    await writeFile(
      join(claudeDir, 'settings.json'),
      JSON.stringify({ permissions: {} }, null, 2)
    );
    await writeFile(
      join(pluginsDir, 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: {} }, null, 2)
    );
    await writeFile(
      join(pluginsDir, 'known_marketplaces.json'),
      JSON.stringify({}, null, 2)
    );

    sandbox = { home };
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('exits gracefully with a message that nothing was installed', async () => {
    const { uninstall } = await import('../uninstall.mjs');

    const result = await uninstall({
      homeDir: sandbox.home,
      execCommand: mockExecCommand({ bun: true }),
    });

    assert.equal(result.success, true);
    assert.equal(result.wasInstalled, false);
  });
});

describe('Uninstall gracefully handles missing bun', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createInstalledSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('skips bun unlink when bun is not available', async () => {
    const { uninstall } = await import('../uninstall.mjs');

    const result = await uninstall({
      homeDir: sandbox.home,
      execCommand: mockExecCommand({ bun: false }),
    });

    assert.equal(result.success, true);
  });
});

function mockExecCommand({ bun, onExec }) {
  return (cmd) => {
    if (onExec) onExec(cmd);

    if (cmd.includes('command -v bun') || cmd.includes('which bun')) {
      if (!bun) throw new Error('not found');
      return { stdout: '/usr/local/bin/bun', exitCode: 0 };
    }

    if (cmd.includes('bun unlink')) {
      if (!bun) throw new Error('bun not found');
      return { stdout: '', exitCode: 0 };
    }

    return { stdout: '', exitCode: 0 };
  };
}
