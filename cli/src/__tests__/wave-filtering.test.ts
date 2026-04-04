import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { epicMachine } from "../pipeline-machine/epic.js";
import type { EpicContext } from "../pipeline-machine/types.js";
import type { PipelineManifest, ManifestFeature } from "../manifest/store.js";
import type { NextAction } from "../manifest/pure.js";
import type { DispatchType } from "../pipeline-machine/types.js";

/**
 * Inline version of deriveNextActionFromMachine for unit testing.
 * Mirrors the real implementation in state-scanner.ts.
 */
function deriveNextAction(manifest: PipelineManifest): NextAction | null {
  const snapshot = epicMachine.resolveState({
    value: manifest.phase,
    context: manifest as unknown as EpicContext,
  });
  const actor = createActor(epicMachine, { snapshot, input: manifest as unknown as EpicContext });
  actor.start();

  const currentSnapshot = actor.getSnapshot();
  const stateValue = currentSnapshot.value as string;
  const meta = currentSnapshot.getMeta();
  const stateMeta = (meta as Record<string, { dispatchType?: DispatchType } | undefined>)[`epic.${stateValue}`];
  const dispatchType = stateMeta?.dispatchType;

  actor.stop();

  if (!dispatchType || dispatchType === "skip") return null;

  if (dispatchType === "fan-out") {
    const incompleteFeatures = manifest.features
      .filter((f) => f.status === "pending" || f.status === "in-progress" || f.status === "blocked");
    if (incompleteFeatures.length === 0) return null;

    const lowestWave = Math.min(...incompleteFeatures.map((f) => f.wave ?? 1));
    const lowestWaveFeatures = incompleteFeatures.filter((f) => (f.wave ?? 1) === lowestWave);

    const dispatchable = lowestWaveFeatures
      .filter((f) => f.status === "pending" || f.status === "in-progress")
      .map((f) => f.slug);

    if (dispatchable.length === 0) return null;

    return {
      phase: stateValue,
      args: [manifest.slug],
      type: "fan-out",
      features: dispatchable,
    };
  }

  return {
    phase: stateValue,
    args: [manifest.slug],
    type: "single",
  };
}

function makeManifest(features: ManifestFeature[]): PipelineManifest {
  return {
    slug: "test-epic",
    phase: "implement",
    features,
    artifacts: {},
    lastUpdated: "2026-03-31T00:00:00Z",
  };
}

describe("deriveNextAction wave filtering", () => {
  it("returns only wave 1 features when waves 1 and 2 are pending", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", wave: 1, status: "pending" },
      { slug: "b", plan: "b.md", wave: 1, status: "pending" },
      { slug: "c", plan: "c.md", wave: 2, status: "pending" },
      { slug: "d", plan: "d.md", wave: 2, status: "pending" },
    ]);

    const action = deriveNextAction(manifest);
    expect(action).not.toBeNull();
    expect(action!.type).toBe("fan-out");
    expect(action!.features).toEqual(["a", "b"]);
  });

  it("advances to wave 2 when wave 1 is completed", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", wave: 1, status: "completed" },
      { slug: "b", plan: "b.md", wave: 1, status: "completed" },
      { slug: "c", plan: "c.md", wave: 2, status: "pending" },
      { slug: "d", plan: "d.md", wave: 2, status: "pending" },
    ]);

    const action = deriveNextAction(manifest);
    expect(action).not.toBeNull();
    expect(action!.features).toEqual(["c", "d"]);
  });

  it("blocked feature in wave 1 prevents wave 2 dispatch", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", wave: 1, status: "completed" },
      { slug: "b", plan: "b.md", wave: 1, status: "blocked" },
      { slug: "c", plan: "c.md", wave: 2, status: "pending" },
    ]);

    // Wave 1 has a blocked feature — no dispatchable features
    const action = deriveNextAction(manifest);
    expect(action).toBeNull();
  });

  it("blocked feature with pending sibling in same wave still dispatches pending", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", wave: 1, status: "blocked" },
      { slug: "b", plan: "b.md", wave: 1, status: "pending" },
      { slug: "c", plan: "c.md", wave: 2, status: "pending" },
    ]);

    const action = deriveNextAction(manifest);
    expect(action).not.toBeNull();
    expect(action!.features).toEqual(["b"]);
  });

  it("features without wave default to wave 1", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", status: "pending" },
      { slug: "b", plan: "b.md", status: "pending" },
      { slug: "c", plan: "c.md", wave: 2, status: "pending" },
    ]);

    const action = deriveNextAction(manifest);
    expect(action).not.toBeNull();
    expect(action!.features).toEqual(["a", "b"]);
  });

  it("returns null when all features are completed", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", wave: 1, status: "completed" },
      { slug: "b", plan: "b.md", wave: 2, status: "completed" },
    ]);

    const action = deriveNextAction(manifest);
    expect(action).toBeNull();
  });

  it("includes in-progress features from current wave", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", wave: 1, status: "completed" },
      { slug: "b", plan: "b.md", wave: 2, status: "in-progress" },
      { slug: "c", plan: "c.md", wave: 2, status: "pending" },
      { slug: "d", plan: "d.md", wave: 3, status: "pending" },
    ]);

    const action = deriveNextAction(manifest);
    expect(action).not.toBeNull();
    expect(action!.features).toEqual(["b", "c"]);
  });

  it("handles mixed waves with wave 1 having some completed, some pending", () => {
    const manifest = makeManifest([
      { slug: "a", plan: "a.md", wave: 1, status: "completed" },
      { slug: "b", plan: "b.md", wave: 1, status: "pending" },
      { slug: "c", plan: "c.md", wave: 2, status: "pending" },
    ]);

    // Wave 1 still has pending features — only wave 1 dispatches
    const action = deriveNextAction(manifest);
    expect(action).not.toBeNull();
    expect(action!.features).toEqual(["b"]);
  });
});
