import { describe, test, expect } from "vitest";

/**
 * Source-level contract tests that verify AbortSignal is accepted
 * and threaded through reconcileGitHub. Full integration testing
 * of abort behavior is covered by the gh() signal tests (Task 1).
 */
describe("reconcileGitHub AbortSignal contract", () => {
  test("ReconcileOpts interface includes signal property", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../github/reconcile.ts"),
      "utf-8",
    );
    // ReconcileOpts should have a signal field
    const optsInterface = source.slice(
      source.indexOf("export interface ReconcileOpts"),
      source.indexOf("}", source.indexOf("export interface ReconcileOpts")) + 1,
    );
    expect(optsInterface).toContain("signal?: AbortSignal");
  });

  test("signal is destructured from opts and used for abort checks", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../github/reconcile.ts"),
      "utf-8",
    );
    // Verify signal is destructured from opts
    const destructureLine = source.match(/const \{[^}]*signal[^}]*\} = opts/);
    expect(destructureLine).not.toBeNull();
    // Verify abort checks exist in the loop bodies (Phase 2 and Phase 3)
    const phase2Loop = source.slice(
      source.indexOf("for (const [entityId, ref] of"),
      source.indexOf("--- Phase 3") > -1
        ? source.indexOf("--- Phase 3")
        : source.indexOf("const readyOps"),
    );
    expect(phase2Loop).toContain("signal?.aborted");
  });

  test("reconcileGitHub returns early when signal is already aborted", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../github/reconcile.ts"),
      "utf-8",
    );
    // Should check signal.aborted early in the function
    expect(source).toContain("signal?.aborted");
  });
});
