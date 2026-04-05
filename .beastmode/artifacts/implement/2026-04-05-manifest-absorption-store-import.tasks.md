# Store Import — Implementation Tasks

## Goal

Create a self-contained `beastmode store import` command that migrates all existing `.manifest.json` files into the structured task store. The command inlines all manifest-reading code (no imports from `manifest/`), creates epic and feature entities, converts wave ordering to `depends_on` relationships, extracts GitHub refs to a separate sync file, is idempotent, and deletes manifests on success.

## Architecture

- **Store module**: `cli/src/store/` — `types.ts`, `in-memory.ts`, `json-file-store.ts`
- **Command router**: `cli/src/commands/store.ts` — switch-based subcommand dispatch
- **Store path**: `.beastmode/state/store.json`
- **Manifest path**: `.beastmode/state/YYYY-MM-DD-<slug>.manifest.json`
- **GitHub sync file**: `.beastmode/state/github-sync.json`
- **Test runner**: `bun --bun vitest run`
- **Test location**: `cli/src/__tests__/`

## Key Design Decisions (from PRD)

- Feature type gains a `slug` field (required string)
- Import inlines all manifest parsing — no imports from `manifest/` module
- Epic entity: `slug` from `manifest.epic` (slugified) or `manifest.slug`; `name` from `manifest.epic` or derived
- Feature entity: slug from `ManifestFeature.slug`, status preserved
- Wave-to-dep: features in wave N+1 depend on all features in wave N (conservative)
- GitHub refs extracted to `github-sync.json` (`Record<entityId, { issue: number; bodyHash?: string }>`)
- Grandfathering: existing branches/worktrees keep slug-based names
- Idempotency: match by slug, skip existing
- Cleanup: delete `.manifest.json` files on success
- Validation: all entities resolve, no orphan features

## Tech Stack

- TypeScript (strict)
- Bun runtime
- Vitest test runner (via `bun --bun vitest run`)
- Node.js fs/path APIs

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `cli/src/store/types.ts` | Add `slug` field to Feature type |
| Create | `cli/src/commands/store-import.ts` | Self-contained import command |
| Modify | `cli/src/commands/store.ts` | Register `import` subcommand |
| Create | `cli/src/__tests__/store-import.test.ts` | Unit tests for import |
| Create | `cli/src/__tests__/store-import.integration.test.ts` | Integration tests (BDD) |

---

## Task 0: Integration Test (BDD — RED State)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/store-import.integration.test.ts`

- [ ] **Step 1: Write the integration test from Gherkin scenarios**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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

    // importTestable is not yet implemented — will fail
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
    expect(slugs).toContain("login-flow");
    expect(slugs).toContain("token-cache");
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

    const tokenCache = result.features.find((f: any) => f.slug === "token-cache");
    const authProvider = result.features.find((f: any) => f.slug === "auth-provider");
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

    // Epic entry
    const epicEntry = syncData[result.epics[0].id];
    expect(epicEntry.issue).toBe(42);

    // Feature entry
    const featureEntry = syncData[result.features[0].id];
    expect(featureEntry.issue).toBe(43);

    // Store entities should NOT have github fields
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
    const result1 = await importTestable(store, projectRoot);

    // Write manifest again (simulating it wasn't deleted)
    writeManifest(projectRoot, "auth-system", makeManifest());
    const result2 = await importTestable(store, projectRoot);

    expect(result2.skipped).toContain("auth-system");
    const allEpics = await store.transact(s => s.listEpics());
    expect(allEpics.length).toBe(1);
  });

  it("handles multiple manifests", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest());
    writeManifest(projectRoot, "data-pipeline", makeManifest({
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
  });

  it("grandfathers active epic git artifacts", async () => {
    writeManifest(projectRoot, "auth-system", makeManifest({
      worktree: { branch: "feature/auth-system", path: ".claude/worktrees/auth-system" },
    }));

    const { importTestable } = await import("../commands/store-import.js");
    const result = await importTestable(store, projectRoot);

    expect(result.epics[0].worktree.branch).toBe("feature/auth-system");
    expect(result.epics[0].worktree.path).toBe(".claude/worktrees/auth-system");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED state)**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run cli/src/__tests__/store-import.integration.test.ts`
Expected: FAIL — `store-import.js` module does not exist yet

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/store-import.integration.test.ts
git commit -m "test(store-import): add integration tests — RED state"
```

---

## Task 1: Add slug Field to Feature Type

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/store/types.ts`
- Modify: `cli/src/store/in-memory.ts`

- [ ] **Step 1: Write the failing test**

Add to existing `cli/src/__tests__/store-import.test.ts` (new file):

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { JsonFileStore } from "../store/json-file-store.js";

function tmpdir(): string {
  const dir = join("/tmp", `store-import-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
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
      s.addFeature({ parent: epic.id, name: "Login Flow", slug: "login-flow" })
    );
    expect(feature.slug).toBe("login-flow");
  });

  it("addFeature auto-generates slug from name when not provided", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Test Epic" }));
    const feature = await store.transact(s =>
      s.addFeature({ parent: epic.id, name: "Token Cache" })
    );
    expect(feature.slug).toBe("token-cache");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run cli/src/__tests__/store-import.test.ts`
Expected: FAIL — Feature type does not have `slug` field, addFeature does not accept `slug`

- [ ] **Step 3: Add slug field to Feature type**

In `cli/src/store/types.ts`, add `slug: string` to the `Feature` interface after `name`:

```typescript
export interface Feature {
  id: string;
  type: "feature";
  parent: string;
  name: string;
  slug: string;
  description?: string;
  status: FeatureStatus;
  plan?: string;
  implement?: string;
  depends_on: string[];
  created_at: string;
  updated_at: string;
}
```

Update `addFeature` opts in `TaskStore` interface:

```typescript
addFeature(opts: { parent: string; name: string; slug?: string; description?: string }): Feature;
```

Update `FeaturePatch` to keep `slug` immutable:

```typescript
export type FeaturePatch = Partial<Omit<Feature, "id" | "type" | "parent" | "slug" | "created_at">>;
```

- [ ] **Step 4: Update InMemoryTaskStore.addFeature**

In `cli/src/store/in-memory.ts`, update `addFeature`:

```typescript
addFeature(opts: { parent: string; name: string; slug?: string; description?: string }): Feature {
  const parentEpic = this.getEpic(opts.parent);
  if (!parentEpic) throw new Error(`Parent epic not found: ${opts.parent}`);

  const id = this.generateFeatureId(opts.parent);
  const feature: Feature = {
    id,
    type: "feature",
    parent: opts.parent,
    name: opts.name,
    slug: opts.slug || opts.name.toLowerCase().replace(/\s+/g, "-"),
    description: opts.description,
    status: "pending",
    depends_on: [],
    created_at: this.now(),
    updated_at: this.now(),
  };
  this.entities.set(id, feature);
  return feature;
}
```

Also update `JsonFileStore.addFeature` signature in `cli/src/store/json-file-store.ts`:

```typescript
addFeature(opts: { parent: string; name: string; slug?: string; description?: string }): Feature {
  return this.inner.addFeature(opts);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run cli/src/__tests__/store-import.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite to verify no regressions**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run`
Expected: PASS (existing tests may need slug field added to assertions or fixture data)

- [ ] **Step 7: Commit**

```bash
git add cli/src/store/types.ts cli/src/store/in-memory.ts cli/src/store/json-file-store.ts cli/src/__tests__/store-import.test.ts
git commit -m "feat(store): add slug field to Feature type"
```

---

## Task 2: Create Store Import Command

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `cli/src/commands/store-import.ts`
- Modify: `cli/src/commands/store.ts`
- Modify: `cli/src/__tests__/store-import.test.ts`

- [ ] **Step 1: Write tests for import command**

Append to `cli/src/__tests__/store-import.test.ts`:

```typescript
import {
  writeFileSync,
  readFileSync,
  existsSync,
} from "fs";

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
    expect(epic.slug).toBe("auth-system");
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
    expect(result.features[0].slug).toBe("login-flow");
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

    const featureC = result.features.find((f: any) => f.slug === "c");
    const featureA = result.features.find((f: any) => f.slug === "a");
    const featureB = result.features.find((f: any) => f.slug === "b");
    expect(featureC.depends_on).toContain(featureA.id);
    expect(featureC.depends_on).toContain(featureB.id);
    expect(featureA.depends_on).toEqual([]);
    expect(featureB.depends_on).toEqual([]);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run cli/src/__tests__/store-import.test.ts`
Expected: FAIL — `store-import.js` module does not exist

- [ ] **Step 3: Implement store-import.ts**

Create `cli/src/commands/store-import.ts`:

```typescript
/**
 * Store Import — migrates .manifest.json files into the structured task store.
 *
 * Self-contained: inlines all manifest-reading code, no imports from manifest/ module.
 * Idempotent: existing entities matched by slug are skipped.
 * Cleanup: deletes .manifest.json files on success.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { resolve, join, dirname } from "path";
import type { JsonFileStore } from "../store/json-file-store.js";
import type { Epic, Feature, EpicStatus, FeatureStatus } from "../store/types.js";

// --- Inlined manifest types (no imports from manifest/) ---

interface ManifestFeature {
  slug: string;
  plan: string;
  description?: string;
  wave?: number;
  status: "pending" | "in-progress" | "completed" | "blocked";
  reDispatchCount?: number;
  github?: { issue: number; bodyHash?: string };
}

interface ManifestGitHub {
  epic: number;
  repo: string;
  bodyHash?: string;
}

interface PipelineManifest {
  slug: string;
  epic?: string;
  phase: string;
  features: ManifestFeature[];
  artifacts: Record<string, string[]>;
  summary?: { problem: string; solution: string };
  worktree?: { branch: string; path: string };
  github?: ManifestGitHub;
  blocked?: { gate: string; reason: string } | null;
  originId?: string;
  lastUpdated: string;
}

// --- GitHub sync file types ---

interface GitHubSyncEntry {
  issue: number;
  bodyHash?: string;
}

type GitHubSyncFile = Record<string, GitHubSyncEntry>;

// --- Inlined validation ---

const VALID_PHASES = new Set([
  "design", "plan", "implement", "validate", "release", "done", "cancelled",
]);

const VALID_FEATURE_STATUSES = new Set([
  "pending", "in-progress", "completed", "blocked",
]);

function isValidManifest(data: unknown): data is PipelineManifest {
  if (data === null || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.slug !== "string") return false;
  if (typeof obj.phase !== "string" || !VALID_PHASES.has(obj.phase)) return false;
  if (typeof obj.lastUpdated !== "string") return false;
  if (!Array.isArray(obj.features)) return false;

  for (const f of obj.features) {
    if (f === null || typeof f !== "object") return false;
    const feat = f as Record<string, unknown>;
    if (typeof feat.slug !== "string") return false;
    if (typeof feat.status !== "string") return false;
    if (!VALID_FEATURE_STATUSES.has(feat.status)) return false;
  }

  return true;
}

// --- Inlined manifest discovery ---

function discoverManifests(projectRoot: string): { path: string; manifest: PipelineManifest }[] {
  const dir = resolve(projectRoot, ".beastmode", "state");
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".manifest.json"))
    .sort();

  // Deduplicate by slug — keep latest (files sorted chronologically by date prefix)
  const bySlug = new Map<string, { path: string; manifest: PipelineManifest }>();

  for (const file of files) {
    try {
      const fullPath = resolve(dir, file);
      const raw = readFileSync(fullPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (isValidManifest(parsed)) {
        bySlug.set(parsed.slug, { path: fullPath, manifest: parsed });
      }
    } catch {
      // Skip invalid/corrupt
    }
  }

  return Array.from(bySlug.values());
}

// --- Import result types ---

interface ImportResult {
  epics: Epic[];
  features: Feature[];
  skipped: string[];
  deleted: string[];
  validation: {
    valid: boolean;
    orphanFeatures: string[];
    unresolvedDeps: string[];
  };
}

// --- GitHub sync persistence ---

function loadGitHubSync(projectRoot: string): GitHubSyncFile {
  const syncPath = resolve(projectRoot, ".beastmode", "state", "github-sync.json");
  if (!existsSync(syncPath)) return {};
  try {
    return JSON.parse(readFileSync(syncPath, "utf-8"));
  } catch {
    return {};
  }
}

function saveGitHubSync(projectRoot: string, sync: GitHubSyncFile): void {
  const syncPath = resolve(projectRoot, ".beastmode", "state", "github-sync.json");
  const dir = dirname(syncPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(syncPath, JSON.stringify(sync, null, 2) + "\n", "utf-8");
}

// --- Core import logic ---

export async function importTestable(
  store: JsonFileStore,
  projectRoot: string,
): Promise<ImportResult> {
  const discovered = discoverManifests(projectRoot);
  const result: ImportResult = {
    epics: [],
    features: [],
    skipped: [],
    deleted: [],
    validation: { valid: true, orphanFeatures: [], unresolvedDeps: [] },
  };

  const githubSync = loadGitHubSync(projectRoot);

  await store.transact((s) => {
    for (const { path, manifest } of discovered) {
      // Idempotency: skip if epic with this slug already exists
      const existing = s.find(manifest.slug);
      if (existing && existing.type === "epic") {
        result.skipped.push(manifest.slug);
        continue;
      }

      // --- Create Epic ---
      const epicName = manifest.epic || manifest.slug;
      const epic = s.addEpic({ name: epicName, slug: manifest.slug });

      // Update epic fields
      const epicPatch: Record<string, unknown> = {
        status: manifest.phase as EpicStatus,
      };

      if (manifest.summary) {
        epicPatch.summary = manifest.summary.problem;
      }

      if (manifest.worktree) {
        epicPatch.worktree = manifest.worktree;
      }

      // Map artifacts to typed phase fields (first entry per phase)
      if (manifest.artifacts) {
        for (const phase of ["design", "plan", "implement", "validate", "release"]) {
          const paths = manifest.artifacts[phase];
          if (paths && paths.length > 0) {
            epicPatch[phase] = paths[0];
          }
        }
      }

      s.updateEpic(epic.id, epicPatch as any);
      const updatedEpic = s.getEpic(epic.id)!;
      result.epics.push(updatedEpic);

      // --- Extract GitHub refs ---
      if (manifest.github) {
        githubSync[epic.id] = {
          issue: manifest.github.epic,
          ...(manifest.github.bodyHash ? { bodyHash: manifest.github.bodyHash } : {}),
        };
      }

      // --- Create Features ---
      const waveGroups = new Map<number, Feature[]>();
      const createdFeatures: Feature[] = [];

      for (const mf of manifest.features) {
        const feature = s.addFeature({
          parent: epic.id,
          name: mf.slug,
          slug: mf.slug,
          description: mf.description,
        });

        // Update feature fields
        const featurePatch: Record<string, unknown> = {
          status: mf.status as FeatureStatus,
        };
        if (mf.plan) {
          featurePatch.plan = mf.plan;
        }
        s.updateFeature(feature.id, featurePatch as any);

        const updatedFeature = s.getFeature(feature.id)!;
        createdFeatures.push(updatedFeature);

        // Track wave grouping
        const wave = mf.wave ?? 1;
        if (!waveGroups.has(wave)) waveGroups.set(wave, []);
        waveGroups.get(wave)!.push(updatedFeature);

        // Extract feature GitHub refs
        if (mf.github) {
          githubSync[feature.id] = {
            issue: mf.github.issue,
            ...(mf.github.bodyHash ? { bodyHash: mf.github.bodyHash } : {}),
          };
        }
      }

      // --- Wave-to-dependency conversion ---
      const waves = Array.from(waveGroups.keys()).sort((a, b) => a - b);
      for (let i = 1; i < waves.length; i++) {
        const prevWaveFeatures = waveGroups.get(waves[i - 1])!;
        const currWaveFeatures = waveGroups.get(waves[i])!;
        const prevIds = prevWaveFeatures.map((f) => f.id);

        for (const feature of currWaveFeatures) {
          s.updateFeature(feature.id, {
            depends_on: [...feature.depends_on, ...prevIds],
          });
        }
      }

      // Re-read features after dependency update
      for (const feature of createdFeatures) {
        const fresh = s.getFeature(feature.id)!;
        result.features.push(fresh);
      }

      // --- Delete manifest file ---
      try {
        unlinkSync(path);
        result.deleted.push(path);
      } catch {
        // Warn but don't fail
      }
    }
  });

  // --- Save GitHub sync file ---
  if (Object.keys(githubSync).length > 0) {
    saveGitHubSync(projectRoot, githubSync);
  }

  // --- Validation ---
  await store.transact((s) => {
    const allEpics = s.listEpics();
    for (const epic of allEpics) {
      const features = s.listFeatures(epic.id);
      for (const feature of features) {
        // Check parent exists
        if (!s.getEpic(feature.parent)) {
          result.validation.valid = false;
          result.validation.orphanFeatures.push(feature.id);
        }

        // Check depends_on resolve
        for (const depId of feature.depends_on) {
          if (!s.getFeature(depId) && !s.getEpic(depId)) {
            result.validation.valid = false;
            result.validation.unresolvedDeps.push(`${feature.id} -> ${depId}`);
          }
        }
      }
    }
  });

  return result;
}

// --- CLI entry point ---

export async function importCommand(
  store: JsonFileStore,
  _args: string[],
  projectRoot: string,
): Promise<void> {
  const result = await importTestable(store, projectRoot);

  const output = {
    imported: result.epics.length,
    skipped: result.skipped.length,
    deleted: result.deleted.length,
    validation: result.validation,
    epics: result.epics.map((e) => ({ id: e.id, name: e.name, slug: e.slug })),
    features: result.features.map((f) => ({ id: f.id, slug: f.slug, parent: f.parent })),
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}
```

- [ ] **Step 4: Register import subcommand in store.ts**

In `cli/src/commands/store.ts`, add the import case to the switch statement and the import:

At the top of the file, add:
```typescript
import { importCommand } from "./store-import.js";
```

In the switch statement, add before the `default` case:
```typescript
    case "import":
      await importCommand(store, subArgs, projectRoot);
      break;
```

Also update the `importCommand` call — it needs `projectRoot`, which is already a local variable in `storeCommand`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run cli/src/__tests__/store-import.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add cli/src/commands/store-import.ts cli/src/commands/store.ts cli/src/__tests__/store-import.test.ts
git commit -m "feat(store-import): add import command with manifest migration"
```

---

## Task 3: Verify Integration Tests Pass (GREEN State)

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Possibly modify: `cli/src/__tests__/store-import.integration.test.ts`
- Possibly modify: `cli/src/commands/store-import.ts`

- [ ] **Step 1: Run integration tests**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run cli/src/__tests__/store-import.integration.test.ts`
Expected: PASS — all scenarios GREEN

- [ ] **Step 2: Fix any failures**

If any integration test fails, fix the implementation to match the expected behavior. The integration tests define the contract.

- [ ] **Step 3: Run full test suite**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/manifest-absorption && bun --bun vitest run`
Expected: PASS

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix(store-import): satisfy integration test scenarios"
```
