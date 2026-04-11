/**
 * session-start-hook.integration.test.ts — Integration tests for SessionStart hook.
 *
 * Tests the hook's end-to-end behavior: env vars → context assembly → JSON output.
 * Covers all 5 phases, error paths, and gate injection.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function createTestDir(): string {
  const dir = join(tmpdir(), `session-start-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, ".beastmode", "context"), { recursive: true });
  mkdirSync(join(dir, ".beastmode", "artifacts", "design"), { recursive: true });
  mkdirSync(join(dir, ".beastmode", "artifacts", "plan"), { recursive: true });
  mkdirSync(join(dir, ".beastmode", "artifacts", "implement"), { recursive: true });
  mkdirSync(join(dir, ".beastmode", "artifacts", "validate"), { recursive: true });
  mkdirSync(join(dir, ".beastmode", "artifacts", "release"), { recursive: true });
  mkdirSync(join(dir, ".beastmode", "state"), { recursive: true });
  writeFileSync(join(dir, ".beastmode", "BEASTMODE.md"), "# Beastmode\n\nL0 context content");
  writeFileSync(join(dir, ".beastmode", "context", "DESIGN.md"), "# Design Context\n\nDesign L1 content");
  writeFileSync(join(dir, ".beastmode", "context", "PLAN.md"), "# Plan Context\n\nPlan L1 content");
  writeFileSync(join(dir, ".beastmode", "context", "IMPLEMENT.md"), "# Implement Context\n\nImplement L1 content");
  writeFileSync(join(dir, ".beastmode", "context", "VALIDATE.md"), "# Validate Context\n\nValidate L1 content");
  writeFileSync(join(dir, ".beastmode", "context", "RELEASE.md"), "# Release Context\n\nRelease L1 content");
  return dir;
}

describe("SessionStart hook integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTestDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Phase context injection for each phase", () => {
    test("design phase injects L0 + L1 context with no parent artifacts", async () => {
      const { assembleContext } = await import("../hooks/session-start");
      const result = assembleContext({
        phase: "design",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      });
      expect(result).toContain("L0 context content");
      expect(result).toContain("Design L1 content");
    });

    test("plan phase injects L0 + L1 + design PRD content", async () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-test-epic.md"),
        "---\nphase: design\nepic: test-epic\n---\n\n# Design PRD\n\nDesign artifact content",
      );
      const { assembleContext } = await import("../hooks/session-start");
      const result = assembleContext({
        phase: "plan",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      });
      expect(result).toContain("L0 context content");
      expect(result).toContain("Plan L1 content");
      expect(result).toContain("Design artifact content");
    });

    test("implement phase injects L0 + L1 + feature plan content", async () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "plan", "2026-04-11-test-epic-my-feature.md"),
        "---\nphase: plan\nepic: test-epic\nfeature: my-feature\n---\n\n# Feature Plan\n\nFeature plan content",
      );
      const { assembleContext } = await import("../hooks/session-start");
      const result = assembleContext({
        phase: "implement",
        epic: "test-epic",
        slug: "abc123",
        feature: "my-feature",
        repoRoot: tempDir,
      });
      expect(result).toContain("L0 context content");
      expect(result).toContain("Implement L1 content");
      expect(result).toContain("Feature plan content");
    });

    test("validate phase injects L0 + L1 + implementation artifacts + gate status", async () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-test-epic-feat-a.md"),
        "---\nphase: implement\nepic: test-epic\nfeature: feat-a\nstatus: completed\n---\n\nImpl A content",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-test-epic-feat-b.md"),
        "---\nphase: implement\nepic: test-epic\nfeature: feat-b\nstatus: completed\n---\n\nImpl B content",
      );
      const { assembleContext } = await import("../hooks/session-start");
      const result = assembleContext({
        phase: "validate",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      });
      expect(result).toContain("L0 context content");
      expect(result).toContain("Validate L1 content");
      expect(result).toContain("Impl A content");
      expect(result).toContain("Impl B content");
      expect(result).toContain("Gate Status");
    });

    test("release phase injects L0 + L1 + all phase artifacts", async () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-test-epic.md"),
        "Design content for release",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "validate", "2026-04-11-test-epic.md"),
        "Validate content for release",
      );
      const { assembleContext } = await import("../hooks/session-start");
      const result = assembleContext({
        phase: "release",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      });
      expect(result).toContain("L0 context content");
      expect(result).toContain("Release L1 content");
      expect(result).toContain("Design content for release");
      expect(result).toContain("Validate content for release");
    });
  });

  describe("Fail-fast error paths", () => {
    test("missing phase throws", async () => {
      const { assembleContext } = await import("../hooks/session-start");
      expect(() => assembleContext({
        phase: "" as any,
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      })).toThrow();
    });

    test("missing epic throws", async () => {
      const { assembleContext } = await import("../hooks/session-start");
      expect(() => assembleContext({
        phase: "design",
        epic: "",
        slug: "abc123",
        repoRoot: tempDir,
      })).toThrow();
    });

    test("missing L1 context file throws", async () => {
      rmSync(join(tempDir, ".beastmode", "context", "DESIGN.md"));
      const { assembleContext } = await import("../hooks/session-start");
      expect(() => assembleContext({
        phase: "design",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      })).toThrow();
    });

    test("missing required parent artifact for plan phase throws", async () => {
      const { assembleContext } = await import("../hooks/session-start");
      expect(() => assembleContext({
        phase: "plan",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      })).toThrow();
    });
  });

  describe("Gate injection", () => {
    test("validate gate status indicates all features implemented", async () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-test-epic-feat-a.md"),
        "---\nphase: implement\nepic: test-epic\nfeature: feat-a\nstatus: completed\n---\n\nImpl content",
      );
      const { assembleContext } = await import("../hooks/session-start");
      const result = assembleContext({
        phase: "validate",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      });
      expect(result).toContain("Gate Status");
      expect(result).toMatch(/completed/i);
    });

    test("validate gate status indicates incomplete features without blocking", async () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-test-epic-feat-a.md"),
        "---\nphase: implement\nepic: test-epic\nfeature: feat-a\nstatus: completed\n---\n\nImpl A",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-test-epic-feat-b.md"),
        "---\nphase: implement\nepic: test-epic\nfeature: feat-b\nstatus: error\n---\n\nImpl B",
      );
      const { assembleContext } = await import("../hooks/session-start");
      // Should NOT throw — gate failures don't block
      const result = assembleContext({
        phase: "validate",
        epic: "test-epic",
        slug: "abc123",
        repoRoot: tempDir,
      });
      expect(result).toContain("Gate Status");
      expect(result).toMatch(/incomplete|not all|error/i);
    });
  });

  describe("Output format", () => {
    test("formatOutput produces valid JSON with hookSpecificOutput.additionalContext", async () => {
      const { formatOutput } = await import("../hooks/session-start");
      const json = formatOutput("some context markdown");
      const parsed = JSON.parse(json);
      expect(parsed.hookSpecificOutput).toBeDefined();
      expect(parsed.hookSpecificOutput.additionalContext).toBe("some context markdown");
    });
  });
});
