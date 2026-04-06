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
