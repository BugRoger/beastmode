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
        "---\nphase: implement\nepic: my-epic\nfeature: feat-a\nstatus: completed\n---\n\nImpl A body",
      );
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toContain("Validate rules");
      expect(result).toContain("Impl A body");
      expect(result).toContain("Gate Status");
    });

    test("gate status shows all complete when all features completed", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f1\nstatus: completed\n---\n\nF1");
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f2.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f2\nstatus: completed\n---\n\nF2");
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toMatch(/all features.*completed/i);
    });

    test("gate status shows incomplete when features have non-completed status", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f1\nstatus: completed\n---\n\nF1");
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f2.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f2\nstatus: error\n---\n\nF2");
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toMatch(/incomplete|not all/i);
    });

    test("gate failure does not throw", () => {
      writeFileSync(join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f1\nstatus: error\n---\n\nF1");
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
      rmSync(join(tempDir, ".beastmode", "context", "PLAN.md"));
      expect(() => assembleContext({ phase: "plan", epic: "e", slug: "s", repoRoot: tempDir })).toThrow(/PLAN\.md/i);
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

    writeSessionStartHook({ claudeDir, phase: "plan", epicId: "my-epic", epicSlug: "abc123" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.SessionStart).toHaveLength(1);
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain("session-start");
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain("BEASTMODE_PHASE=plan");
  });

  test("cleanSessionStartHook removes SessionStart hook from settings", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "plan", epicId: "my-epic", epicSlug: "abc123" });
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

    writeSessionStartHook({ claudeDir, phase: "plan", epicId: "my-epic", epicSlug: "abc123" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
  });

  test("includes feature env var for implement phase", () => {
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "implement", epicId: "my-epic", epicSlug: "abc123", featureId: "my-feat", featureSlug: "my-feat" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    const command = settings.hooks.SessionStart[0].hooks[0].command;
    expect(command).toContain("BEASTMODE_FEATURE_ID=my-feat");
  });
});
