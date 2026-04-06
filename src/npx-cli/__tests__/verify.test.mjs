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
