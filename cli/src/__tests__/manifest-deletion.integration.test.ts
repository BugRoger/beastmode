/**
 * Integration test: Manifest module removed after migration.
 *
 * Verifies that the manifest module has been deleted and no code
 * references manifest types or imports from the manifest module.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const CLI_SRC = resolve(import.meta.dirname, "..");

describe("@manifest-absorption: Manifest module removed after migration", () => {
  describe("Scenario: No manifest module exists after migration", () => {
    it("manifest/store.ts does not exist", () => {
      expect(existsSync(resolve(CLI_SRC, "manifest/store.ts"))).toBe(false);
    });

    it("manifest/pure.ts does not exist", () => {
      expect(existsSync(resolve(CLI_SRC, "manifest/pure.ts"))).toBe(false);
    });

    it("manifest/reconcile.ts does not exist", () => {
      expect(existsSync(resolve(CLI_SRC, "manifest/reconcile.ts"))).toBe(false);
    });

    it("no code imports from a manifest module", () => {
      const result = execSync(
        `grep -rl 'from.*manifest/' --include='*.ts' --include='*.tsx' ${CLI_SRC} || true`,
        { encoding: "utf-8" },
      ).trim();

      const remaining = result
        .split("\n")
        .filter(Boolean)
        .filter((f) => !f.includes("node_modules"))
        .filter((f) => !f.includes("manifest/"))
        .filter((f) => !f.includes("manifest-deletion.integration.test"));

      expect(remaining).toEqual([]);
    });
  });

  describe("Scenario: Manifest type references replaced with store types", () => {
    it("no PipelineManifest type references remain", () => {
      const result = execSync(
        `grep -rl 'PipelineManifest' --include='*.ts' --include='*.tsx' ${CLI_SRC} || true`,
        { encoding: "utf-8" },
      ).trim();

      const remaining = result
        .split("\n")
        .filter(Boolean)
        .filter((f) => !f.includes("node_modules"))
        .filter((f) => !f.includes("manifest/"))
        .filter((f) => !f.includes("manifest-deletion.integration.test"));

      expect(remaining).toEqual([]);
    });

    it("no ManifestFeature type references remain", () => {
      const result = execSync(
        `grep -rl 'ManifestFeature' --include='*.ts' --include='*.tsx' ${CLI_SRC} || true`,
        { encoding: "utf-8" },
      ).trim();

      const remaining = result
        .split("\n")
        .filter(Boolean)
        .filter((f) => !f.includes("node_modules"))
        .filter((f) => !f.includes("manifest/"));

      expect(remaining).toEqual([]);
    });

    it("no EnrichedManifest type references remain", () => {
      const result = execSync(
        `grep -rl 'EnrichedManifest' --include='*.ts' --include='*.tsx' ${CLI_SRC} || true`,
        { encoding: "utf-8" },
      ).trim();

      const remaining = result
        .split("\n")
        .filter(Boolean)
        .filter((f) => !f.includes("node_modules"))
        .filter((f) => !f.includes("manifest/"));

      expect(remaining).toEqual([]);
    });

    it("no ManifestGitHub type references remain", () => {
      const result = execSync(
        `grep -rl 'ManifestGitHub' --include='*.ts' --include='*.tsx' ${CLI_SRC} || true`,
        { encoding: "utf-8" },
      ).trim();

      const remaining = result
        .split("\n")
        .filter(Boolean)
        .filter((f) => !f.includes("node_modules"))
        .filter((f) => !f.includes("manifest/"));

      expect(remaining).toEqual([]);
    });
  });

  describe("Scenario: Pipeline operates without manifest module", () => {
    it("store module exports all needed types", async () => {
      const storeModule = await import("../store/index.js");
      expect(storeModule.JsonFileStore).toBeDefined();
      expect(storeModule.InMemoryTaskStore).toBeDefined();
      expect(storeModule.resolveIdentifier).toBeDefined();
      expect(storeModule.slugify).toBeDefined();
    });

    it("pipeline/reconcile.ts exports reconciliation functions", async () => {
      const reconcile = await import("../pipeline/reconcile.js");
      expect(reconcile.reconcileDesign).toBeDefined();
      expect(reconcile.reconcilePlan).toBeDefined();
      expect(reconcile.reconcileFeature).toBeDefined();
      expect(reconcile.reconcileImplement).toBeDefined();
      expect(reconcile.reconcileValidate).toBeDefined();
      expect(reconcile.reconcileRelease).toBeDefined();
    });
  });
});
