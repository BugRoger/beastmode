import { describe, test, expect } from "vitest";
import { parseArgs } from "../args";
import { cancelEpic } from "../commands/cancel-logic";
import type { CancelConfig } from "../commands/cancel-logic";
import type { Logger } from "../logger";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import os from "os";

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

  const epic = opts?.epic ?? slug;
  const phase = opts?.phase ?? "implement";
  const date = new Date().toISOString().slice(0, 10);
  const manifestPath = resolve(stateDir, `${date}-${slug}.manifest.json`);
  const manifest = {
    slug,
    epic,
    phase,
    features: [],
    artifacts: {},
    blocked: null,
    lastUpdated: new Date().toISOString(),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest));

  if (opts?.withArtifacts) {
    for (const p of ["design", "plan", "implement"]) {
      const dir = resolve(tmpDir, ".beastmode", "artifacts", p);
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, `${date}-${epic}.md`), `# ${p} artifact`);
      writeFileSync(resolve(dir, `${date}-${epic}.output.json`), "{}");
    }
  }

  return { tmpDir, manifestPath };
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
  test("deletes manifest on cancel", async () => {
    const { tmpDir, manifestPath } = setupTempProject("test-slug");

    await cancelEpic(makeConfig(tmpDir, "test-slug"));

    expect(existsSync(manifestPath)).toBe(false);
  });

  test("deletes artifacts matching epic name", async () => {
    const { tmpDir } = setupTempProject("abc123", { epic: "my-feature", withArtifacts: true });

    await cancelEpic(makeConfig(tmpDir, "abc123"));

    // All artifact dirs should be empty
    for (const phase of ["design", "plan", "implement"]) {
      const dir = resolve(tmpDir, ".beastmode", "artifacts", phase);
      if (existsSync(dir)) {
        expect(readdirSync(dir)).toEqual([]);
      }
    }
  });

  test("idempotent — second cancel succeeds with no manifest", async () => {
    const { tmpDir } = setupTempProject("idem-test");

    const first = await cancelEpic(makeConfig(tmpDir, "idem-test"));
    expect(first.cleaned).toContain("manifest");

    // Second run — manifest already gone
    const second = await cancelEpic(makeConfig(tmpDir, "idem-test"));
    // Should not throw, just succeed
    expect(second.warned.length + second.cleaned.length).toBeGreaterThan(0);
  });

  test("returns cleaned and warned arrays", async () => {
    const { tmpDir } = setupTempProject("result-test");

    const result = await cancelEpic(makeConfig(tmpDir, "result-test"));

    expect(Array.isArray(result.cleaned)).toBe(true);
    expect(Array.isArray(result.warned)).toBe(true);
    expect(result.cleaned).toContain("manifest");
    expect(result.cleaned).toContain("artifacts");
  });

  test("manifest-not-found gracefully handled", async () => {
    const tmpDir = mkdtempSync(resolve(os.tmpdir(), "bm-cancel-"));
    mkdirSync(resolve(tmpDir, ".beastmode", "state"), { recursive: true });

    // No manifest exists — should not throw
    const result = await cancelEpic(makeConfig(tmpDir, "ghost-slug"));
    expect(result).toBeDefined();
  });

  test("warns on missing artifact dirs", async () => {
    const { tmpDir } = setupTempProject("no-artifacts");
    // No artifact dirs created — should not throw

    const result = await cancelEpic(makeConfig(tmpDir, "no-artifacts"));
    expect(result.cleaned).toContain("artifacts");
  });
});
