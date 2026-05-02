// src/npx-cli/__tests__/bun-installer.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureBun } from '../bun-installer.mjs';

describe('ensureBun', () => {
  it('skips install when bun is already available (unix)', async () => {
    const commands = [];

    const result = await ensureBun({
      platform: 'linux',
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

  it('skips install when bun is already available (windows)', async () => {
    const commands = [];

    const result = await ensureBun({
      platform: 'win32',
      execCommand: (cmd) => {
        commands.push(cmd);
        if (cmd.includes('where bun')) {
          return { stdout: 'C:\\bun.exe', exitCode: 0 };
        }
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.installed, false);
    assert.equal(result.alreadyPresent, true);
    const installCmd = commands.find(c => c.includes('bun.sh/install'));
    assert.equal(installCmd, undefined);
  });

  it('installs bun when not found (unix)', async () => {
    const commands = [];
    let bunAvailable = false;

    const result = await ensureBun({
      platform: 'linux',
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

  it('installs bun when not found (windows)', async () => {
    const commands = [];
    let bunAvailable = false;

    const result = await ensureBun({
      platform: 'win32',
      execCommand: (cmd) => {
        commands.push(cmd);
        if (cmd.includes('where bun')) {
          if (!bunAvailable) throw new Error('not found');
          return { stdout: 'C:\\bun.exe', exitCode: 0 };
        }
        if (cmd.includes('bun.sh/install.ps1')) {
          bunAvailable = true;
          return { stdout: 'Bun installed', exitCode: 0 };
        }
        return { stdout: '', exitCode: 0 };
      },
    });

    assert.equal(result.installed, true);
    assert.equal(result.alreadyPresent, false);
    const installCmd = commands.find(c => c.includes('bun.sh/install.ps1'));
    assert.ok(installCmd, 'Should have run bun install PowerShell script');
  });

  it('throws when bun install fails (unix)', async () => {
    await assert.rejects(
      () => ensureBun({
        platform: 'linux',
        execCommand: (cmd) => {
          if (cmd.includes('command -v bun')) throw new Error('not found');
          if (cmd.includes('bun.sh/install')) throw new Error('curl failed');
          return { stdout: '', exitCode: 0 };
        },
      }),
      /Failed to install bun/
    );
  });

  it('throws when bun install fails (windows)', async () => {
    await assert.rejects(
      () => ensureBun({
        platform: 'win32',
        execCommand: (cmd) => {
          if (cmd.includes('where bun')) throw new Error('not found');
          if (cmd.includes('bun.sh/install.ps1')) throw new Error('powershell failed');
          return { stdout: '', exitCode: 0 };
        },
      }),
      /Failed to install bun/
    );
  });
});
