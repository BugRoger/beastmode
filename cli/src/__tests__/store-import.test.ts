import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { JsonFileStore } from "../store/json-file-store.js";

function tmpdir(): string {
  const dir = join("/tmp", `store-import-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function stateDir(root: string): string {
  const dir = join(root, ".beastmode", "state");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeManifest(
  root: string,
  slug: string,
  manifest: Record<string, unknown>,
): string {
  const dir = stateDir(root);
  const path = join(dir, `2026-01-01-${slug}.manifest.json`);
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  return path;
}

function makeManifest(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    slug: "auth-system",
    epic: "Auth System",
    phase: "implement",
    features: [],
    artifacts: { design: ["artifacts/design/2026-01-01-auth-system.md"] },
    summary: { problem: "Need auth", solution: "Build auth" },
    worktree: { branch: "feature/auth-system", path: ".claude/worktrees/auth-system" },
    lastUpdated: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Feature slug field", () => {
  let storeDir: string;
  let storePath: string;
  let store: JsonFileStore;

  beforeEach(() => {
    storeDir = tmpdir();
    storePath = join(storeDir, "store.json");
    store = new JsonFileStore(storePath);
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
  });

  it("addFeature accepts and stores slug", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Test Epic" }));
    const feature = await store.transact(s =>
      s.addFeature({ parent: epic.id, name: "Login Flow" })
    );
    // Slug is auto-generated: {name}-{epicHex}.{ordinal}
    expect(feature.slug).toMatch(/^login-flow-[0-9a-f]{4}\.\d+$/);
  });

  it("addFeature auto-generates slug from name when not provided", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Test Epic" }));
    const feature = await store.transact(s =>
      s.addFeature({ parent: epic.id, name: "Token Cache" })
    );
    // Slug is derived: {name}-{epicHex}.{ordinal}
    expect(feature.slug).toMatch(/^token-cache-[0-9a-f]{4}\.\d+$/);
  });

  it("slug persists through save/load cycle", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Test Epic" }));
    const feature = await store.transact(s =>
      s.addFeature({ parent: epic.id, name: "Login Flow" })
    );
    const expectedSlug = feature.slug;

    // Load from disk in a new transaction
    const loaded = await store.transact(s => s.getFeature(feature.id));
    expect(loaded!.slug).toBe(expectedSlug);
  });

  it("slug is immutable via updateFeature", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Test Epic" }));
    const feature = await store.transact(s =>
      s.addFeature({ parent: epic.id, name: "Login Flow" })
    );
    const originalSlug = feature.slug;

    // FeaturePatch should not include slug since it's in the Omit list
    const updated = await store.transact(s =>
      s.updateFeature(feature.id, { name: "Updated Name" })
    );
    expect(updated.slug).toBe(originalSlug);
  });
});

describe("importTestable", () => {
  let projectRoot: string;
  let storePath: string;
  let store: JsonFileStore;

  beforeEach(() => {
    projectRoot = tmpdir();
    storePath = join(projectRoot, ".beastmode", "state", "store.json");
    store = new JsonFileStore(storePath);
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it("creates epic with correct field mapping", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest());

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.epics).toHaveLength(1);
    const epic = result.epics[0];
    expect(epic.name).toBe("Auth System");
    expect(epic.slug).toMatch(/^auth-system-[a-f0-9]{4}$/);
    expect(epic.status).toBe("implement");
    expect(epic.summary).toBe("Need auth");
    expect(epic.design).toBe("artifacts/design/2026-01-01-auth-system.md");
    expect(epic.worktree).toEqual({
      branch: "feature/auth-system",
      path: ".claude/worktrees/auth-system",
    });
  });

  it("creates feature entities with slug field", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      features: [
        { slug: "login-flow", plan: "plan/login.md", status: "pending", description: "Login" },
      ],
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.features).toHaveLength(1);
    // Feature slug is derived: {name}-{epicHex}.{ordinal}
    expect(result.features[0].slug).toMatch(/^login-flow-[0-9a-f]{4}\.\d+$/);
    expect(result.features[0].plan).toBe("plan/login.md");
    expect(result.features[0].status).toBe("pending");
  });

  it("converts wave ordering to depends_on", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      features: [
        { slug: "a", plan: "a.md", status: "pending", wave: 1 },
        { slug: "b", plan: "b.md", status: "pending", wave: 1 },
        { slug: "c", plan: "c.md", status: "pending", wave: 2 },
      ],
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    // Find features by name prefix (slugs now use {name}-{epicHex}.{ordinal})
    const featureA = result.features.find((f: any) => f.slug.startsWith("a-"));
    const featureB = result.features.find((f: any) => f.slug.startsWith("b-"));
    const featureC = result.features.find((f: any) => f.slug.startsWith("c-"));

    expect(featureC!.depends_on).toContain(featureA!.id);
    expect(featureC!.depends_on).toContain(featureB!.id);
    expect(featureA!.depends_on).toEqual([]);
    expect(featureB!.depends_on).toEqual([]);
  });

  it("extracts GitHub refs to sync file", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      github: { epic: 42, repo: "owner/repo", bodyHash: "abc" },
      features: [
        { slug: "login", plan: "p.md", status: "pending", github: { issue: 43, bodyHash: "def" } },
      ],
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    const syncPath = join(projectRoot, ".beastmode", "state", "github-sync.json");
    const syncData = JSON.parse(readFileSync(syncPath, "utf-8"));
    expect(syncData[result.epics[0].id]).toEqual({ issue: 42, bodyHash: "abc" });
    expect(syncData[result.features[0].id]).toEqual({ issue: 43, bodyHash: "def" });
  });

  it("is idempotent — skips existing epics by slug", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest());
    const { importTestable } = await import("../commands/store-import.js");
    await importTestable(store, projectRoot);

    // Re-write manifest and import again
    writeManifest(projectRoot, "auth-system", makeManifest());
    const result2 = await importTestable(store, projectRoot);

    expect(result2.skipped).toContain("auth-system");
    const epics = await store.transact(s => s.listEpics());
    expect(epics).toHaveLength(1);
  });

  it("deletes manifest files on success", async () => {
    const mPath = writeManifest(projectRoot, "auth-system", makeManifest());
    const { importTestable } = await import("../commands/store-import.js");
    await importTestable(store, projectRoot);
    expect(existsSync(mPath)).toBe(false);
  });

  it("handles manifest with no features", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({ features: [] }));
    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);
    expect(result.epics).toHaveLength(1);
    expect(result.features).toHaveLength(0);
  });

  it("derives epic name from slug when epic field missing", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      epic: undefined,
    }));
    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);
    expect(result.epics[0].name).toBe("auth-system");
  });

  it("maps artifact phases to epic fields", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      artifacts: {
        design: ["d1.md", "d2.md"],
        plan: ["p1.md"],
        implement: ["i1.md"],
        validate: ["v1.md"],
        release: ["r1.md"],
      },
    }));
    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);
    const epic = result.epics[0];
    expect(epic.design).toBe("d1.md");
    expect(epic.plan).toBe("p1.md");
    expect(epic.implement).toBe("i1.md");
    expect(epic.validate).toBe("v1.md");
    expect(epic.release).toBe("r1.md");
  });

  it("runs post-import validation — all features have valid parent", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      features: [
        { slug: "login", plan: "p.md", status: "pending" },
      ],
    }));
    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.orphanFeatures).toEqual([]);
  });
});

