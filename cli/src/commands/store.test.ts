import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { JsonFileStore } from "../store/json-file-store.js";
import {
  epicLsTestable,
  epicShowTestable,
  epicUpdateTestable,
  epicDeleteTestable,
  featureAddTestable,
  featureLsTestable,
  featureShowTestable,
  featureUpdateTestable,
  featureDeleteTestable,
  readyTestable,
  blockedTestable,
  treeTestable,
  searchTestable,
  parseFlags,
} from "./store.js";

function tmpdir(): string {
  const dir = join("/tmp", `store-cli-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("store command wiring", () => {
  it("store is a recognized command in UTILITY_COMMANDS", async () => {
    const { parseArgs } = await import("../args.js");
    const result = parseArgs(["bun", "script.ts", "store", "epic", "ls"]);
    expect(result.command).toBe("store");
    expect(result.args).toEqual(["epic", "ls"]);
  });
});

describe("epic commands", () => {
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

  it("epic add via transact creates epic", async () => {
    const result = await store.transact(s => s.addEpic({ name: "My Epic" }));
    expect(result.type).toBe("epic");
    expect(result.name).toBe("My Epic");
    expect(result.slug).toMatch(/^my-epic-[0-9a-f]{4}$/);
    expect(result.id).toMatch(/^bm-[0-9a-f]{4}$/);
  });

  it("epic ls returns array of epics", async () => {
    await store.transact(s => s.addEpic({ name: "Epic One" }));
    await store.transact(s => s.addEpic({ name: "Epic Two" }));
    const result = await epicLsTestable(store);
    expect(result).toHaveLength(2);
  });

  it("epic show returns epic by ID", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Show Me" }));
    const result = await epicShowTestable(store, [epic.id]);
    expect(result.name).toBe("Show Me");
  });

  it("epic show accepts slug", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Slug Test" }));
    const result = await epicShowTestable(store, [epic.slug]);
    expect(result.name).toBe("Slug Test");
  });

  it("epic show with --deps includes dependency chain", async () => {
    const e1 = await store.transact(s => s.addEpic({ name: "Dep Epic" }));
    const e2 = await store.transact(s => {
      const ep = s.addEpic({ name: "Main Epic" });
      s.updateEpic(ep.id, { depends_on: [e1.id] });
      return s.getEpic(ep.id)!;
    });
    const result = await epicShowTestable(store, [e2.id, "--deps"]);
    expect(result.deps).toBeDefined();
    expect(result.deps.length).toBeGreaterThanOrEqual(1);
  });

  it("epic update patches fields", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Original" }));
    const result = await epicUpdateTestable(store, [epic.id, "--name=Updated", "--status=plan"]);
    expect(result.name).toBe("Updated");
    expect(result.status).toBe("plan");
  });

  it("epic update --add-dep adds dependency", async () => {
    const e1 = await store.transact(s => s.addEpic({ name: "Dep" }));
    const e2 = await store.transact(s => s.addEpic({ name: "Main" }));
    const result = await epicUpdateTestable(store, [e2.id, `--add-dep=${e1.id}`]);
    expect(result.depends_on).toContain(e1.id);
  });

  it("epic update --rm-dep removes dependency", async () => {
    const e1 = await store.transact(s => s.addEpic({ name: "Dep" }));
    const e2 = await store.transact(s => {
      const ep = s.addEpic({ name: "Main" });
      s.updateEpic(ep.id, { depends_on: [e1.id] });
      return s.getEpic(ep.id)!;
    });
    const result = await epicUpdateTestable(store, [e2.id, `--rm-dep=${e1.id}`]);
    expect(result.depends_on).not.toContain(e1.id);
  });

  it("epic delete removes epic", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Delete Me" }));
    await epicDeleteTestable(store, [epic.id]);
    const check = await store.transact(s => s.getEpic(epic.id));
    expect(check).toBeUndefined();
  });

  it("epic show with unknown ID throws", async () => {
    await expect(epicShowTestable(store, ["bm-0000"])).rejects.toThrow("Epic not found");
  });
});

describe("feature commands", () => {
  let storeDir: string;
  let storePath: string;
  let store: JsonFileStore;
  let epicId: string;

  beforeEach(async () => {
    storeDir = tmpdir();
    storePath = join(storeDir, "store.json");
    store = new JsonFileStore(storePath);
    const epic = await store.transact(s => s.addEpic({ name: "Parent Epic" }));
    epicId = epic.id;
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
  });

  it("feature add creates feature under epic", async () => {
    const result = await featureAddTestable(store, [`--parent=${epicId}`, '--name=My Feature']);
    expect(result.type).toBe("feature");
    expect(result.parent).toBe(epicId);
    expect(result.name).toBe("My Feature");
    expect(result.id).toMatch(new RegExp(`^${epicId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+$`));
  });

  it("feature ls lists features for epic", async () => {
    await store.transact(s => s.addFeature({ parent: epicId, name: "F1" }));
    await store.transact(s => s.addFeature({ parent: epicId, name: "F2" }));
    const result = await featureLsTestable(store, [epicId]);
    expect(result).toHaveLength(2);
  });

  it("feature ls accepts slug", async () => {
    const epic = await store.transact(s => s.getEpic(epicId)!);
    await store.transact(s => s.addFeature({ parent: epicId, name: "F1" }));
    const result = await featureLsTestable(store, [epic!.slug]);
    expect(result).toHaveLength(1);
  });

  it("feature show returns feature by ID", async () => {
    const f = await store.transact(s => s.addFeature({ parent: epicId, name: "Show Feature" }));
    const result = await featureShowTestable(store, [f.id]);
    expect(result.name).toBe("Show Feature");
  });

  it("feature show --deps includes dependency chain", async () => {
    const f1 = await store.transact(s => s.addFeature({ parent: epicId, name: "Dep Feature" }));
    const f2 = await store.transact(s => {
      const feat = s.addFeature({ parent: epicId, name: "Main Feature" });
      s.updateFeature(feat.id, { depends_on: [f1.id] });
      return s.getFeature(feat.id)!;
    });
    const result = await featureShowTestable(store, [f2.id, "--deps"]);
    expect(result.deps).toBeDefined();
  });

  it("feature update patches fields", async () => {
    const f = await store.transact(s => s.addFeature({ parent: epicId, name: "Original" }));
    const result = await featureUpdateTestable(store, [f.id, "--name=Updated", "--status=in-progress"]);
    expect(result.name).toBe("Updated");
    expect(result.status).toBe("in-progress");
  });

  it("feature update --add-dep and --rm-dep work", async () => {
    const f1 = await store.transact(s => s.addFeature({ parent: epicId, name: "Dep" }));
    const f2 = await store.transact(s => s.addFeature({ parent: epicId, name: "Main" }));

    const added = await featureUpdateTestable(store, [f2.id, `--add-dep=${f1.id}`]);
    expect(added.depends_on).toContain(f1.id);

    const removed = await featureUpdateTestable(store, [f2.id, `--rm-dep=${f1.id}`]);
    expect(removed.depends_on).not.toContain(f1.id);
  });

  it("feature delete removes feature", async () => {
    const f = await store.transact(s => s.addFeature({ parent: epicId, name: "Delete Me" }));
    await featureDeleteTestable(store, [f.id]);
    const check = await store.transact(s => s.getFeature(f.id));
    expect(check).toBeUndefined();
  });

  it("feature show with unknown ID throws", async () => {
    await expect(featureShowTestable(store, ["bm-0000.1"])).rejects.toThrow("Feature not found");
  });
});

describe("query commands", () => {
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

  it("ready returns unblocked features", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "E1" }));
    await store.transact(s => s.addFeature({ parent: epic.id, name: "F1" }));
    await store.transact(s => s.addFeature({ parent: epic.id, name: "F2" }));
    const result = await readyTestable(store, []);
    expect(result).toHaveLength(2);
  });

  it("ready filters by epic ID", async () => {
    const e1 = await store.transact(s => s.addEpic({ name: "E1" }));
    const e2 = await store.transact(s => s.addEpic({ name: "E2" }));
    await store.transact(s => s.addFeature({ parent: e1.id, name: "F1" }));
    await store.transact(s => s.addFeature({ parent: e2.id, name: "F2" }));
    const result = await readyTestable(store, [e1.id]);
    expect(result).toHaveLength(1);
    expect(result[0].parent).toBe(e1.id);
  });

  it("ready --type=epic returns ready epics", async () => {
    await store.transact(s => s.addEpic({ name: "E1" }));
    const result = await readyTestable(store, ["--type=epic"]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("epic");
  });

  it("blocked returns blocked entities", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "E1" }));
    await store.transact(s => {
      const f = s.addFeature({ parent: epic.id, name: "Blocked Feature" });
      s.updateFeature(f.id, { status: "blocked" });
    });
    const result = await blockedTestable(store);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("blocked");
  });

  it("tree returns full hierarchy", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "E1" }));
    await store.transact(s => s.addFeature({ parent: epic.id, name: "F1" }));
    const result = await treeTestable(store, []);
    expect(result).toHaveLength(1);
    expect(result[0].entity.type).toBe("epic");
    expect(result[0].children).toHaveLength(1);
  });

  it("tree with root ID returns subtree", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "E1" }));
    await store.transact(s => s.addFeature({ parent: epic.id, name: "F1" }));
    await store.transact(s => s.addEpic({ name: "E2" }));
    const result = await treeTestable(store, [epic.id]);
    expect(result).toHaveLength(1);
    expect(result[0].entity.id).toBe(epic.id);
  });

  it("search --name filters by name substring", async () => {
    await store.transact(s => s.addEpic({ name: "Auth Middleware" }));
    await store.transact(s => s.addEpic({ name: "CLI Restructure" }));
    const result = await searchTestable(store, ["--name=Auth"]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Auth Middleware");
  });

  it("search --status filters by status", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "E1" }));
    await store.transact(s => {
      const f = s.addFeature({ parent: epic.id, name: "F1" });
      s.updateFeature(f.id, { status: "blocked" });
    });
    await store.transact(s => s.addFeature({ parent: epic.id, name: "F2" }));
    const result = await searchTestable(store, ["--status=blocked"]);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("blocked");
  });

  it("search --type filters by entity type", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "E1" }));
    await store.transact(s => s.addFeature({ parent: epic.id, name: "F1" }));
    const result = await searchTestable(store, ["--type=epic"]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("epic");
  });
});

describe("error handling and output contract", () => {
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

  it("feature show with nonexistent ID throws descriptive error", async () => {
    await expect(featureShowTestable(store, ["bm-9999.1"])).rejects.toThrow("Feature not found: bm-9999.1");
  });

  it("epic add returns all expected fields", async () => {
    const result = await store.transact(s => s.addEpic({ name: "Full Fields" }));
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("type", "epic");
    expect(result).toHaveProperty("name", "Full Fields");
    expect(result).toHaveProperty("slug");
    expect(result.slug).toMatch(/^full-fields-[0-9a-f]{4}$/);
    expect(result).toHaveProperty("status", "design");
    expect(result).toHaveProperty("depends_on");
    expect(result).toHaveProperty("created_at");
    expect(result).toHaveProperty("updated_at");
  });

  it("feature add returns all expected fields", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "E1" }));
    const result = await store.transact(s => s.addFeature({ parent: epic.id, name: "Full Feature" }));
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("type", "feature");
    expect(result).toHaveProperty("parent", epic.id);
    expect(result).toHaveProperty("name", "Full Feature");
    expect(result).toHaveProperty("status", "pending");
    expect(result).toHaveProperty("depends_on");
    expect(result).toHaveProperty("created_at");
    expect(result).toHaveProperty("updated_at");
  });

  it("epic delete cascades to features", async () => {
    const epic = await store.transact(s => s.addEpic({ name: "Cascade" }));
    const f = await store.transact(s => s.addFeature({ parent: epic.id, name: "Child" }));
    await epicDeleteTestable(store, [epic.id]);
    const check = await store.transact(s => s.getFeature(f.id));
    expect(check).toBeUndefined();
  });

  it("parseFlags handles mixed args correctly", () => {
    const { positional, flags } = parseFlags(["bm-1234", "--name=Hello World", "--deps"]);
    expect(positional).toEqual(["bm-1234"]);
    expect(flags["name"]).toBe("Hello World");
    expect(flags["deps"]).toBe("true");
  });
});
