// src/npx-cli/__tests__/cli-linker.test.mjs
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { linkCli } from '../cli-linker.mjs';

describe('linkCli', () => {
  describe('unix', () => {
    it('runs bun install and bun link in the cli directory', async () => {
      const commands = [];

      await linkCli({
        platform: 'linux',
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
          platform: 'linux',
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
          platform: 'linux',
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

  describe('win32', () => {
    const fakeBunCmd = join(tmpdir(), 'fake-bun.cmd');
    const expectedWrapper = join(tmpdir(), 'beastmode.cmd');

    afterEach(async () => {
      await rm(expectedWrapper, { force: true });
    });

    it('runs bun install and creates beastmode.cmd via where bun', async () => {
      const commands = [];

      await linkCli({
        platform: 'win32',
        cliDir: 'C:\\fake\\cli',
        execCommand: (cmd) => {
          commands.push(cmd);
          if (cmd === 'where bun') return { stdout: fakeBunCmd + '\n', exitCode: 0 };
          return { stdout: '', exitCode: 0 };
        },
      });

      assert.ok(
        commands.some(c => c.includes('bun install') && c.includes('--production')),
        'Should run bun install --production'
      );
      assert.ok(
        commands.some(c => c === 'where bun'),
        'Should call where bun to locate bun directory'
      );
      // beastmode.cmd should have been written next to fake bun
      await assert.doesNotReject(access(expectedWrapper));
    });

    it('throws on bun install failure', async () => {
      await assert.rejects(
        () => linkCli({
          platform: 'win32',
          cliDir: 'C:\\fake\\cli',
          execCommand: (cmd) => {
            if (cmd.includes('bun install')) throw new Error('install failed');
            return { stdout: '', exitCode: 0 };
          },
        }),
        /Failed to install CLI dependencies/
      );
    });
  });
});
