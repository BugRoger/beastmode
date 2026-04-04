import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
    expect(result.slug).toBe("my-epic");
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
    await store.transact(s => s.addEpic({ name: "Slug Test" }));
    const result = await epicShowTestable(store, ["slug-test"]);
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
    await store.transact(s => s.addFeature({ parent: epicId, name: "F1" }));
    const result = await featureLsTestable(store, ["parent-epic"]);
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
