import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { scanEpics, slugFromDesign } from "../state-scanner";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-state-scanner");

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "design"), {
    recursive: true,
  });
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "plan"), {
    recursive: true,
  });
  // Minimal config so gate checks don't crash
  mkdirSync(resolve(TEST_ROOT, ".beastmode"), { recursive: true });
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "config.yaml"),
    `gates:\n  implement:\n    architectural-deviation: auto\n`,
  );
}

function writeDesign(slug: string): void {
  writeFileSync(
    resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      `2026-01-01-${slug}.md`,
    ),
    `# ${slug}\n`,
  );
}

function writeManifest(
  slug: string,
  features: Array<{ slug: string; status: string }>,
  github?: { epic: number; repo: string },
): void {
  const manifest = {
    design: `.beastmode/state/design/2026-01-01-${slug}.md`,
    architecturalDecisions: [],
    features: features.map((f) => ({
      slug: f.slug,
      plan: `2026-01-01-${slug}-${f.slug}.md`,
      status: f.status,
    })),
    github,
    lastUpdated: "2026-01-01T00:00:00Z",
  };
  writeFileSync(
    resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "plan",
      `2026-01-01-${slug}.manifest.json`,
    ),
    JSON.stringify(manifest, null, 2),
  );
}

function writeRunLog(
  entries: Array<{
    epic: string;
    phase: string;
    cost_usd: number;
    duration_ms: number;
  }>,
): void {
  const fullEntries = entries.map((e) => ({
    ...e,
    feature: null,
    exit_status: "success" as const,
    timestamp: "2026-01-01T00:00:00Z",
    session_id: null,
  }));
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode-runs.json"),
    JSON.stringify(fullEntries),
  );
}

describe("slugFromDesign", () => {
  test("extracts slug from dated design filename", () => {
    expect(slugFromDesign("2026-03-28-my-epic.md")).toBe("my-epic");
  });

  test("handles multi-segment slugs", () => {
    expect(
      slugFromDesign("2026-03-28-typescript-pipeline-orchestrator.md"),
    ).toBe("typescript-pipeline-orchestrator");
  });

  test("handles filename without date prefix", () => {
    expect(slugFromDesign("my-epic.md")).toBe("my-epic");
  });
});

describe("scanEpics", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns empty array when no designs exist", async () => {
    const epics = await scanEpics(TEST_ROOT);
    expect(epics).toEqual([]);
  });

  test("design with no manifest returns next-action: plan", async () => {
    writeDesign("my-epic");
    const epics = await scanEpics(TEST_ROOT);

    expect(epics).toHaveLength(1);
    expect(epics[0].slug).toBe("my-epic");
    expect(epics[0].phase).toBe("design");
    expect(epics[0].nextAction).toEqual({
      phase: "plan",
      args: ["my-epic"],
      type: "single",
    });
  });

  test("manifest with empty features returns phase plan", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", []);
    const epics = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("plan");
    expect(epics[0].nextAction?.phase).toBe("plan");
  });

  test("manifest with pending features returns next-action: implement", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", [
      { slug: "feature-a", status: "pending" },
      { slug: "feature-b", status: "pending" },
    ]);
    const epics = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("implement");
    expect(epics[0].nextAction).toEqual({
      phase: "implement",
      args: ["my-epic"],
      type: "fan-out",
      features: ["feature-a", "feature-b"],
    });
  });

  test("manifest with mix of completed and pending features returns implement with pending only", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "pending" },
      { slug: "feature-c", status: "in-progress" },
    ]);
    const epics = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("implement");
    expect(epics[0].nextAction?.features).toEqual([
      "feature-b",
      "feature-c",
    ]);
  });

  test("all features completed returns next-action: validate", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "completed" },
    ]);
    const epics = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("validate");
    expect(epics[0].nextAction).toEqual({
      phase: "validate",
      args: ["my-epic"],
      type: "single",
    });
  });

  test("identifies blocked features", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", [
      { slug: "feature-a", status: "blocked" },
      { slug: "feature-b", status: "pending" },
    ]);
    const epics = await scanEpics(TEST_ROOT);

    expect(epics[0].blocked).toBe(true);
    expect(epics[0].gateBlocked).toBe(true);
  });

  test("aggregates cost from run log", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", [{ slug: "f1", status: "pending" }]);
    writeRunLog([
      { epic: "my-epic", phase: "plan", cost_usd: 1.5, duration_ms: 1000 },
      {
        epic: "my-epic",
        phase: "implement",
        cost_usd: 3.25,
        duration_ms: 2000,
      },
      {
        epic: "other-epic",
        phase: "plan",
        cost_usd: 10.0,
        duration_ms: 500,
      },
    ]);
    const epics = await scanEpics(TEST_ROOT);

    expect(epics[0].costUsd).toBeCloseTo(4.75);
  });

  test("returns zero cost when no run log exists", async () => {
    writeDesign("my-epic");
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].costUsd).toBe(0);
  });

  test("extracts feature progress from manifest", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "in-progress" },
      { slug: "feature-c", status: "pending" },
    ]);
    const epics = await scanEpics(TEST_ROOT);

    expect(epics[0].features).toEqual([
      { slug: "feature-a", status: "completed", githubIssue: undefined },
      { slug: "feature-b", status: "in-progress", githubIssue: undefined },
      { slug: "feature-c", status: "pending", githubIssue: undefined },
    ]);
  });

  test("handles multiple epics simultaneously", async () => {
    writeDesign("epic-one");
    writeDesign("epic-two");
    writeManifest("epic-one", [{ slug: "f1", status: "completed" }]);
    // epic-two has no manifest

    const epics = await scanEpics(TEST_ROOT);
    expect(epics).toHaveLength(2);

    const one = epics.find((e) => e.slug === "epic-one")!;
    const two = epics.find((e) => e.slug === "epic-two")!;

    expect(one.phase).toBe("validate");
    expect(two.phase).toBe("design");
  });

  test("preserves github epic issue from manifest", async () => {
    writeDesign("my-epic");
    writeManifest(
      "my-epic",
      [{ slug: "f1", status: "pending" }],
      { epic: 42, repo: "user/repo" },
    );
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].githubEpicIssue).toBe(42);
  });

  test("pure read-only — does not write to filesystem", async () => {
    writeDesign("my-epic");
    writeManifest("my-epic", [{ slug: "f1", status: "pending" }]);

    // Capture state before
    const designBefore = Bun.file(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "design",
        "2026-01-01-my-epic.md",
      ),
    ).lastModified;
    const manifestBefore = Bun.file(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "plan",
        "2026-01-01-my-epic.manifest.json",
      ),
    ).lastModified;

    await scanEpics(TEST_ROOT);

    // Verify no modification
    const designAfter = Bun.file(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "design",
        "2026-01-01-my-epic.md",
      ),
    ).lastModified;
    const manifestAfter = Bun.file(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "plan",
        "2026-01-01-my-epic.manifest.json",
      ),
    ).lastModified;

    expect(designAfter).toBe(designBefore);
    expect(manifestAfter).toBe(manifestBefore);
  });
});
