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
