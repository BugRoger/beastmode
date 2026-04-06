# Install Command — Implementation Tasks

## Goal

Implement `npx beastmode install` — a single command that installs the beastmode plugin and CLI on a macOS machine with Node.js and Claude Code. Pure Node.js `.mjs` files, no build step, no external dependencies.

## Architecture

- **Entry point:** `src/npx-cli/index.mjs` — minimal command dispatcher
- **Modules:** One `.mjs` file per responsibility under `src/npx-cli/`
- **Runtime:** Plain Node.js (>=18). Users may not have Bun yet.
- **Package:** Root `package.json` publishes as `beastmode` on npm with `bin.beastmode` pointing to the entry point
- **Bundled dirs:** `src/npx-cli/`, `plugin/` (build artifact), `cli/` (Bun CLI source)
- **No external dependencies.** Uses `node:fs`, `node:path`, `node:child_process`, `node:os` only.

## Key Design Decisions (from PRD)

- Install steps are ordered: prereqs → bun → plugin copy → JSON merge → CLI link → verify → summary
- JSON configs use atomic read-merge-write (preserve existing settings)
- Plugin dirs use clean-replace (rm + copy fresh) for idempotency
- Plain text output, no ANSI codes, no interactive prompts
- macOS only — reject other platforms explicitly
- `plugin/` in npm package is a build artifact copied at publish time

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` (root) | npm package metadata, bin entry, files list |
| `src/npx-cli/index.mjs` | CLI entry point — parse args, route to handler |
| `src/npx-cli/install.mjs` | Install orchestrator — runs all steps in order |
| `src/npx-cli/prereqs.mjs` | Prerequisite checker (Node.js, macOS, Claude Code) |
| `src/npx-cli/bun-installer.mjs` | Auto-install bun if missing |
| `src/npx-cli/plugin-copier.mjs` | Copy plugin dir to Claude Code locations |
| `src/npx-cli/config-merger.mjs` | Read-merge-write JSON config files |
| `src/npx-cli/cli-linker.mjs` | Run `bun install` + `bun link` for CLI |
| `src/npx-cli/verify.mjs` | Post-install verification |
| `src/npx-cli/version.mjs` | Read version from plugin.json |
| `src/npx-cli/__tests__/install-command.integration.test.mjs` | Integration test (Task 0) |
| `src/npx-cli/__tests__/prereqs.test.mjs` | Prereq checker unit tests |
| `src/npx-cli/__tests__/bun-installer.test.mjs` | Bun installer unit tests |
| `src/npx-cli/__tests__/plugin-copier.test.mjs` | Plugin copier unit tests |
| `src/npx-cli/__tests__/config-merger.test.mjs` | Config merger unit tests |
| `src/npx-cli/__tests__/cli-linker.test.mjs` | CLI linker unit tests |
| `src/npx-cli/__tests__/verify.test.mjs` | Verification unit tests |

---

### Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `src/npx-cli/__tests__/install-command.integration.test.mjs`

Write the integration test from the Gherkin scenarios. Uses Node.js built-in `node:test` and `node:assert`. Tests run against the install module with a mocked HOME directory (temp dir) and mocked shell commands. Expected to fail (RED) until implementation is complete.

- [x] **Step 1: Write the integration test**

```javascript
// src/npx-cli/__tests__/install-command.integration.test.mjs
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/npx-cli/__tests__/install-command.integration.test.mjs`
Expected: FAIL — `install.mjs` module does not exist yet

- [x] **Step 3: Commit**

```bash
git add src/npx-cli/__tests__/install-command.integration.test.mjs
git commit -m "test(install-command): add integration test (RED)"
```

---

### Task 1: Root package.json + Version Reader

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `package.json` (root)
- Create: `src/npx-cli/version.mjs`

Create the root `package.json` for npm publishing and the version reader module.

- [x] **Step 1: Write the version reader**

```javascript
// src/npx-cli/version.mjs
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getVersion() {
  const pluginJsonPath = join(__dirname, '..', '..', '.claude-plugin', 'plugin.json');
  const content = await readFile(pluginJsonPath, 'utf8');
  const plugin = JSON.parse(content);
  return plugin.version;
}
```

- [x] **Step 2: Create root package.json**

```json
{
  "name": "beastmode",
  "version": "0.99.0",
  "description": "Agentic workflow skills for Claude Code. Activate beastmode.",
  "type": "module",
  "bin": {
    "beastmode": "src/npx-cli/index.mjs"
  },
  "files": [
    "src/npx-cli/",
    "plugin/",
    "cli/"
  ],
  "scripts": {
    "test:npx": "node --test src/npx-cli/__tests__/*.test.mjs",
    "test:integration": "node --test src/npx-cli/__tests__/*.integration.test.mjs"
  },
  "keywords": [
    "claude",
    "claude-code",
    "beastmode",
    "ai",
    "workflow"
  ],
  "author": "bugroger",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/BugRoger/beastmode"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [x] **Step 3: Commit**

```bash
git add package.json src/npx-cli/version.mjs
git commit -m "feat(install-command): add root package.json and version reader"
```

---

### Task 2: Prerequisite Checker

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/npx-cli/prereqs.mjs`
- Create: `src/npx-cli/__tests__/prereqs.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
// src/npx-cli/__tests__/prereqs.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrereqs } from '../prereqs.mjs';

describe('checkPrereqs', () => {
  it('passes when all prerequisites are met', async () => {
    const result = await checkPrereqs({
      platform: 'darwin',
      execCommand: (cmd) => {
        if (cmd.includes('which claude') || cmd.includes('command -v claude')) {
          return { stdout: '/usr/local/bin/claude', exitCode: 0 };
        }
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects non-macOS platforms', async () => {
    const result = await checkPrereqs({
      platform: 'linux',
      execCommand: () => ({ stdout: '', exitCode: 0 }),
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors[0].includes('macOS'));
  });

  it('rejects when Claude Code is not installed', async () => {
    const result = await checkPrereqs({
      platform: 'darwin',
      execCommand: (cmd) => {
        if (cmd.includes('which claude') || cmd.includes('command -v claude')) {
          throw new Error('not found');
        }
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('Claude Code') || e.includes('claude')));
  });

  it('returns actionable error messages', async () => {
    const result = await checkPrereqs({
      platform: 'win32',
      execCommand: () => { throw new Error('not found'); },
    });

    assert.equal(result.ok, false);
    // Each error should suggest a remediation
    for (const error of result.errors) {
      assert.ok(error.length > 20, `Error should be descriptive: ${error}`);
    }
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test src/npx-cli/__tests__/prereqs.test.mjs`
Expected: FAIL — `prereqs.mjs` does not exist

- [x] **Step 3: Write the implementation**

```javascript
// src/npx-cli/prereqs.mjs

/**
 * Check installation prerequisites.
 * Returns { ok: boolean, errors: string[] }
 *
 * @param {object} opts
 * @param {string} opts.platform - process.platform value
 * @param {function} opts.execCommand - shell command executor
 */
export async function checkPrereqs({ platform, execCommand }) {
  const errors = [];

  // Check macOS
  if (platform !== 'darwin') {
    errors.push(
      `beastmode requires macOS. Detected platform: ${platform}. ` +
      `Linux and Windows are not supported yet.`
    );
    // Fail fast — no point checking other prereqs on wrong OS
    return { ok: false, errors };
  }

  // Check Claude Code
  try {
    execCommand('command -v claude');
  } catch {
    errors.push(
      'Claude Code is not installed. ' +
      'Install it from https://claude.ai/download and run `claude` once to complete setup.'
    );
  }

  return { ok: errors.length === 0, errors };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test src/npx-cli/__tests__/prereqs.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/npx-cli/prereqs.mjs src/npx-cli/__tests__/prereqs.test.mjs
git commit -m "feat(install-command): add prerequisite checker"
```

---

### Task 3: Bun Auto-Installer

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/npx-cli/bun-installer.mjs`
- Create: `src/npx-cli/__tests__/bun-installer.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
// src/npx-cli/__tests__/bun-installer.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureBun } from '../bun-installer.mjs';

describe('ensureBun', () => {
  it('skips install when bun is already available', async () => {
    const commands = [];

    const result = await ensureBun({
      execCommand: (cmd) => {
        commands.push(cmd);
        if (cmd.includes('command -v bun')) {
          return { stdout: '/usr/local/bin/bun', exitCode: 0 };
        }
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.installed, false);
    assert.equal(result.alreadyPresent, true);
    const installCmd = commands.find(c => c.includes('bun.sh/install'));
    assert.equal(installCmd, undefined);
  });

  it('installs bun when not found', async () => {
    const commands = [];
    let bunAvailable = false;

    const result = await ensureBun({
      execCommand: (cmd) => {
        commands.push(cmd);
        if (cmd.includes('command -v bun')) {
          if (!bunAvailable) {
            // First check: not found. After install: found.
            throw new Error('not found');
          }
          return { stdout: '/usr/local/bin/bun', exitCode: 0 };
        }
        if (cmd.includes('bun.sh/install')) {
          bunAvailable = true;
          return { stdout: 'Bun installed', exitCode: 0 };
        }
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.installed, true);
    assert.equal(result.alreadyPresent, false);
    const installCmd = commands.find(c => c.includes('bun.sh/install'));
    assert.ok(installCmd, 'Should have run bun install script');
  });

  it('throws when bun install fails', async () => {
    await assert.rejects(
      () => ensureBun({
        execCommand: (cmd) => {
          if (cmd.includes('command -v bun')) throw new Error('not found');
          if (cmd.includes('bun.sh/install')) throw new Error('curl failed');
          return { stdout: '', exitCode: 0 };
        },
      }),
      /Failed to install bun/
    );
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test src/npx-cli/__tests__/bun-installer.test.mjs`
Expected: FAIL — `bun-installer.mjs` does not exist

- [x] **Step 3: Write the implementation**

```javascript
// src/npx-cli/bun-installer.mjs

/**
 * Ensure bun is available. If not, install it via the official script.
 * Returns { installed: boolean, alreadyPresent: boolean }
 *
 * @param {object} opts
 * @param {function} opts.execCommand - shell command executor
 */
export async function ensureBun({ execCommand }) {
  // Check if bun is already available
  try {
    execCommand('command -v bun');
    return { installed: false, alreadyPresent: true };
  } catch {
    // bun not found — install it
  }

  console.log('bun not found. Installing...');

  try {
    execCommand('curl -fsSL https://bun.sh/install | bash');
  } catch (err) {
    throw new Error(
      `Failed to install bun. ` +
      `You can install it manually: curl -fsSL https://bun.sh/install | bash\n` +
      `Error: ${err.message}`
    );
  }

  console.log('bun installed.');
  return { installed: true, alreadyPresent: false };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test src/npx-cli/__tests__/bun-installer.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/npx-cli/bun-installer.mjs src/npx-cli/__tests__/bun-installer.test.mjs
git commit -m "feat(install-command): add bun auto-installer"
```

---

### Task 4: Plugin Copier

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/npx-cli/plugin-copier.mjs`
- Create: `src/npx-cli/__tests__/plugin-copier.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
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
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test src/npx-cli/__tests__/plugin-copier.test.mjs`
Expected: FAIL — `plugin-copier.mjs` does not exist

- [x] **Step 3: Write the implementation**

```javascript
// src/npx-cli/plugin-copier.mjs
import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
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
  await mkdir(marketplaceDir, { recursive: true });

  // Copy marketplace.json to marketplace dir
  await cp(
    join(pluginMetaDir, 'marketplace.json'),
    join(marketplaceDir, 'marketplace.json')
  );

  // Clean-replace cache directory
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });

  // Copy plugin tree to cache dir
  await cp(pluginSourceDir, cacheDir, { recursive: true });

  // Also copy plugin.json into cache dir
  await cp(
    join(pluginMetaDir, 'plugin.json'),
    join(cacheDir, 'plugin.json')
  );

  console.log(`Plugin files copied to ${marketplaceDir}`);
  console.log(`Plugin cache written to ${cacheDir}`);
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test src/npx-cli/__tests__/plugin-copier.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/npx-cli/plugin-copier.mjs src/npx-cli/__tests__/plugin-copier.test.mjs
git commit -m "feat(install-command): add plugin copier"
```

---

### Task 5: JSON Config Merger

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/npx-cli/config-merger.mjs`
- Create: `src/npx-cli/__tests__/config-merger.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
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
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test src/npx-cli/__tests__/config-merger.test.mjs`
Expected: FAIL — `config-merger.mjs` does not exist

- [x] **Step 3: Write the implementation**

```javascript
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
      source: 'npm',
      name: 'beastmode',
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
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test src/npx-cli/__tests__/config-merger.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/npx-cli/config-merger.mjs src/npx-cli/__tests__/config-merger.test.mjs
git commit -m "feat(install-command): add JSON config merger"
```

---

### Task 6: CLI Linker

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/npx-cli/cli-linker.mjs`
- Create: `src/npx-cli/__tests__/cli-linker.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
// src/npx-cli/__tests__/cli-linker.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { linkCli } from '../cli-linker.mjs';

describe('linkCli', () => {
  it('runs bun install and bun link in the cli directory', async () => {
    const commands = [];

    await linkCli({
      cliDir: '/fake/cli',
      execCommand: (cmd) => {
        commands.push(cmd);
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    });

    assert.ok(
      commands.some(c => c.includes('bun install') && c.includes('--production')),
      'Should run bun install --production'
    );
    assert.ok(
      commands.some(c => c.includes('bun link')),
      'Should run bun link'
    );
  });

  it('throws on bun install failure', async () => {
    await assert.rejects(
      () => linkCli({
        cliDir: '/fake/cli',
        execCommand: (cmd) => {
          if (cmd.includes('bun install')) throw new Error('install failed');
          return { stdout: '', exitCode: 0 };
        },
      }),
      /Failed to install CLI dependencies/
    );
  });

  it('throws on bun link failure', async () => {
    await assert.rejects(
      () => linkCli({
        cliDir: '/fake/cli',
        execCommand: (cmd) => {
          if (cmd.includes('bun link')) throw new Error('link failed');
          return { stdout: '', exitCode: 0 };
        },
      }),
      /Failed to link CLI/
    );
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test src/npx-cli/__tests__/cli-linker.test.mjs`
Expected: FAIL — `cli-linker.mjs` does not exist

- [x] **Step 3: Write the implementation**

```javascript
// src/npx-cli/cli-linker.mjs

/**
 * Install CLI dependencies and link the beastmode command.
 *
 * @param {object} opts
 * @param {string} opts.cliDir - path to the cli/ directory in the cache
 * @param {function} opts.execCommand - shell command executor
 */
export async function linkCli({ cliDir, execCommand }) {
  console.log('Installing CLI dependencies...');

  try {
    execCommand(`cd "${cliDir}" && bun install --production`);
  } catch (err) {
    throw new Error(
      `Failed to install CLI dependencies in ${cliDir}.\n` +
      `Try running manually: cd "${cliDir}" && bun install --production\n` +
      `Error: ${err.message}`
    );
  }

  console.log('Linking beastmode CLI...');

  try {
    execCommand(`cd "${cliDir}" && bun link`);
  } catch (err) {
    throw new Error(
      `Failed to link CLI. The beastmode command may not be available on your PATH.\n` +
      `Try running manually: cd "${cliDir}" && bun link\n` +
      `Error: ${err.message}`
    );
  }

  console.log('CLI linked.');
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test src/npx-cli/__tests__/cli-linker.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/npx-cli/cli-linker.mjs src/npx-cli/__tests__/cli-linker.test.mjs
git commit -m "feat(install-command): add CLI linker"
```

---

### Task 7: Verification Module

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/npx-cli/verify.mjs`
- Create: `src/npx-cli/__tests__/verify.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
// src/npx-cli/__tests__/verify.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyInstall } from '../verify.mjs';

describe('verifyInstall', () => {
  it('returns success when both commands work', async () => {
    const result = await verifyInstall({
      execCommand: (cmd) => {
        if (cmd.includes('beastmode --version')) return { stdout: '0.99.0', exitCode: 0 };
        if (cmd.includes('claude --version')) return { stdout: '1.0.0', exitCode: 0 };
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.beastmode, true);
    assert.equal(result.claude, true);
    assert.deepEqual(result.failures, []);
  });

  it('reports beastmode failure', async () => {
    const result = await verifyInstall({
      execCommand: (cmd) => {
        if (cmd.includes('beastmode --version')) throw new Error('not found');
        if (cmd.includes('claude --version')) return { stdout: '1.0.0', exitCode: 0 };
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.beastmode, false);
    assert.equal(result.claude, true);
    assert.ok(result.failures.length > 0);
    assert.ok(result.failures[0].includes('beastmode'));
  });

  it('reports claude failure', async () => {
    const result = await verifyInstall({
      execCommand: (cmd) => {
        if (cmd.includes('beastmode --version')) return { stdout: '0.99.0', exitCode: 0 };
        if (cmd.includes('claude --version')) throw new Error('not found');
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.beastmode, true);
    assert.equal(result.claude, false);
    assert.ok(result.failures.some(f => f.includes('claude')));
  });

  it('reports both failures', async () => {
    const result = await verifyInstall({
      execCommand: () => { throw new Error('not found'); },
    });

    assert.equal(result.beastmode, false);
    assert.equal(result.claude, false);
    assert.equal(result.failures.length, 2);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --test src/npx-cli/__tests__/verify.test.mjs`
Expected: FAIL — `verify.mjs` does not exist

- [x] **Step 3: Write the implementation**

```javascript
// src/npx-cli/verify.mjs

/**
 * Verify the installation by checking that key commands work.
 * Returns { beastmode: boolean, claude: boolean, failures: string[] }
 *
 * @param {object} opts
 * @param {function} opts.execCommand - shell command executor
 */
export async function verifyInstall({ execCommand }) {
  const failures = [];
  let beastmodeOk = false;
  let claudeOk = false;

  try {
    execCommand('beastmode --version');
    beastmodeOk = true;
  } catch {
    failures.push(
      'beastmode command is not working. ' +
      'Try running: bun link (in the CLI directory)'
    );
  }

  try {
    execCommand('claude --version');
    claudeOk = true;
  } catch {
    failures.push(
      'claude command is not working. ' +
      'Reinstall Claude Code from https://claude.ai/download'
    );
  }

  return { beastmode: beastmodeOk, claude: claudeOk, failures };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --test src/npx-cli/__tests__/verify.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/npx-cli/verify.mjs src/npx-cli/__tests__/verify.test.mjs
git commit -m "feat(install-command): add verification module"
```

---

### Task 8: Install Orchestrator

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7

**Files:**
- Create: `src/npx-cli/install.mjs`

Wires all modules together into the `install()` function that the integration test calls.

- [x] **Step 1: Write the implementation**

```javascript
// src/npx-cli/install.mjs
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { checkPrereqs } from './prereqs.mjs';
import { ensureBun } from './bun-installer.mjs';
import { copyPlugin } from './plugin-copier.mjs';
import { mergeConfigs } from './config-merger.mjs';
import { linkCli } from './cli-linker.mjs';
import { verifyInstall } from './verify.mjs';
import { getVersion } from './version.mjs';

/**
 * Run the full beastmode install flow.
 *
 * @param {object} opts
 * @param {string} opts.homeDir - user home directory (default: os.homedir())
 * @param {boolean} opts.skipPrereqs - skip prerequisite checks
 * @param {function} opts.execCommand - shell executor (default: execSync wrapper)
 * @param {string} opts.packageDir - root of the npm package
 * @param {string} [opts.platform] - override platform (default: process.platform)
 */
export async function install(opts) {
  const {
    homeDir,
    skipPrereqs = false,
    execCommand = defaultExec,
    packageDir,
    platform = process.platform,
  } = opts;

  // Step 1: Prerequisites
  if (!skipPrereqs) {
    const prereqs = await checkPrereqs({ platform, execCommand });
    if (!prereqs.ok) {
      return {
        success: false,
        error: prereqs.errors.join('\n'),
        step: 'prerequisites',
      };
    }
  }

  // Read version
  let version;
  try {
    const pluginJsonPath = join(packageDir, '.claude-plugin', 'plugin.json');
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(pluginJsonPath, 'utf8');
    version = JSON.parse(content).version;
  } catch (err) {
    return {
      success: false,
      error: `Could not read plugin version: ${err.message}`,
      step: 'version',
    };
  }

  console.log(`Installing beastmode v${version}...`);

  // Step 2: Ensure bun
  try {
    await ensureBun({ execCommand });
  } catch (err) {
    return {
      success: false,
      error: err.message,
      step: 'bun-install',
    };
  }

  // Step 3: Copy plugin files
  try {
    await copyPlugin({ homeDir, packageDir, version });
  } catch (err) {
    return {
      success: false,
      error: `Failed to copy plugin files: ${err.message}`,
      step: 'plugin-copy',
    };
  }

  // Step 4: Merge JSON configs
  try {
    await mergeConfigs({ homeDir, version });
  } catch (err) {
    return {
      success: false,
      error: `Failed to update Claude Code configuration: ${err.message}`,
      step: 'config-merge',
    };
  }

  // Step 5: Link CLI
  const cliDir = join(homeDir, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode', version, 'cli');
  try {
    await linkCli({ cliDir, execCommand });
  } catch (err) {
    return {
      success: false,
      error: err.message,
      step: 'cli-link',
    };
  }

  // Step 6: Verify
  const verification = await verifyInstall({ execCommand });

  // Step 7: Summary
  const pluginDir = join(homeDir, '.claude', 'plugins', 'cache', 'bugroger', 'beastmode', version);

  if (verification.failures.length === 0) {
    console.log('');
    console.log(`beastmode v${version} installed successfully.`);
    console.log('');
    console.log(`  Plugin: ${pluginDir}`);
    console.log(`  CLI:    ${cliDir}`);
    console.log('');
    console.log('Next: Run /beastmode init in your project to get started.');
  } else {
    console.log('');
    console.log(`beastmode v${version} installed with warnings:`);
    for (const f of verification.failures) {
      console.log(`  - ${f}`);
    }
  }

  return {
    success: true,
    version,
    verification: {
      beastmode: verification.beastmode,
      claude: verification.claude,
    },
    paths: {
      plugin: pluginDir,
      cli: cliDir,
    },
  };
}

function defaultExec(cmd) {
  const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  return { stdout: result, stderr: '', exitCode: 0 };
}
```

- [x] **Step 2: Run integration tests**

Run: `node --test src/npx-cli/__tests__/install-command.integration.test.mjs`
Expected: Tests should now pass (most of them) — the `install` function exists and modules are wired

- [x] **Step 3: Commit**

```bash
git add src/npx-cli/install.mjs
git commit -m "feat(install-command): add install orchestrator"
```

---

### Task 9: CLI Entry Point

**Wave:** 3
**Depends on:** Task 8

**Files:**
- Create: `src/npx-cli/index.mjs`

The `#!/usr/bin/env node` entry point that routes commands.

- [x] **Step 1: Write the entry point**

```javascript
#!/usr/bin/env node
// src/npx-cli/index.mjs

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const command = process.argv[2];

switch (command) {
  case 'install': {
    const { install } = await import('./install.mjs');
    const packageDir = join(__dirname, '..', '..');
    const result = await install({
      homeDir: homedir(),
      packageDir,
    });
    process.exit(result.success ? 0 : 1);
    break;
  }

  case '--version':
  case '-v': {
    const pluginJson = JSON.parse(
      await readFile(join(__dirname, '..', '..', '.claude-plugin', 'plugin.json'), 'utf8')
    );
    console.log(pluginJson.version);
    break;
  }

  case '--help':
  case '-h':
  case undefined: {
    console.log('Usage: beastmode <command>');
    console.log('');
    console.log('Commands:');
    console.log('  install     Install beastmode (plugin + CLI)');
    console.log('  --version   Show version');
    console.log('  --help      Show this help');
    break;
  }

  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run "beastmode --help" for usage.');
    process.exit(1);
}
```

- [x] **Step 2: Make it executable**

```bash
chmod +x src/npx-cli/index.mjs
```

- [x] **Step 3: Commit**

```bash
git add src/npx-cli/index.mjs
git commit -m "feat(install-command): add CLI entry point"
```
