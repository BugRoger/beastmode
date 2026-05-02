import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Resolve the current beastmode version from plugin/plugin.json.
 *
 * When called without arguments, discovers the project root relative to
 * this module's own location (2 levels up from cli/src/ to project root).
 * Returns "v{semver}" on success, "unknown" on any failure.
 */
export function resolveVersion(projectRoot?: string): string {
  try {
    const root = projectRoot ?? resolve(import.meta.dirname, "..", "..");
    // Source tree: plugin/plugin.json — cache install: plugin.json at root
    const candidates = [resolve(root, "plugin", "plugin.json"), resolve(root, "plugin.json")];
    const pluginJsonPath = candidates.find(p => { try { readFileSync(p); return true; } catch { return false; } })!;
    const content = JSON.parse(readFileSync(pluginJsonPath, "utf-8"));
    const version = content.version;
    if (typeof version !== "string" || !version) return "unknown";
    return `v${version}`;
  } catch {
    return "unknown";
  }
}
