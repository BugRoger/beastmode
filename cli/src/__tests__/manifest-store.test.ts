import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  manifestPath,
  manifestExists,
  get,
  load,
  list,
  save,
  create,
  remove,
  validate,
  slugify,
  isValidSlug,
} from "../manifest/store";
import type { PipelineManifest } from "../manifest/store";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-manifest-store");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
}

function pipeDir(): string {
  return resolve(TEST_ROOT, ".beastmode", "state");
}

function writeManifestFile(filename: string, content: unknown): void {
  const dir = pipeDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, filename), JSON.stringify(content, null, 2));
}

function validManifest(overrides?: Partial<PipelineManifest>): PipelineManifest {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe("manifestPath", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("returns undefined when state dir missing", () => {
    expect(manifestPath(TEST_ROOT, "my-epic")).toBeUndefined();
  });

  test("returns undefined when no matching manifest", () => {
    mkdirSync(pipeDir(), { recursive: true });
    expect(manifestPath(TEST_ROOT, "my-epic")).toBeUndefined();
  });

  test("finds flat-file manifest by slug suffix", () => {
    const dir = pipeDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "2026-03-29-my-epic.manifest.json"), "{}");
    const found = manifestPath(TEST_ROOT, "my-epic");
    expect(found).toBe(resolve(dir, "2026-03-29-my-epic.manifest.json"));
  });

  test("returns latest when multiple date-prefixed manifests", () => {
    const dir = pipeDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "2026-03-28-my-epic.manifest.json"), "{}");
    writeFileSync(resolve(dir, "2026-03-29-my-epic.manifest.json"), "{}");
    const found = manifestPath(TEST_ROOT, "my-epic");
    expect(found).toBe(resolve(dir, "2026-03-29-my-epic.manifest.json"));
  });
});

describe("create", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("creates manifest with design phase", () => {
    const manifest = create(TEST_ROOT, "test-epic");
    expect(manifest.slug).toBe("test-epic");
    expect(manifest.phase).toBe("design");
    expect(manifest.features).toEqual([]);
    expect(manifest.artifacts).toEqual({});
    expect(manifest.lastUpdated).toBeTruthy();

    // Confirm persistence
    const loaded = get(TEST_ROOT, "test-epic");
    expect(loaded.slug).toBe("test-epic");
  });

  test("creates state directory if missing", () => {
    expect(existsSync(pipeDir())).toBe(false);
    create(TEST_ROOT, "fresh-epic");
    expect(existsSync(pipeDir())).toBe(true);
    expect(manifestExists(TEST_ROOT, "fresh-epic")).toBe(true);
  });

  test("includes worktree and github options when provided", () => {
    const manifest = create(TEST_ROOT, "opts-epic", {
      worktree: { branch: "feature/opts", path: "/tmp/opts" },
      github: { epic: 42, repo: "org/repo" },
    });
    expect(manifest.worktree).toEqual({
      branch: "feature/opts",
      path: "/tmp/opts",
    });
    expect(manifest.github).toEqual({ epic: 42, repo: "org/repo" });
  });
});

describe("get", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("throws if manifest missing", () => {
    expect(() => get(TEST_ROOT, "nonexistent")).toThrow(/Manifest not found/);
  });
});

describe("load", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("returns undefined if missing", () => {
    const result = load(TEST_ROOT, "nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("manifestExists", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("returns false for missing, true after create", () => {
    expect(manifestExists(TEST_ROOT, "ex-epic")).toBe(false);
    create(TEST_ROOT, "ex-epic");
    expect(manifestExists(TEST_ROOT, "ex-epic")).toBe(true);
  });
});

describe("save", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("creates directories and persists manifest", () => {
    expect(existsSync(pipeDir())).toBe(false);

    const manifest = validManifest({ slug: "save-test", phase: "plan" });
    save(TEST_ROOT, "save-test", manifest);

    expect(existsSync(pipeDir())).toBe(true);
    expect(manifestPath(TEST_ROOT, "save-test")).toBeDefined();

    const loaded = get(TEST_ROOT, "save-test");
    expect(loaded.slug).toBe("save-test");
    expect(loaded.phase).toBe("plan");
  });
});

describe("remove", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("returns true and deletes manifest file", () => {
    create(TEST_ROOT, "rm-epic");
    expect(manifestExists(TEST_ROOT, "rm-epic")).toBe(true);

    const result = remove(TEST_ROOT, "rm-epic");
    expect(result).toBe(true);
    expect(manifestExists(TEST_ROOT, "rm-epic")).toBe(false);
  });

  test("returns false for nonexistent slug without throwing", () => {
    const result = remove(TEST_ROOT, "nonexistent");
    expect(result).toBe(false);
  });

  test("is idempotent — second call returns false", () => {
    create(TEST_ROOT, "idem-epic");
    expect(remove(TEST_ROOT, "idem-epic")).toBe(true);
    expect(remove(TEST_ROOT, "idem-epic")).toBe(false);
  });
});

describe("list", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("returns all valid manifests in state dir", () => {
    writeManifestFile(
      "2026-03-29-alpha.manifest.json",
      validManifest({ slug: "alpha" }),
    );
    writeManifestFile(
      "2026-03-29-beta.manifest.json",
      validManifest({ slug: "beta", phase: "plan" }),
    );

    const result = list(TEST_ROOT);
    expect(result).toHaveLength(2);
    const slugs = result.map((m) => m.slug).sort();
    expect(slugs).toEqual(["alpha", "beta"]);
  });

  test("skips invalid manifests silently", () => {
    writeManifestFile(
      "2026-03-29-good.manifest.json",
      validManifest({ slug: "good" }),
    );
    // Invalid: missing required fields
    writeManifestFile("2026-03-29-bad.manifest.json", {
      notAManifest: true,
    });
    // Invalid: corrupt JSON
    const dir = pipeDir();
    writeFileSync(
      resolve(dir, "2026-03-29-corrupt.manifest.json"),
      "not json at all{{{",
    );

    const result = list(TEST_ROOT);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("good");
  });

  test("returns empty array when no state dir", () => {
    const result = list(TEST_ROOT);
    expect(result).toEqual([]);
  });
});

describe("validate", () => {
  test("accepts valid PipelineManifest shape", () => {
    expect(
      validate({
        slug: "test",
        phase: "design",
        features: [],
        artifacts: {},
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(true);
  });

  test("rejects missing phase", () => {
    expect(
      validate({
        slug: "test",
        features: [],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects invalid phase", () => {
    expect(
      validate({
        slug: "test",
        phase: "not-a-phase",
        features: [],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects non-array features", () => {
    expect(
      validate({
        slug: "test",
        phase: "design",
        features: "not-array",
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects features missing slug", () => {
    expect(
      validate({
        slug: "test",
        phase: "design",
        features: [{ status: "pending" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects features missing status", () => {
    expect(
      validate({
        slug: "test",
        phase: "design",
        features: [{ slug: "feat-a" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects features with invalid status", () => {
    expect(
      validate({
        slug: "test",
        phase: "design",
        features: [{ slug: "feat-a", status: "unknown-status" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("accepts manifest without design field (new schema)", () => {
    // The validate function should NOT require a design field
    expect(
      validate({
        slug: "new-schema",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "a.md", status: "pending" },
        ],
        artifacts: { plan: ["plan.md"] },
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(true);
  });

  test("rejects null", () => {
    expect(validate(null)).toBe(false);
  });

  test("rejects non-object", () => {
    expect(validate("string")).toBe(false);
  });

  test("rejects missing slug", () => {
    expect(
      validate({
        phase: "design",
        features: [],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects missing lastUpdated", () => {
    expect(
      validate({
        slug: "test",
        phase: "design",
        features: [],
      }),
    ).toBe(false);
  });

  test("accepts manifest with done phase", () => {
    expect(
      validate({
        slug: "test",
        phase: "done",
        features: [],
        artifacts: {},
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(true);
  });

  test("accepts manifest with cancelled phase", () => {
    expect(
      validate({
        slug: "test",
        phase: "cancelled",
        features: [],
        artifacts: {},
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(true);
  });

  test("validates manifest with features missing wave field (backwards compat)", () => {
    const manifest = {
      slug: "legacy-epic",
      phase: "implement",
      features: [
        { slug: "feat-a", plan: "feat-a.md", status: "pending" },
        { slug: "feat-b", plan: "feat-b.md", status: "completed" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-31T00:00:00Z",
    };
    expect(validate(manifest)).toBe(true);
  });

  test("validates manifest with features that have wave field", () => {
    const manifest = {
      slug: "wave-epic",
      phase: "implement",
      features: [
        { slug: "feat-a", plan: "feat-a.md", status: "pending", wave: 1 },
        { slug: "feat-b", plan: "feat-b.md", status: "pending", wave: 2 },
      ],
      artifacts: {},
      lastUpdated: "2026-03-31T00:00:00Z",
    };
    expect(validate(manifest)).toBe(true);
  });
});

describe("PipelineManifest type", () => {
  test("includes optional originId and epic fields", () => {
    const withOriginId: PipelineManifest = {
      slug: "abc123",
      epic: "my-feature",
      phase: "design",
      features: [],
      artifacts: {},
      originId: "abc123",
      lastUpdated: new Date().toISOString(),
    };
    expect(withOriginId.originId).toBe("abc123");
    expect(withOriginId.epic).toBe("my-feature");
  });
});

describe("slugify", () => {
  test("lowercases input", () => {
    expect(slugify("MyFeature")).toBe("myfeature");
  });

  test("replaces spaces with hyphens", () => {
    expect(slugify("my feature name")).toBe("my-feature-name");
  });

  test("replaces special characters with hyphens", () => {
    expect(slugify("my_feature!@#name")).toBe("my-feature-name");
  });

  test("collapses multiple hyphens", () => {
    expect(slugify("my---feature")).toBe("my-feature");
  });

  test("strips leading and trailing hyphens", () => {
    expect(slugify("-my-feature-")).toBe("my-feature");
  });

  test("handles already-valid slugs", () => {
    expect(slugify("valid-slug")).toBe("valid-slug");
  });

  test("throws on empty input", () => {
    expect(() => slugify("")).toThrow(/Cannot slugify/);
  });

  test("throws on all-special-character input", () => {
    expect(() => slugify("!!!")).toThrow(/Cannot slugify/);
  });
});

describe("isValidSlug", () => {
  test("accepts simple alphanumeric", () => {
    expect(isValidSlug("abc123")).toBe(true);
  });

  test("accepts hyphenated slug", () => {
    expect(isValidSlug("my-feature")).toBe(true);
  });

  test("rejects leading hyphen", () => {
    expect(isValidSlug("-leading")).toBe(false);
  });

  test("rejects trailing hyphen", () => {
    expect(isValidSlug("trailing-")).toBe(false);
  });

  test("rejects uppercase", () => {
    expect(isValidSlug("MyFeature")).toBe(false);
  });

  test("rejects special characters", () => {
    expect(isValidSlug("my_feature")).toBe(false);
  });

  test("accepts single character", () => {
    expect(isValidSlug("a")).toBe(true);
  });

  test("rejects empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });
});
