/**
 * Integration test: GitHub sync state separated from pipeline state.
 *
 * Verifies that GitHub issue numbers and body hashes are stored in a
 * dedicated sync file, not on store entities.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory";
import type { Epic } from "../store/types";

describe("GitHub sync state separated from pipeline state", () => {
  let store: InMemoryTaskStore;
  let epic: Epic;

  beforeEach(() => {
    store = new InMemoryTaskStore();
    epic = store.addEpic({ name: "Auth System" });
  });

  test("GitHub issue number stored in sync file, not on store entity", async () => {
    const { setSyncRef, getSyncRef } = await import("../github/sync-refs");

    const refs: Record<string, { issue: number; bodyHash?: string }> = {};
    const updatedRefs = setSyncRef(refs, epic.id, { issue: 42 });

    const ref = getSyncRef(updatedRefs, epic.id);
    expect(ref).toBeDefined();
    expect(ref!.issue).toBe(42);

    const freshEpic = store.getEpic(epic.id);
    expect(freshEpic).toBeDefined();
    expect((freshEpic as any).github).toBeUndefined();
  });

  test("GitHub sync module reads pipeline state from store", async () => {
    store.updateEpic(epic.id, { status: "plan" });
    const { setSyncRef } = await import("../github/sync-refs");

    const refs = setSyncRef({}, epic.id, { issue: 10 });

    const { formatEpicBody } = await import("../github/sync");
    const freshEpic = store.getEpic(epic.id)!;
    const features = store.listFeatures(epic.id);

    const body = formatEpicBody({
      slug: freshEpic.slug,
      epic: freshEpic.name,
      phase: freshEpic.status as any,
      summary: freshEpic.summary as any,
      features: features.map((f) => ({
        slug: f.slug,
        status: f.status,
        github: refs[f.id] ? { issue: refs[f.id].issue } : undefined,
      })),
    });

    expect(body).not.toContain("**Phase:**");
    expect(refs[epic.id].issue).toBe(10);
  });

  test("Feature issue numbers stored in sync file", async () => {
    const feature = store.addFeature({
      parent: epic.id,
      name: "Login Flow",
    });

    const { setSyncRef, getSyncRef } = await import("../github/sync-refs");

    const refs = setSyncRef({}, feature.id, { issue: 55 });

    const ref = getSyncRef(refs, feature.id);
    expect(ref).toBeDefined();
    expect(ref!.issue).toBe(55);

    const freshFeature = store.getFeature(feature.id);
    expect((freshFeature as any).github).toBeUndefined();
  });

  test("Sync file is independent from store transactions", async () => {
    const { setSyncRef, getSyncRef } = await import("../github/sync-refs");
    const refs = setSyncRef({}, epic.id, { issue: 10 });

    store.updateEpic(epic.id, { status: "implement" });

    const ref = getSyncRef(refs, epic.id);
    expect(ref!.issue).toBe(10);

    expect(Object.keys(refs)).toHaveLength(1);
  });

  test("Body hash tracked in sync file for idempotent updates", async () => {
    const { setSyncRef, getSyncRef } = await import("../github/sync-refs");
    const refs = setSyncRef({}, epic.id, { issue: 10, bodyHash: "abc123" });

    const ref = getSyncRef(refs, epic.id);

    expect(ref!.bodyHash).toBe("abc123");

    const currentHash = "abc123";
    expect(ref!.bodyHash === currentHash).toBe(true);
  });
});
