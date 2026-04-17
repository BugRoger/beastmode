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
    if (!result.success) {
      console.error(`Install failed at step "${result.step}": ${result.error}`);
    }
    process.exit(result.success ? 0 : 1);
    break;
  }

  case 'uninstall': {
    const { uninstall } = await import('./uninstall.mjs');
    const result = await uninstall({
      homeDir: homedir(),
    });
    process.exit(result.success ? 0 : 1);
    break;
  }

  case '--version':
  case '-v': {
    const pluginJson = JSON.parse(
      await readFile(join(__dirname, '..', '..', 'plugin', 'plugin.json'), 'utf8')
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
    console.log('  uninstall   Remove beastmode (preserves project data)');
    console.log('  --version   Show version');
    console.log('  --help      Show this help');
    break;
  }

  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run "beastmode --help" for usage.');
    process.exit(1);
}
