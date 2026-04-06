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
