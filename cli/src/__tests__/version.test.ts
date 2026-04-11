import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

describe("resolveVersion", () => {
  const fixtureRoot = resolve(import.meta.dirname, "__fixtures__/version-test");
  const pluginDir = resolve(fixtureRoot, "plugin");
  const pluginJsonPath = resolve(pluginDir, "plugin.json");

  beforeEach(() => {
    mkdirSync(pluginDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  test("resolves version from plugin.json", async () => {
    writeFileSync(pluginJsonPath, JSON.stringify({ version: "1.2.3" }));
    const { resolveVersion } = await import("../version.js");
    const result = resolveVersion(fixtureRoot);
    expect(result).toBe("v1.2.3");
  });

  test("returns 'unknown' when plugin.json is missing", async () => {
    rmSync(pluginDir, { recursive: true, force: true });
    const { resolveVersion } = await import("../version.js");
    const result = resolveVersion(resolve(fixtureRoot, "nonexistent"));
    expect(result).toBe("unknown");
  });

  test("returns 'unknown' when plugin.json contains invalid JSON", async () => {
    writeFileSync(pluginJsonPath, "not valid json{{{");
    const { resolveVersion } = await import("../version.js");
    const result = resolveVersion(fixtureRoot);
    expect(result).toBe("unknown");
  });

  test("returns 'unknown' when plugin.json has no version field", async () => {
    writeFileSync(pluginJsonPath, JSON.stringify({ name: "test" }));
    const { resolveVersion } = await import("../version.js");
    const result = resolveVersion(fixtureRoot);
    expect(result).toBe("unknown");
  });

  test("resolveVersion with no argument uses import.meta.dirname", async () => {
    const { resolveVersion } = await import("../version.js");
    // When called without argument, it uses import.meta.dirname to find plugin.json
    // In test context this navigates from cli/src/ up 2 levels to project root
    const result = resolveVersion();
    expect(typeof result).toBe("string");
    // Should resolve to the actual plugin.json version or "unknown"
    expect(result).toMatch(/^v\d+\.\d+\.\d+$|^unknown$/);
  });
});
