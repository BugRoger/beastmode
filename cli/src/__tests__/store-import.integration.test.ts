import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { JsonFileStore } from "../store/json-file-store.js";

function tmpdir(): string {
  const dir = join("/tmp", `store-import-integration-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function stateDir(root: string): string {
  const dir = join(root, ".beastmode", "state");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeManifest(root: string, slug: string, manifest: Record<string, unknown>): string {
  const dir = stateDir(root);
  const path = join(dir, `2026-01-01-${slug}.manifest.json`);
  writeFileSync(path, JSON.stringify(manifest, null, 2));
  return path;
}

function makeManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

describe("@manifest-absorption: Store import migrates manifests into the store", () => {
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

  it("imports and creates epic entity from manifest", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest());

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.epics.length).toBe(1);
    expect(result.epics[0].name).toBe("Auth System");
    expect(result.epics[0].status).toBe("implement");
    expect(result.epics[0].id).toMatch(/^bm-[0-9a-f]{4}$/);
  });

  it("imports and creates feature entities from manifest features", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      features: [
        { slug: "login-flow", plan: "plan/login.md", status: "pending" },
        { slug: "token-cache", plan: "plan/token.md", status: "pending" },
      ],
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.features.length).toBe(2);
    const slugs = result.features.map((f: any) => f.slug);
    // Slugs are derived: {name}-{epicHex}.{ordinal}
    expect(slugs.some((s: string) => s.startsWith("login-flow-"))).toBe(true);
    expect(slugs.some((s: string) => s.startsWith("token-cache-"))).toBe(true);
  });

  it("converts wave ordering to dependency relationships", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      features: [
        { slug: "auth-provider", plan: "plan/auth.md", status: "pending", wave: 1 },
        { slug: "token-cache", plan: "plan/token.md", status: "pending", wave: 2 },
      ],
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    // Find features by matching slug prefix (slugs use {name}-{epicHex}.{ordinal})
    const tokenCache = result.features.find((f: any) => f.slug.startsWith("token-cache-"))!;
    const authProvider = result.features.find((f: any) => f.slug.startsWith("auth-provider-"))!;
    expect(tokenCache.depends_on).toContain(authProvider.id);
  });

  it("extracts GitHub refs into the sync file", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      github: { epic: 42, repo: "owner/repo", bodyHash: "abc123" },
      features: [
        { slug: "login-flow", plan: "plan/login.md", status: "pending", github: { issue: 43, bodyHash: "def456" } },
      ],
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    const syncPath = join(projectRoot, ".beastmode", "state", "github-sync.json");
    expect(existsSync(syncPath)).toBe(true);
    const syncData = JSON.parse(readFileSync(syncPath, "utf-8"));

    const epicEntry = syncData[result.epics[0].id];
    expect(epicEntry.issue).toBe(42);

    const featureEntry = syncData[result.features[0].id];
    expect(featureEntry.issue).toBe(43);

    const epicInStore = await store.transact(s => s.getEpic(result.epics[0].id));
    expect((epicInStore as any).github).toBeUndefined();
  });

  it("preserves artifact references", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      artifacts: {
        design: ["artifacts/design/2026-01-01-auth-system.md"],
        plan: ["artifacts/plan/2026-01-01-auth-system-login.md"],
      },
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.epics[0].design).toBe("artifacts/design/2026-01-01-auth-system.md");
    expect(result.epics[0].plan).toBe("artifacts/plan/2026-01-01-auth-system-login.md");
  });

  it("deletes manifest files on success", async () => {
    const manifestPath = writeManifest(projectRoot, "auth-system", makeManifest());

    const { importTestable } = await import("../commands/store-import.js");
    await importTestable(store, projectRoot);

    expect(existsSync(manifestPath)).toBe(false);
  });

  it("is idempotent — no duplicates on re-run", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest());

    const { importTestable } = await import("../commands/store-import.js");
    await importTestable(store, projectRoot);

    // Write manifest again (simulating it wasn't deleted)
    writeManifest(projectRoot, "auth-system", makeManifest());
    const result2 = await importTestable(store, projectRoot);

    // The skipped list contains the manifest slug (from source), not the derived entity slug
    expect(result2.skipped).toContain("auth-system");
    const allEpics = await store.transact(s => s.listEpics());
    expect(allEpics.length).toBe(1);
  });

  it("handles multiple manifests", async () => {
    const path1 = writeManifest(projectRoot, "auth-system", makeManifest());
    const path2 = writeManifest(projectRoot, "data-pipeline", makeManifest({
      slug: "data-pipeline",
      epic: "Data Pipeline",
      phase: "design",
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.epics.length).toBe(2);
    const names = result.epics.map((e: any) => e.name);
    expect(names).toContain("Auth System");
    expect(names).toContain("Data Pipeline");
    expect(existsSync(path1)).toBe(false);
    expect(existsSync(path2)).toBe(false);
  });

  it("grandfathers active epic git artifacts", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      worktree: { branch: "feature/auth-system", path: ".claude/worktrees/auth-system" },
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.epics[0].worktree!.branch).toBe("feature/auth-system");
    expect(result.epics[0].worktree!.path).toBe(".claude/worktrees/auth-system");
    // Verify NOT renamed to ID-based naming
    expect(result.epics[0].worktree!.branch).not.toMatch(/^feature\/bm-/);
    expect(result.epics[0].worktree!.path).not.toMatch(/bm-[0-9a-f]{4}/);
  });
});
