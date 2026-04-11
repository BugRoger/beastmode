import { describe, test, expect } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import { listEnrichedFromStore } from "../store/scan.js";
import type { Epic } from "../store/types.js";

/**
 * @epic-sort-by-date
 * Integration test: Epics are sorted by status group and creation date
 */

function addEpic(
  store: InMemoryTaskStore,
  name: string,
  status: Epic["status"],
  createdAt: string,
): string {
  const epic = store.addEpic({ name });
  store.updateEpic(epic.id, { status, updated_at: createdAt });
  // Patch created_at via direct entity access
  const entity = store.getEpic(epic.id)!;
  (entity as unknown as Record<string, unknown>).created_at = createdAt;
  return epic.slug;
}

function setupBackground(): { store: InMemoryTaskStore; slugs: { [name: string]: string } } {
  const store = new InMemoryTaskStore();
  const slugs: { [name: string]: string } = {};
  slugs["old-epic"] = addEpic(store, "old-epic", "implement", "2025-01-15T00:00:00.000Z");
  slugs["mid-epic"] = addEpic(store, "mid-epic", "plan", "2025-06-10T00:00:00.000Z");
  slugs["new-epic"] = addEpic(store, "new-epic", "design", "2025-12-01T00:00:00.000Z");
  slugs["done-epic"] = addEpic(store, "done-epic", "done", "2025-11-20T00:00:00.000Z");
  slugs["cancelled-epic"] = addEpic(store, "cancelled-epic", "cancelled", "2025-12-15T00:00:00.000Z");
  return { store, slugs };
}

describe("@epic-sort-by-date: Epics sorted by status group and creation date", () => {
  test("Active epics appear newest-first by creation date", () => {
    const { store, slugs } = setupBackground();
    const epics = listEnrichedFromStore(store);
    const epicSlugs = epics.map((e) => e.slug);

    const newIdx = epicSlugs.indexOf(slugs["new-epic"]);
    const midIdx = epicSlugs.indexOf(slugs["mid-epic"]);
    const oldIdx = epicSlugs.indexOf(slugs["old-epic"]);

    expect(newIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(oldIdx);
  });

  test("Done and cancelled epics appear below all active epics", () => {
    const { store, slugs } = setupBackground();
    const epics = listEnrichedFromStore(store);
    const epicSlugs = epics.map((e) => e.slug);

    const activeEpics = [slugs["new-epic"], slugs["mid-epic"], slugs["old-epic"]];
    const terminalEpics = [slugs["done-epic"], slugs["cancelled-epic"]];

    const lastActiveIdx = Math.max(...activeEpics.map((s) => epicSlugs.indexOf(s)));
    const firstTerminalIdx = Math.min(...terminalEpics.map((s) => epicSlugs.indexOf(s)));

    expect(lastActiveIdx).toBeLessThan(firstTerminalIdx);
  });

  test("Done and cancelled epics are sorted newest-first within their group", () => {
    const { store, slugs } = setupBackground();
    const epics = listEnrichedFromStore(store);
    const epicSlugs = epics.map((e) => e.slug);

    const cancelledIdx = epicSlugs.indexOf(slugs["cancelled-epic"]);
    const doneIdx = epicSlugs.indexOf(slugs["done-epic"]);

    // cancelled-epic created 2025-12-15, done-epic created 2025-11-20
    expect(cancelledIdx).toBeLessThan(doneIdx);
  });

  test("Epics in any active phase sort above terminal-state epics", () => {
    const activePhases: Epic["status"][] = ["design", "plan", "implement", "validate", "release"];
    const terminalPhases: Epic["status"][] = ["done", "cancelled"];

    for (const activePhase of activePhases) {
      for (const terminalPhase of terminalPhases) {
        const store = new InMemoryTaskStore();
        const activeSlug = addEpic(store, "active-one", activePhase, "2025-03-01T00:00:00.000Z");
        const terminalSlug = addEpic(store, "terminal-one", terminalPhase, "2025-09-01T00:00:00.000Z");

        const epics = listEnrichedFromStore(store);
        const epicSlugs = epics.map((e) => e.slug);

        expect(epicSlugs.indexOf(activeSlug)).toBeLessThan(epicSlugs.indexOf(terminalSlug));
      }
    }
  });

  test("A newly created epic appears at the top of the active group", () => {
    const { store, slugs } = setupBackground();
    const newSlug = addEpic(store, "brand-new", "design", "2026-01-01T00:00:00.000Z");

    const epics = listEnrichedFromStore(store);
    const activeEpics = epics.filter(
      (e) => e.status !== "done" && e.status !== "cancelled",
    );

    expect(activeEpics[0].slug).toBe(newSlug);
  });

  test("An epic transitioning to done moves to the completed group", () => {
    const { store, slugs } = setupBackground();
    const newEpicSlug = slugs["new-epic"];
    const newEpic = [...(store as InMemoryTaskStore).listEpics()].find(
      (e) => e.slug === newEpicSlug,
    )!;
    store.updateEpic(newEpic.id, { status: "done" });

    const epics = listEnrichedFromStore(store);
    const activeEpics = epics.filter(
      (e) => e.status !== "done" && e.status !== "cancelled",
    );
    const terminalEpics = epics.filter(
      (e) => e.status === "done" || e.status === "cancelled",
    );

    expect(activeEpics.map((e) => e.slug)).not.toContain(newEpicSlug);
    expect(terminalEpics.map((e) => e.slug)).toContain(newEpicSlug);
  });
});
