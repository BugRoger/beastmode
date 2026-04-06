# Uninstall Command — Implementation Tasks

## Goal

Implement `npx beastmode uninstall` — a command that cleanly removes the beastmode plugin registration, CLI link, and cached files while preserving project-level `.beastmode/` data. Pure Node.js `.mjs` files, same patterns as the install command.

## Architecture

- **Entry point:** `src/npx-cli/index.mjs` — add `uninstall` case to existing dispatcher
- **Modules:** New `.mjs` files under `src/npx-cli/` for uninstall-specific logic; reuses `readJsonSafe`/`writeJson` patterns from config-merger
- **Runtime:** Plain Node.js (>=18), no external dependencies
- **Pattern:** Reverse of install — remove JSON entries, delete directories, unlink CLI

## Key Design Decisions (from PRD)

- Remove beastmode entries from 3 JSON config files using same read-merge-write pattern (but delete instead of add)
- Delete marketplace dir (`~/.claude/plugins/marketplaces/bugroger/`) and cache dir (`~/.claude/plugins/cache/bugroger/`)
- Run `bun unlink` to remove CLI from PATH; graceful skip if bun is missing
- NEVER touch project-level `.beastmode/` directories
- Graceful no-op if beastmode is not installed ("beastmode is not installed — nothing to remove")
- Print summary of what was removed

## File Structure

| File | Responsibility |
|------|---------------|
| `src/npx-cli/uninstall.mjs` | Uninstall orchestrator — runs all removal steps in order |
| `src/npx-cli/config-remover.mjs` | Remove beastmode entries from JSON config files |
| `src/npx-cli/index.mjs` | Add `uninstall` case to CLI dispatcher (modify existing) |
| `src/npx-cli/__tests__/uninstall-command.integration.test.mjs` | Integration test (Task 0) |
| `src/npx-cli/__tests__/config-remover.test.mjs` | Config remover unit tests |

---

### Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `src/npx-cli/__tests__/uninstall-command.integration.test.mjs`

Write the integration test from the Gherkin scenarios. Uses Node.js built-in `node:test` and `node:assert`. Tests run against the uninstall module with a mocked HOME directory and mocked shell commands. Expected to fail (RED) until implementation is complete.

- [x] **Step 1: Write the integration test**

```javascript
// src/npx-cli/__tests__/uninstall-command.integration.test.mjs
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Integration tests for `npx beastmode uninstall`.
 * Exercises the full uninstall flow with a sandboxed HOME directory.
 */

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// Helper: create a sandboxed environment with beastmode fully installed
async function createInstalledSandbox() {
  const home = await mkdtemp(join(tmpdir(), 'beastmode-uninstall-'));
  const claudeDir = join(home, '.claude');
  const pluginsDir = join(claudeDir, 'plugins');

  // Create plugin directories
  const marketplaceDir = join(pluginsDir, 'marketplaces', 'bugroger');
  const cacheDir = join(pluginsDir, 'cache', 'bugroger', 'beastmode', '0.99.0');
  await mkdir(marketplaceDir, { recursive: true });
  await mkdir(join(cacheDir, 'skills'), { recursive: true });
  await mkdir(join(cacheDir, 'cli'), { recursive: true });
  await writeFile(join(marketplaceDir, 'marketplace.json'), '{}');
  await writeFile(join(cacheDir, 'plugin.json'), '{}');
  await writeFile(join(cacheDir, 'skills', 'design.md'), '# Design');

  // Create JSON config files with beastmode entries
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

    // settings.json: beastmode removed, other plugins preserved
    const settings = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(settings.enabledPlugins['beastmode@beastmode-marketplace'], undefined);
    assert.equal(settings.enabledPlugins['other-plugin@other'], true);
    assert.deepEqual(settings.permissions, { allow: ['Bash(git:*)'] });

    // installed_plugins.json: beastmode removed, other plugins preserved
    const installed = JSON.parse(
      await readFile(join(sandbox.home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    assert.equal(installed.plugins['beastmode@beastmode-marketplace'], undefined);
    assert.ok(installed.plugins['other@marketplace']);

    // known_marketplaces.json: beastmode removed, other marketplaces preserved
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
    // Create project-level .beastmode directory
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

    // Empty config files — no beastmode entries
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
    // Should still succeed — bun unlink is best-effort
  });
});

// --- Helpers ---

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
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/npx-cli/__tests__/uninstall-command.integration.test.mjs`
Expected: FAIL — `uninstall.mjs` module does not exist yet

- [x] **Step 3: Commit**

```bash
git add src/npx-cli/__tests__/uninstall-command.integration.test.mjs
git commit -m "test(uninstall-command): add integration test (RED)"
```

---

### Task 1: Config Remover

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/npx-cli/config-remover.mjs`
- Create: `src/npx-cli/__tests__/config-remover.test.mjs`

Remove beastmode entries from Claude Code's JSON config files using the same read-merge-write pattern as config-merger, but deleting instead of adding.

- [x] **Step 1: Write the failing tests**

```javascript
// src/npx-cli/__tests__/config-remover.test.mjs
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
    // Set up config files with beastmode entries
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

    // settings.json
    const settings = JSON.parse(
      await readFile(join(homeDir, '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(settings.enabledPlugins['beastmode@beastmode-marketplace'], undefined);
    assert.equal(settings.enabledPlugins['other@other'], true);

    // installed_plugins.json
    const installed = JSON.parse(
      await readFile(join(homeDir, '.claude', 'plugins', 'installed_plugins.json'), 'utf8')
    );
    assert.equal(installed.plugins['beastmode@beastmode-marketplace'], undefined);
    assert.ok(installed.plugins['other@marketplace']);

    // known_marketplaces.json
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
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test src/npx-cli/__tests__/config-remover.test.mjs`
Expected: FAIL — `config-remover.mjs` does not exist

- [x] **Step 3: Write the implementation**

```javascript
// src/npx-cli/config-remover.mjs
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
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test src/npx-cli/__tests__/config-remover.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/npx-cli/config-remover.mjs src/npx-cli/__tests__/config-remover.test.mjs
git commit -m "feat(uninstall-command): add config remover"
```

---

### Task 2: Uninstall Orchestrator

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `src/npx-cli/uninstall.mjs`

Wires all uninstall steps together. Detects if beastmode is installed, removes JSON entries, deletes directories, unlinks CLI.

- [x] **Step 1: Write the implementation**

```javascript
// src/npx-cli/uninstall.mjs
import { rm, stat } from 'node:fs/promises';
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
  // Check if any of the known beastmode artifacts exist
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
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(filePath, 'utf8');
    return content.includes('beastmode');
  } catch {
    return false;
  }
}

async function unlinkCli({ execCommand }) {
  // Check if bun is available
  try {
    execCommand('command -v bun');
  } catch {
    return { unlinked: false, skipped: true };
  }

  // Try to unlink
  try {
    execCommand('bun unlink beastmode');
    return { unlinked: true, skipped: false };
  } catch {
    // bun unlink failed — not critical
    return { unlinked: false, skipped: false };
  }
}

function defaultExec(cmd) {
  const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  return { stdout: result, stderr: '', exitCode: 0 };
}
```

- [x] **Step 2: Run integration tests**

Run: `node --test src/npx-cli/__tests__/uninstall-command.integration.test.mjs`
Expected: All tests pass

- [x] **Step 3: Commit**

```bash
git add src/npx-cli/uninstall.mjs
git commit -m "feat(uninstall-command): add uninstall orchestrator"
```

---

### Task 3: CLI Entry Point Update

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `src/npx-cli/index.mjs`

Add the `uninstall` case to the CLI dispatcher and update help text.

- [x] **Step 1: Update the entry point**

Add to `src/npx-cli/index.mjs` switch statement, after the `install` case:

```javascript
  case 'uninstall': {
    const { uninstall } = await import('./uninstall.mjs');
    const result = await uninstall({
      homeDir: homedir(),
    });
    process.exit(result.success ? 0 : 1);
    break;
  }
```

Update help text to include uninstall:

```javascript
    console.log('  uninstall   Remove beastmode (preserves project data)');
```

- [x] **Step 2: Verify entry point works**

Run: `node src/npx-cli/index.mjs --help`
Expected: Shows both install and uninstall commands

- [x] **Step 3: Commit**

```bash
git add src/npx-cli/index.mjs
git commit -m "feat(uninstall-command): add uninstall to CLI dispatcher"
```
