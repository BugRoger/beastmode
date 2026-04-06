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
