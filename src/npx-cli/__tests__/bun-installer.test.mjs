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
