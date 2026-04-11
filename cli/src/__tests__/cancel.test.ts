import { describe, test, expect } from "vitest";
import { parseArgs } from "../args";
import { cancelEpic } from "../commands/cancel-logic";
import type { CancelConfig } from "../commands/cancel-logic";
import type { Logger } from "../logger";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import os from "os";
import { JsonFileStore } from "../store/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = () => {};
const noopLogger: Logger = {
  info: noop,
  debug: noop,
  warn: noop,
  error: noop,
  child: () => noopLogger,
};

function setupTempProject(slug: string, opts?: { epic?: string; phase?: string; withArtifacts?: boolean }) {
  const tmpDir = mkdtempSync(resolve(os.tmpdir(), "bm-cancel-"));
  const stateDir = resolve(tmpDir, ".beastmode", "state");
  mkdirSync(stateDir, { recursive: true });

  const epicName = opts?.epic ?? slug;

  // Create store entity instead of manifest file
  const storePath = resolve(stateDir, "store.json");
  const store = new JsonFileStore(storePath);
  store.load();
  const epic = store.addEpic({ name: epicName });
  store.save();

  if (opts?.withArtifacts) {
    const date = new Date().toISOString().slice(0, 10);
    for (const p of ["design", "plan", "implement"]) {
      const dir = resolve(tmpDir, ".beastmode", "artifacts", p);
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, `${date}-${epicName}.md`), `# ${p} artifact`);
      writeFileSync(resolve(dir, `${date}-${epicName}.output.json`), "{}");
    }
  }

  return { tmpDir, storePath, epicSlug: epic.slug, epicId: epic.id };
}

function makeConfig(tmpDir: string, identifier: string, overrides?: Partial<CancelConfig>): CancelConfig {
  return {
    identifier,
    projectRoot: tmpDir,
    githubEnabled: false,
    force: true,
    logger: noopLogger,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Arg parsing (existing)
// ---------------------------------------------------------------------------

describe("cancel command parsing", () => {
  test("parses cancel command with slug", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "my-epic"]);
    expect(result.command).toBe("cancel");
    expect(result.args).toEqual(["my-epic"]);
  });

  test("parses cancel command without slug", () => {
    const result = parseArgs(["bun", "index.ts", "cancel"]);
    expect(result.command).toBe("cancel");
    expect(result.args).toEqual([]);
  });

  test("parses cancel command with --force flag", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "my-epic", "--force"]);
    expect(result.command).toBe("cancel");
    expect(result.force).toBe(true);
    expect(result.args).toEqual(["my-epic"]);
  });

  test("parses cancel command without --force defaults to false", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "my-epic"]);
    expect(result.command).toBe("cancel");
    expect(result.force).toBe(false);
    expect(result.args).toEqual(["my-epic"]);
  });

  test("--force is stripped from cancel args", () => {
    const result = parseArgs(["bun", "index.ts", "cancel", "--force", "my-epic"]);
    expect(result.command).toBe("cancel");
    expect(result.force).toBe(true);
    expect(result.args).toEqual(["my-epic"]);
  });
});

// ---------------------------------------------------------------------------
// Shared cancel-logic module
// ---------------------------------------------------------------------------

describe("cancelEpic shared module", () => {
  test("deletes store entity on cancel", async () => {
    const { tmpDir, storePath, epicSlug } = setupTempProject("test-slug");

    await cancelEpic(makeConfig(tmpDir, epicSlug));

    // Verify store entity is gone
    const store = new JsonFileStore(storePath);
    store.load();
    const entities = store.listEpics().filter((e) => e.slug === epicSlug);
    expect(entities).toHaveLength(0);
  });

  test("deletes artifacts matching epic name", async () => {
    const { tmpDir, epicSlug } = setupTempProject("abc123", { epic: "my-feature", withArtifacts: true });

    await cancelEpic(makeConfig(tmpDir, epicSlug));

    // All artifact dirs should be empty
    for (const phase of ["design", "plan", "implement"]) {
      const dir = resolve(tmpDir, ".beastmode", "artifacts", phase);
      if (existsSync(dir)) {
        expect(readdirSync(dir)).toEqual([]);
      }
    }
  });

  test("idempotent — second cancel succeeds with no store entity", async () => {
    const { tmpDir, epicSlug } = setupTempProject("idem-test");

    const first = await cancelEpic(makeConfig(tmpDir, epicSlug));
    expect(first.cleaned).toContain("store-entity");

    // Second run — entity already gone
    const second = await cancelEpic(makeConfig(tmpDir, epicSlug));
    // Should not throw, just succeed
    expect(second.warned.length + second.cleaned.length).toBeGreaterThan(0);
  });

  test("returns cleaned and warned arrays", async () => {
    const { tmpDir, epicSlug } = setupTempProject("result-test");

    const result = await cancelEpic(makeConfig(tmpDir, epicSlug));

    expect(Array.isArray(result.cleaned)).toBe(true);
    expect(Array.isArray(result.warned)).toBe(true);
    expect(result.cleaned).toContain("store-entity");
    expect(result.cleaned).toContain("artifacts");
  });

  test("entity-not-found gracefully handled", async () => {
    const tmpDir = mkdtempSync(resolve(os.tmpdir(), "bm-cancel-"));
    mkdirSync(resolve(tmpDir, ".beastmode", "state"), { recursive: true });

    // No entity exists — should not throw
    const result = await cancelEpic(makeConfig(tmpDir, "ghost-slug"));
    expect(result).toBeDefined();
  });

  test("warns on missing artifact dirs", async () => {
    const { tmpDir, epicSlug } = setupTempProject("no-artifacts");
    // No artifact dirs created — should not throw

    const result = await cancelEpic(makeConfig(tmpDir, epicSlug));
    expect(result.cleaned).toContain("artifacts");
  });
});
