import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import {
  tagName,
  createTag,
  deleteTags,
  deleteAllTags,
  renameTags,
  listTags,
} from "../git/tags";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-phase-tags");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

function setupTestRepo(): void {
  cleanup();
  mkdirSync(TEST_ROOT, { recursive: true });
  execSync("git init", { cwd: TEST_ROOT, stdio: "ignore" });
  execSync("git commit --allow-empty -m 'init'", {
    cwd: TEST_ROOT,
    stdio: "ignore",
  });
}

function getTagSha(tag: string): string {
  return execSync(`git rev-parse ${tag}`, {
    cwd: TEST_ROOT,
    encoding: "utf-8",
  }).trim();
}

describe("phase-tags", () => {
  beforeEach(() => setupTestRepo());
  afterEach(() => cleanup());

  describe("tagName", () => {
    test("builds correct tag name", () => {
      expect(tagName("my-epic", "design")).toBe("beastmode/my-epic/design");
    });
  });

  describe("createTag", () => {
    test("creates tag at HEAD", async () => {
      await createTag("my-epic", "design", { cwd: TEST_ROOT });
      const tags = await listTags("my-epic", { cwd: TEST_ROOT });
      expect(tags).toContain("beastmode/my-epic/design");
    });

    test("overwrites existing tag on rerun", async () => {
      await createTag("my-epic", "design", { cwd: TEST_ROOT });
      const sha1 = getTagSha("beastmode/my-epic/design");

      // Create a new commit
      execSync("git commit --allow-empty -m 'second'", {
        cwd: TEST_ROOT,
        stdio: "ignore",
      });

      await createTag("my-epic", "design", { cwd: TEST_ROOT });
      const sha2 = getTagSha("beastmode/my-epic/design");

      expect(sha1).not.toBe(sha2);
    });
  });

  describe("deleteTags", () => {
    test("deletes tags after given phase", async () => {
      // Create tags for all phases
      for (const phase of [
        "design",
        "plan",
        "implement",
        "validate",
        "release",
      ]) {
        await createTag("my-epic", phase, { cwd: TEST_ROOT });
      }

      await deleteTags("my-epic", "plan", { cwd: TEST_ROOT });

      const remaining = await listTags("my-epic", { cwd: TEST_ROOT });
      expect(remaining).toContain("beastmode/my-epic/design");
      expect(remaining).toContain("beastmode/my-epic/plan");
      expect(remaining).not.toContain("beastmode/my-epic/implement");
      expect(remaining).not.toContain("beastmode/my-epic/validate");
      expect(remaining).not.toContain("beastmode/my-epic/release");
    });

    test("handles missing tags gracefully", async () => {
      // No tags exist — should not throw
      await deleteTags("my-epic", "design", { cwd: TEST_ROOT });
    });

    test("ignores unknown phase", async () => {
      await createTag("my-epic", "design", { cwd: TEST_ROOT });
      await deleteTags("my-epic", "unknown-phase", { cwd: TEST_ROOT });
      const tags = await listTags("my-epic", { cwd: TEST_ROOT });
      expect(tags).toContain("beastmode/my-epic/design");
    });
  });

  describe("deleteAllTags", () => {
    test("deletes all tags for slug", async () => {
      await createTag("my-epic", "design", { cwd: TEST_ROOT });
      await createTag("my-epic", "plan", { cwd: TEST_ROOT });

      await deleteAllTags("my-epic", { cwd: TEST_ROOT });

      const tags = await listTags("my-epic", { cwd: TEST_ROOT });
      expect(tags).toHaveLength(0);
    });
  });

  describe("renameTags", () => {
    test("renames all tags from old slug to new slug", async () => {
      await createTag("abc123", "design", { cwd: TEST_ROOT });
      await createTag("abc123", "plan", { cwd: TEST_ROOT });

      await renameTags("abc123", "my-feature", { cwd: TEST_ROOT });

      const oldTags = await listTags("abc123", { cwd: TEST_ROOT });
      const newTags = await listTags("my-feature", { cwd: TEST_ROOT });

      expect(oldTags).toHaveLength(0);
      expect(newTags).toContain("beastmode/my-feature/design");
      expect(newTags).toContain("beastmode/my-feature/plan");
    });

    test("preserves SHA during rename", async () => {
      await createTag("abc123", "design", { cwd: TEST_ROOT });
      const originalSha = getTagSha("beastmode/abc123/design");

      await renameTags("abc123", "my-feature", { cwd: TEST_ROOT });
      const newSha = getTagSha("beastmode/my-feature/design");

      expect(newSha).toBe(originalSha);
    });

    test("handles no existing tags gracefully", async () => {
      await renameTags("nonexistent", "new-name", { cwd: TEST_ROOT });
      // No throw = success
    });
  });

  describe("listTags", () => {
    test("returns matching tags", async () => {
      await createTag("my-epic", "design", { cwd: TEST_ROOT });
      await createTag("my-epic", "plan", { cwd: TEST_ROOT });
      await createTag("other-epic", "design", { cwd: TEST_ROOT });

      const tags = await listTags("my-epic", { cwd: TEST_ROOT });
      expect(tags).toHaveLength(2);
      expect(tags).toContain("beastmode/my-epic/design");
      expect(tags).toContain("beastmode/my-epic/plan");
    });

    test("returns empty array when no tags", async () => {
      const tags = await listTags("nonexistent", { cwd: TEST_ROOT });
      expect(tags).toHaveLength(0);
    });
  });
});
