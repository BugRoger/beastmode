// src/npx-cli/__tests__/install-command.integration.test.mjs
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Integration tests for `npx beastmode install`.
 * Exercises the full install flow with a sandboxed HOME directory.
 * Mocks shell commands (bun, claude) to avoid real side effects.
 */

// Helper: create a sandboxed environment
async function createSandbox() {
  const home = await mkdtemp(join(tmpdir(), 'beastmode-test-'));
  const claudePluginsDir = join(home, '.claude', 'plugins');
  await mkdir(claudePluginsDir, { recursive: true });

  // Create minimal settings.json
  await writeFile(
    join(home, '.claude', 'settings.json'),
    JSON.stringify({ permissions: {} }, null, 2)
  );

  // Create empty JSON config files
  await writeFile(
    join(claudePluginsDir, 'known_marketplaces.json'),
    JSON.stringify({}, null, 2)
  );
  await writeFile(
    join(claudePluginsDir, 'installed_plugins.json'),
    JSON.stringify({ version: 2, plugins: {} }, null, 2)
  );

  return { home, claudePluginsDir };
}

describe('Fresh install provisions the full beastmode system', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('installs plugin and registers with Claude Code', async () => {
    const { install } = await import('../install.mjs');

    const result = await install({
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: true, claude: true, beastmode: true }),
      packageDir: getPackageDir(),
    });

    assert.equal(result.success, true);

    // Plugin files exist
    const marketplaceDir = join(sandbox.home, '.claude', 'plugins', 'marketplaces', 'bugroger');
    const cacheDir = join(sandbox.home, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode');
    const marketplaceExists = await pathExists(marketplaceDir);
    const cacheExists = await pathExists(cacheDir);
    assert.ok(marketplaceExists, 'Marketplace directory should exist');
    assert.ok(cacheExists, 'Cache directory should exist');

    // JSON configs updated
    const settings = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'settings.json'), 'utf8')
    );
    assert.ok(settings.enabledPlugins, 'enabledPlugins should exist');
    assert.equal(settings.enabledPlugins['beastmode@beastmode-marketplace'], true);

    const installed = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    assert.ok(installed.plugins['beastmode@beastmode-marketplace'], 'Plugin should be registered');

    const marketplaces = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'plugins', 'known_marketplaces.json'), 'utf8')
    );
    assert.ok(marketplaces['beastmode-marketplace'], 'Marketplace should be registered');
  });
});

describe('Installer auto-provisions bun when missing', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('installs bun when not found on PATH', async () => {
    const { install } = await import('../install.mjs');
    const commands = [];

    const result = await install({
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: false, claude: true, beastmode: true, onExec: (cmd) => commands.push(cmd) }),
      packageDir: getPackageDir(),
    });

    assert.equal(result.success, true);
    const bunInstallCmd = commands.find(c => c.includes('bun.sh/install'));
    assert.ok(bunInstallCmd, 'Should have called bun install script');
  });
});

describe('Installer skips bun when already present', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('does not invoke bun install when bun is available', async () => {
    const { install } = await import('../install.mjs');
    const commands = [];

    const result = await install({
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: true, claude: true, beastmode: true, onExec: (cmd) => commands.push(cmd) }),
      packageDir: getPackageDir(),
    });

    assert.equal(result.success, true);
    const bunInstallCmd = commands.find(c => c.includes('bun.sh/install'));
    assert.equal(bunInstallCmd, undefined, 'Should NOT have called bun install script');
  });
});

describe('Re-running install updates to latest version', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('overwrites existing installation without duplicate registrations', async () => {
    const { install } = await import('../install.mjs');
    const opts = {
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: true, claude: true, beastmode: true }),
      packageDir: getPackageDir(),
    };

    // Install twice
    await install(opts);
    const result = await install(opts);

    assert.equal(result.success, true);

    // No duplicate registrations
    const installed = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    const entries = installed.plugins['beastmode@beastmode-marketplace'];
    assert.ok(Array.isArray(entries), 'Plugin entries should be an array');
    assert.equal(entries.length, 1, 'Should have exactly one registration, not duplicates');
  });
});

describe('Post-install verification confirms working commands', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('reports success when both commands work', async () => {
    const { install } = await import('../install.mjs');

    const result = await install({
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: true, claude: true, beastmode: true }),
      packageDir: getPackageDir(),
    });

    assert.equal(result.success, true);
    assert.ok(result.verification.beastmode, 'beastmode --version should pass');
    assert.ok(result.verification.claude, 'claude --version should pass');
  });
});

describe('Verification failure reports which command is broken', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('identifies broken command in verification result', async () => {
    const { install } = await import('../install.mjs');

    const result = await install({
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: true, claude: true, beastmode: false }),
      packageDir: getPackageDir(),
    });

    // Install itself succeeds but verification reports the broken command
    assert.equal(result.verification.beastmode, false, 'beastmode verification should fail');
    assert.ok(result.verification.claude, 'claude verification should pass');
  });
});

describe('Install failure produces clear diagnostic message', () => {
  let sandbox;

  beforeEach(async () => {
    sandbox = await createSandbox();
  });

  afterEach(async () => {
    await rm(sandbox.home, { recursive: true, force: true });
  });

  it('rejects non-macOS with a clear message', async () => {
    const { install } = await import('../install.mjs');

    const result = await install({
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: true, claude: true, beastmode: true }),
      packageDir: getPackageDir(),
      platform: 'linux',
    });

    assert.equal(result.success, false);
    assert.ok(result.error.includes('macOS'), 'Error should mention macOS');
  });

  it('reports missing Claude Code', async () => {
    const { install } = await import('../install.mjs');

    const result = await install({
      homeDir: sandbox.home,
      skipPrereqs: false,
      execCommand: mockExecCommand({ bun: true, claude: false, beastmode: false }),
      packageDir: getPackageDir(),
    });

    assert.equal(result.success, false);
    assert.ok(result.error.includes('Claude Code') || result.error.includes('claude'), 'Error should mention Claude Code');
  });
});

// --- Helpers ---

function getPackageDir() {
  // Resolve to repo root (3 levels up from __tests__)
  const url = new URL(import.meta.url);
  const testDir = new URL('.', url).pathname;
  return join(testDir, '..', '..', '..');
}

function mockExecCommand({ bun, claude, beastmode, onExec }) {
  return (cmd, opts) => {
    if (onExec) onExec(cmd);

    // which/command checks
    if (cmd.includes('which bun') || cmd.includes('command -v bun')) {
      if (!bun) throw new Error('not found');
      return { stdout: '/usr/local/bin/bun', stderr: '', exitCode: 0 };
    }
    if (cmd.includes('which claude') || cmd.includes('command -v claude')) {
      if (!claude) throw new Error('not found');
      return { stdout: '/usr/local/bin/claude', stderr: '', exitCode: 0 };
    }

    // Version checks
    if (cmd.includes('beastmode --version')) {
      if (!beastmode) throw new Error('command not found');
      return { stdout: '0.99.0', stderr: '', exitCode: 0 };
    }
    if (cmd.includes('claude --version')) {
      if (!claude) throw new Error('command not found');
      return { stdout: '1.0.0', stderr: '', exitCode: 0 };
    }

    // bun install / bun link — always succeed
    if (cmd.includes('bun install') || cmd.includes('bun link')) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    // bun.sh install script
    if (cmd.includes('bun.sh/install')) {
      return { stdout: 'Bun installed', stderr: '', exitCode: 0 };
    }

    // Default: succeed
    return { stdout: '', stderr: '', exitCode: 0 };
  };
}

async function pathExists(p) {
  try {
    const { stat } = await import('node:fs/promises');
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
