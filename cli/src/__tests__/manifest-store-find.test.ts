import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { find } from "../manifest/store";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-manifest-find");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
}

function pipeDir(): string {
  return resolve(TEST_ROOT, ".beastmode", "state");
}

function writeManifest(slug: string, extra?: Record<string, unknown>): void {
  const dir = pipeDir();
  mkdirSync(dir, { recursive: true });
  const manifest = {
    slug,
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: new Date().toISOString(),
    ...extra,
  };
  writeFileSync(
    resolve(dir, `2026-04-01-${slug}.manifest.json`),
    JSON.stringify(manifest, null, 2),
  );
}

describe("find", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("finds manifest by hex slug", () => {
    writeManifest("abc123");
    const result = find(TEST_ROOT, "abc123");
    expect(result).toBeDefined();
    expect(result!.slug).toBe("abc123");
  });

  test("finds manifest by epic name", () => {
    writeManifest("abc123", { epic: "my-feature" });
    const result = find(TEST_ROOT, "my-feature");
    expect(result).toBeDefined();
    expect(result!.slug).toBe("abc123");
  });

  test("returns undefined when no match", () => {
    writeManifest("abc123");
    const result = find(TEST_ROOT, "nonexistent");
    expect(result).toBeUndefined();
  });

  test("prefers slug match over epic match", () => {
    // Manifest where slug = "abc123", epic = "my-feature"
    writeManifest("abc123", { epic: "my-feature" });
    // Another manifest where slug = "my-feature" (not the epic)
    writeManifest("my-feature");

    const result = find(TEST_ROOT, "my-feature");
    expect(result).toBeDefined();
    // Slug match takes priority over epic match
    expect(result!.slug).toBe("my-feature");
  });

  test("returns undefined when state dir missing", () => {
    const result = find(TEST_ROOT, "anything");
    expect(result).toBeUndefined();
  });
});
