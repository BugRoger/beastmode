/**
 * session-start.test.ts — Unit tests for SessionStart hook core logic.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { assembleContext, formatOutput, computeOutputTarget, buildMetadataSection } from "../hooks/session-start";
import {
  writeSessionStartHook,
  cleanSessionStartHook,
} from "../hooks/hitl-settings";

describe("assembleContext", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `session-start-unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "context"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "design"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "plan"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "implement"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "validate"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "release"), { recursive: true });
    writeFileSync(join(tempDir, ".beastmode", "BEASTMODE.md"), "# Beastmode\n\nL0 persona and map");
    writeFileSync(join(tempDir, ".beastmode", "context", "DESIGN.md"), "# Design Context\n\nDesign rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "PLAN.md"), "# Plan Context\n\nPlan rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "IMPLEMENT.md"), "# Implement Context\n\nImplement rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "VALIDATE.md"), "# Validate Context\n\nValidate rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "RELEASE.md"), "# Release Context\n\nRelease rules");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("design phase", () => {
    test("includes L0 and L1 context", () => {
      const result = assembleContext({ phase: "design", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toContain("L0 persona and map");
      expect(result).toContain("Design rules");
    });

    test("does not include parent artifacts", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "design", "2026-01-01-my-epic.md"), "should not appear");
      const result = assembleContext({ phase: "design", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).not.toContain("should not appear");
    });
  });

  describe("plan phase", () => {
    test("includes L0, L1, and design PRD content", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"),
        "---\nphase: design\nepic: my-epic\n---\n\n# My PRD\n\nPRD body text",
      );
      const result = assembleContext({ phase: "plan", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toContain("L0 persona and map");
      expect(result).toContain("Plan rules");
      expect(result).toContain("PRD body text");
    });

    test("takes latest design artifact by date prefix", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "design", "2026-01-01-my-epic.md"), "old PRD content");
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"), "latest PRD content");
      const result = assembleContext({ phase: "plan", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toContain("latest PRD content");
      expect(result).not.toContain("old PRD content");
    });

    test("throws when no design artifact exists", () => {
      expect(() => assembleContext({ phase: "plan", epic: "my-epic", slug: "abc123", repoRoot: tempDir })).toThrow(/design artifact/i);
    });
  });

  describe("implement phase", () => {
    test("includes L0, L1, and feature plan content", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "plan", "2026-04-11-my-epic-my-feature.md"),
        "---\nphase: plan\nepic: my-epic\nfeature: my-feature\n---\n\n# Feature Plan\n\nPlan body",
      );
      const result = assembleContext({ phase: "implement", epic: "my-epic", slug: "abc123", feature: "my-feature", repoRoot: tempDir });
      expect(result).toContain("L0 persona and map");
      expect(result).toContain("Implement rules");
      expect(result).toContain("Plan body");
    });

    test("throws when no feature plan exists", () => {
      expect(() => assembleContext({ phase: "implement", epic: "my-epic", slug: "abc123", feature: "my-feature", repoRoot: tempDir })).toThrow(/plan artifact/i);
    });

    test("throws when feature is missing for implement phase", () => {
      expect(() => assembleContext({ phase: "implement", epic: "my-epic", slug: "abc123", repoRoot: tempDir })).toThrow(/feature/i);
    });
  });

  describe("validate phase", () => {
    test("includes L0, L1, implementation artifacts, and gate status", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-feat-a.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: feat-a\nstatus: completed\n---\n\nImpl A body",
      );
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toContain("Validate rules");
      expect(result).toContain("Impl A body");
      expect(result).toContain("Gate Status");
    });

    test("gate status shows all complete when all features completed", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: f1\nstatus: completed\n---\n\nF1");
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f2.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: f2\nstatus: completed\n---\n\nF2");
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toMatch(/all features.*completed/i);
    });

    test("gate status shows incomplete when features have non-completed status", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: f1\nstatus: completed\n---\n\nF1");
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f2.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: f2\nstatus: error\n---\n\nF2");
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toMatch(/incomplete|not all/i);
    });

    test("gate failure does not throw", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: f1\nstatus: error\n---\n\nF1");
      expect(() => assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir })).not.toThrow();
    });
  });

  describe("release phase", () => {
    test("includes L0, L1, and artifacts from design, plan, validate", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"), "Design release content");
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "validate", "2026-04-11-my-epic.md"), "Validate release content");
      const result = assembleContext({ phase: "release", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toContain("Release rules");
      expect(result).toContain("Design release content");
      expect(result).toContain("Validate release content");
    });
  });

  describe("error handling", () => {
    test("throws on missing phase", () => {
      expect(() => assembleContext({ phase: "" as any, epic: "e", slug: "s", repoRoot: tempDir })).toThrow(/phase/i);
    });

    test("throws on missing epic", () => {
      expect(() => assembleContext({ phase: "design", epic: "", slug: "s", repoRoot: tempDir })).toThrow(/epic/i);
    });

    test("throws on missing slug", () => {
      expect(() => assembleContext({ phase: "design", epic: "e", slug: "", repoRoot: tempDir })).toThrow(/slug/i);
    });

    test("throws on missing L0 context file", () => {
      rmSync(join(tempDir, ".beastmode", "BEASTMODE.md"));
      expect(() => assembleContext({ phase: "design", epic: "e", slug: "s", repoRoot: tempDir })).toThrow(/BEASTMODE\.md/i);
    });

    test("throws on missing L1 context file", () => {
      rmSync(join(tempDir, ".beastmode", "context", "DESIGN.md"));
      expect(() => assembleContext({ phase: "design", epic: "e", slug: "s", repoRoot: tempDir })).toThrow(/DESIGN\.md/i);
    });
  });

  describe("output format", () => {
    test("formatOutput produces valid JSON with hookSpecificOutput.additionalContext", () => {
      const json = formatOutput("some context");
      const parsed = JSON.parse(json);
      expect(parsed.hookSpecificOutput).toBeDefined();
      expect(parsed.hookSpecificOutput.additionalContext).toBe("some context");
    });
  });

  describe("metadata section", () => {
    test("assembleContext accepts epicId and featureId in input", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "plan", "2026-04-11-my-epic-my-feature.md"),
        "---\nphase: plan\nepic: my-epic\nfeature: my-feature\n---\n\n# Plan\n\nPlan body",
      );
      const result = assembleContext({
        phase: "implement",
        epic: "my-epic",
        slug: "my-epic-abc123",
        feature: "my-feature",
        epicId: "bm-f3a7",
        featureId: "bm-f3a7.1",
        repoRoot: tempDir,
      });
      expect(result).toContain("Plan body");
    });

    test("design phase includes metadata section at top of additionalContext", () => {
      const result = assembleContext({
        phase: "design",
        epic: "my-epic",
        slug: "my-epic-abc123",
        epicId: "bm-f3a7",
        repoRoot: tempDir,
      });
      expect(result).toMatch(/^---\nphase: design/);
      expect(result).toContain("epic-id: bm-f3a7");
      expect(result).toContain("epic-slug: my-epic-abc123");
      expect(result).toContain("output-target: .beastmode/artifacts/design/");
      // L0 context should come after metadata section
      const metaEndIndex = result.indexOf("---\n\n---\n\n");
      const l0Start = result.indexOf("L0 persona and map");
      expect(metaEndIndex).toBeLessThan(l0Start);
    });

    test("plan phase metadata lists parent artifact filename", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"),
        "---\nphase: design\nepic: my-epic\n---\n\nPRD content",
      );
      const result = assembleContext({
        phase: "plan",
        epic: "my-epic",
        slug: "my-epic-abc123",
        epicId: "bm-f3a7",
        repoRoot: tempDir,
      });
      expect(result).toContain("parent-artifacts:");
      expect(result).toContain("2026-04-11-my-epic.md");
      expect(result).toContain("epic-slug: my-epic-abc123");
    });

    test("implement phase metadata includes feature fields", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "plan", "2026-04-11-my-epic-my-feature.md"),
        "---\nphase: plan\n---\n\nPlan content",
      );
      const result = assembleContext({
        phase: "implement",
        epic: "my-epic",
        slug: "my-epic-abc123",
        feature: "my-feature",
        epicId: "bm-f3a7",
        featureId: "bm-f3a7.1",
        repoRoot: tempDir,
      });
      expect(result).toContain("feature-id: bm-f3a7.1");
      expect(result).toContain("feature-slug: my-feature");
      expect(result).toContain("2026-04-11-my-epic-my-feature.md");
    });

    test("validate phase metadata lists all implement artifact filenames", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-feat-a.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: feat-a\nstatus: completed\n---\n\nImpl A",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-feat-b.md"),
        "---\nphase: implement\nepic-slug: my-epic\nfeature-slug: feat-b\nstatus: completed\n---\n\nImpl B",
      );
      const result = assembleContext({
        phase: "validate",
        epic: "my-epic",
        slug: "my-epic-abc123",
        epicId: "bm-f3a7",
        repoRoot: tempDir,
      });
      expect(result).toContain("2026-04-11-my-epic-feat-a.md");
      expect(result).toContain("2026-04-11-my-epic-feat-b.md");
    });

    test("metadata section omits feature fields for non-implement phases", () => {
      const result = assembleContext({
        phase: "design",
        epic: "my-epic",
        slug: "my-epic-abc123",
        epicId: "bm-f3a7",
        repoRoot: tempDir,
      });
      expect(result).not.toContain("feature-id:");
      expect(result).not.toContain("feature-slug:");
    });

    test("existing context sections (L0, L1, artifacts) remain unchanged", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"),
        "---\nphase: design\n---\n\nPRD content here",
      );
      const result = assembleContext({
        phase: "plan",
        epic: "my-epic",
        slug: "my-epic-abc123",
        epicId: "bm-f3a7",
        repoRoot: tempDir,
      });
      expect(result).toContain("L0 persona and map");
      expect(result).toContain("Plan rules");
      expect(result).toContain("PRD content here");
    });

    test("metadata output-target path uses correct format", () => {
      const result = assembleContext({
        phase: "design",
        epic: "my-epic",
        slug: "my-epic-abc123",
        repoRoot: tempDir,
      });
      const today = new Date().toISOString().split("T")[0];
      expect(result).toContain(`output-target: .beastmode/artifacts/design/${today}-my-epic-abc123.md`);
    });
  });
});

describe("session-start settings writer", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `session-start-settings-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("writeSessionStartHook adds SessionStart hook to settings.local.json", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "plan", epicId: "bm-f3a7", epicSlug: "my-epic-abc123" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.SessionStart).toHaveLength(1);
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain("session-start");
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain("BEASTMODE_PHASE=plan");
  });

  test("cleanSessionStartHook removes SessionStart hook from settings", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "plan", epicId: "bm-f3a7", epicSlug: "my-epic-abc123" });
    cleanSessionStartHook(claudeDir);

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks?.SessionStart).toBeUndefined();
  });

  test("preserves existing hooks when writing SessionStart hook", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, "settings.local.json"), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "AskUserQuestion", hooks: [{ type: "command", command: "existing" }] }] }
    }, null, 2));

    writeSessionStartHook({ claudeDir, phase: "plan", epicId: "bm-f3a7", epicSlug: "my-epic-abc123" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
  });

  test("includes feature env vars for implement phase", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "implement", epicId: "bm-f3a7", epicSlug: "my-epic-abc123", featureId: "bm-f3a7.1", featureSlug: "my-feat" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    const command = settings.hooks.SessionStart[0].hooks[0].command;
    expect(command).toContain("BEASTMODE_FEATURE_ID=bm-f3a7.1");
    expect(command).toContain("BEASTMODE_FEATURE_SLUG=my-feat");
  });
});

describe("computeOutputTarget", () => {
  test("design phase returns design artifact path", () => {
    const result = computeOutputTarget("design", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/design/${today}-dashboard-redesign-f3a7.md`);
  });

  test("plan phase returns plan artifact path", () => {
    const result = computeOutputTarget("plan", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/plan/${today}-dashboard-redesign-f3a7.md`);
  });

  test("implement phase includes feature slug", () => {
    const result = computeOutputTarget("implement", "dashboard-redesign-f3a7", "auth-flow-1");
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/implement/${today}-dashboard-redesign-f3a7--auth-flow-1.md`);
  });

  test("validate phase returns validate artifact path", () => {
    const result = computeOutputTarget("validate", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/validate/${today}-dashboard-redesign-f3a7.md`);
  });

  test("release phase returns release artifact path", () => {
    const result = computeOutputTarget("release", "dashboard-redesign-f3a7", undefined);
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(`.beastmode/artifacts/release/${today}-dashboard-redesign-f3a7.md`);
  });
});

describe("buildMetadataSection", () => {
  test("includes phase and epic fields", () => {
    const result = buildMetadataSection({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: [],
      outputTarget: ".beastmode/artifacts/design/2026-04-11-dashboard-redesign-f3a7.md",
    });
    expect(result).toContain("phase: design");
    expect(result).toContain("epic-id: bm-f3a7");
    expect(result).toContain("epic-slug: dashboard-redesign-f3a7");
    expect(result).toContain("output-target: .beastmode/artifacts/design/2026-04-11-dashboard-redesign-f3a7.md");
  });

  test("includes feature fields for implement phase", () => {
    const result = buildMetadataSection({
      phase: "implement",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      featureId: "bm-f3a7.1",
      featureSlug: "auth-flow-1",
      parentArtifacts: ["2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md"],
      outputTarget: ".beastmode/artifacts/implement/2026-04-11-dashboard-redesign-f3a7-auth-flow-1.md",
    });
    expect(result).toContain("feature-id: bm-f3a7.1");
    expect(result).toContain("feature-slug: auth-flow-1");
  });

  test("omits feature fields when not provided", () => {
    const result = buildMetadataSection({
      phase: "plan",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: ["2026-04-11-dashboard-redesign-f3a7.md"],
      outputTarget: ".beastmode/artifacts/plan/2026-04-11-dashboard-redesign-f3a7.md",
    });
    expect(result).not.toContain("feature-id:");
    expect(result).not.toContain("feature-slug:");
  });

  test("lists parent artifact filenames", () => {
    const result = buildMetadataSection({
      phase: "validate",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: ["2026-04-11-dashboard-redesign-f3a7-auth.md", "2026-04-11-dashboard-redesign-f3a7-billing.md"],
      outputTarget: ".beastmode/artifacts/validate/2026-04-11-dashboard-redesign-f3a7.md",
    });
    expect(result).toContain("  - 2026-04-11-dashboard-redesign-f3a7-auth.md");
    expect(result).toContain("  - 2026-04-11-dashboard-redesign-f3a7-billing.md");
  });

  test("is delimited with YAML fences", () => {
    const result = buildMetadataSection({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      parentArtifacts: [],
      outputTarget: ".beastmode/artifacts/design/2026-04-11-dashboard-redesign-f3a7.md",
    });
    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[lines.length - 1]).toBe("---");
  });
});
