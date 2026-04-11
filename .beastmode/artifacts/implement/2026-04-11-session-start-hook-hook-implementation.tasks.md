# Hook Implementation — Write Plan

## Goal

Build `session-start.ts` in `cli/src/hooks/` — a SessionStart hook that assembles phase context (L0 + L1), resolves parent artifacts, evaluates gates, and outputs JSON with `hookSpecificOutput.additionalContext`. Register it in the hooks command router. Add settings writer. Full unit test coverage.

## Architecture

- **Hook communication:** Claude Code `SessionStart` event with `additionalContext` injection
- **Hook input:** Environment variables `BEASTMODE_PHASE`, `BEASTMODE_EPIC`, `BEASTMODE_SLUG`, optionally `BEASTMODE_FEATURE`
- **Repo root:** Derived from `git rev-parse --show-toplevel`
- **Output:** `{ hookSpecificOutput: { additionalContext: "<markdown>" } }` to stdout
- **Error handling:** Missing env vars, context files, or required artifacts → exit non-zero
- **Gates:** Validate phase injects gate status section; gates are pass-through (don't block)

## Tech Stack

- TypeScript, Bun runtime
- vitest for unit tests
- Existing hook patterns: `hitl-auto.ts`, `generate-output.ts` in `cli/src/hooks/`
- Settings writer pattern: `hitl-settings.ts`, `file-permission-settings.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/hooks/session-start.ts` | Create | Core hook logic — pure function + CLI entry point |
| `cli/src/commands/hooks.ts` | Modify | Register `session-start` in VALID_HOOKS and switch |
| `cli/src/hooks/hitl-settings.ts` | Modify | Add `writeSessionStartHook()` and `cleanSessionStartHook()` |
| `cli/src/commands/phase.ts` | Modify | Call `writeSessionStartHook()` in cmux path |
| `cli/src/pipeline/runner.ts` | Modify | Call `writeSessionStartHook()` in step 3 |
| `cli/src/__tests__/session-start.test.ts` | Create | Unit tests for all phases, error paths, gate injection |
| `cli/src/__tests__/session-start-hook.integration.test.ts` | Create | Integration test — end-to-end hook execution |

---

## Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

Create a vitest integration test that exercises the hook end-to-end. Expected to FAIL after this task (RED state — the hook module doesn't exist yet).

**Files:**
- Create: `cli/src/__tests__/session-start-hook.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
/**
 * session-start-hook.integration.test.ts — Integration tests for SessionStart hook.
 *
 * Tests the hook's end-to-end behavior: env vars → context assembly → JSON output.
 * Covers all 5 phases, error paths, and gate injection.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Will import from ../hooks/session-start once implemented
// import { assembleContext, type SessionStartInput } from "../hooks/session-start";

describe("SessionStart hook integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `session-start-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    // Create .beastmode structure
    mkdirSync(join(tempDir, ".beastmode", "context"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "design"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "plan"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "implement"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "validate"), { recursive: true });
    mkdirSync(join(tempDir, ".beastmode", "state"), { recursive: true });

    // L0 context
    writeFileSync(join(tempDir, ".beastmode", "BEASTMODE.md"), "# Beastmode\n\nL0 context content");
    // L1 context files
    writeFileSync(join(tempDir, ".beastmode", "context", "DESIGN.md"), "# Design Context\n\nDesign L1 content");
    writeFileSync(join(tempDir, ".beastmode", "context", "PLAN.md"), "# Plan Context\n\nPlan L1 content");
    writeFileSync(join(tempDir, ".beastmode", "context", "IMPLEMENT.md"), "# Implement Context\n\nImplement L1 content");
    writeFileSync(join(tempDir, ".beastmode", "context", "VALIDATE.md"), "# Validate Context\n\nValidate L1 content");
    writeFileSync(join(tempDir, ".beastmode", "context", "RELEASE.md"), "# Release Context\n\nRelease L1 content");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Phase context injection for each phase", () => {
    test("design phase injects L0 + L1 context with no parent artifacts", async () => {
      // Import will fail until module exists — this is the RED state
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
        "---\nphase: design\nepic: test-epic\n---\n\nDesign content",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "validate", "2026-04-11-test-epic.md"),
        "---\nphase: validate\nepic: test-epic\nstatus: completed\n---\n\nValidate content",
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
      expect(result).toContain("Design content");
      expect(result).toContain("Validate content");
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
      // No design artifact exists
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
      expect(result).toMatch(/all.*implemented|complete/i);
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
      expect(result).toMatch(/incomplete|error|pending/i);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start-hook.integration.test.ts`
Expected: FAIL — module `../hooks/session-start` does not exist

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/session-start-hook.integration.test.ts
git commit -m "test(session-start-hook): add integration test (RED)"
```

---

## Task 1: Core Hook Module

**Wave:** 1
**Depends on:** -

Create the core `session-start.ts` module with the `assembleContext` pure function and `runSessionStart` CLI entry point.

**Files:**
- Create: `cli/src/hooks/session-start.ts`

- [ ] **Step 1: Write the unit test**

Create `cli/src/__tests__/session-start.test.ts`:

```typescript
/**
 * session-start.test.ts — Unit tests for SessionStart hook core logic.
 *
 * Tests the assembleContext function for each phase's context output shape,
 * error paths, and gate injection.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { assembleContext } from "../hooks/session-start";

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
    // L0
    writeFileSync(join(tempDir, ".beastmode", "BEASTMODE.md"), "# Beastmode\n\nL0 persona and map");
    // L1 for all phases
    writeFileSync(join(tempDir, ".beastmode", "context", "DESIGN.md"), "# Design Context\n\nDesign rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "PLAN.md"), "# Plan Context\n\nPlan rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "IMPLEMENT.md"), "# Implement Context\n\nImplement rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "VALIDATE.md"), "# Validate Context\n\nValidate rules");
    writeFileSync(join(tempDir, ".beastmode", "context", "RELEASE.md"), "# Release Context\n\nRelease rules");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  // --- Phase output shape ---

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
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-01-01-my-epic.md"),
        "old PRD content",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"),
        "latest PRD content",
      );
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

    test("gate status shows all complete when all features have status completed", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f1\nstatus: completed\n---\n\nF1",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f2.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f2\nstatus: completed\n---\n\nF2",
      );
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toMatch(/all features.*completed|all.*implemented/i);
    });

    test("gate status shows incomplete when features have non-completed status", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f1\nstatus: completed\n---\n\nF1",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f2.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f2\nstatus: error\n---\n\nF2",
      );
      const result = assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toMatch(/incomplete|not all|error/i);
    });

    test("gate failure does not throw", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "implement", "2026-04-11-my-epic-f1.md"),
        "---\nphase: implement\nepic: my-epic\nfeature: f1\nstatus: error\n---\n\nF1",
      );
      // Should not throw — gate failures are pass-through
      expect(() => assembleContext({ phase: "validate", epic: "my-epic", slug: "abc123", repoRoot: tempDir })).not.toThrow();
    });
  });

  describe("release phase", () => {
    test("includes L0, L1, and artifacts from design, plan, validate", () => {
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "design", "2026-04-11-my-epic.md"),
        "Design release content",
      );
      writeFileSync(
        join(tempDir, ".beastmode", "artifacts", "validate", "2026-04-11-my-epic.md"),
        "Validate release content",
      );
      const result = assembleContext({ phase: "release", epic: "my-epic", slug: "abc123", repoRoot: tempDir });
      expect(result).toContain("Release rules");
      expect(result).toContain("Design release content");
      expect(result).toContain("Validate release content");
    });
  });

  // --- Error paths ---

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

  // --- Output format ---

  describe("output format", () => {
    test("formatOutput produces valid JSON with hookSpecificOutput.additionalContext", () => {
      const { formatOutput } = require("../hooks/session-start");
      const json = formatOutput("some context");
      const parsed = JSON.parse(json);
      expect(parsed.hookSpecificOutput).toBeDefined();
      expect(parsed.hookSpecificOutput.additionalContext).toBe("some context");
    });
  });
});
```

- [ ] **Step 2: Write the implementation**

Create `cli/src/hooks/session-start.ts`:

```typescript
/**
 * session-start.ts — SessionStart hook for phase context injection.
 *
 * Reads environment variables, assembles L0 + L1 context, resolves parent
 * artifacts per phase, evaluates gates, and outputs JSON with additionalContext.
 *
 * Pure function core (assembleContext) for testability.
 * CLI entry point (runSessionStart) for hook execution.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { parseFrontmatter } from "./generate-output.js";

// --- Types ---

export interface SessionStartInput {
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
  repoRoot: string;
}

const VALID_PHASES = ["design", "plan", "implement", "validate", "release"];

// --- Core Logic ---

/**
 * Assemble the full context string for a given phase.
 * Throws on missing required inputs, context files, or artifacts.
 */
export function assembleContext(input: SessionStartInput): string {
  const { phase, epic, slug, feature, repoRoot } = input;

  // Validate required inputs
  if (!phase || !VALID_PHASES.includes(phase)) {
    throw new Error(`Missing or invalid phase: "${phase}". Valid phases: ${VALID_PHASES.join(", ")}`);
  }
  if (!epic) throw new Error("Missing required input: epic");
  if (!slug) throw new Error("Missing required input: slug");
  if (phase === "implement" && !feature) {
    throw new Error("Missing required input: feature (required for implement phase)");
  }

  const beastmodeDir = join(repoRoot, ".beastmode");
  const sections: string[] = [];

  // L0 context
  const l0Path = join(beastmodeDir, "BEASTMODE.md");
  if (!existsSync(l0Path)) {
    throw new Error(`L0 context file not found: BEASTMODE.md`);
  }
  sections.push(readFileSync(l0Path, "utf-8"));

  // L1 context
  const l1Filename = `${phase.toUpperCase()}.md`;
  const l1Path = join(beastmodeDir, "context", l1Filename);
  if (!existsSync(l1Path)) {
    throw new Error(`L1 context file not found: ${l1Filename}`);
  }
  sections.push(readFileSync(l1Path, "utf-8"));

  // Phase-specific artifact resolution
  const artifactsDir = join(beastmodeDir, "artifacts");
  const artifacts = resolveArtifacts(phase, epic, feature, artifactsDir);
  if (artifacts.length > 0) {
    sections.push(...artifacts);
  }

  // Gate evaluation (validate phase only)
  if (phase === "validate") {
    const gateSection = evaluateGates(epic, artifactsDir);
    sections.push(gateSection);
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Resolve parent artifacts for the given phase.
 * Returns array of artifact content strings.
 * Throws if a required artifact is missing.
 */
function resolveArtifacts(
  phase: string,
  epic: string,
  feature: string | undefined,
  artifactsDir: string,
): string[] {
  switch (phase) {
    case "design":
      // No parent artifacts
      return [];

    case "plan": {
      // Glob: .beastmode/artifacts/design/*-$epic.md — take latest by date prefix
      const designDir = join(artifactsDir, "design");
      const artifact = findLatestArtifact(designDir, epic);
      if (!artifact) {
        throw new Error(`No design artifact found for epic "${epic}". Expected pattern: *-${epic}.md in ${designDir}`);
      }
      return [readFileSync(artifact, "utf-8")];
    }

    case "implement": {
      // Glob: .beastmode/artifacts/plan/*-$epic-$feature.md — take latest by date prefix
      const planDir = join(artifactsDir, "plan");
      const pattern = `${epic}-${feature}`;
      const artifact = findLatestArtifact(planDir, pattern);
      if (!artifact) {
        throw new Error(`No plan artifact found for feature "${feature}" of epic "${epic}". Expected pattern: *-${pattern}.md in ${planDir}`);
      }
      return [readFileSync(artifact, "utf-8")];
    }

    case "validate": {
      // All implementation artifacts for the epic
      const implDir = join(artifactsDir, "implement");
      return findAllArtifacts(implDir, epic);
    }

    case "release": {
      // All phase artifacts across design, plan, validate
      const results: string[] = [];
      for (const subdir of ["design", "plan", "validate"]) {
        const phaseDir = join(artifactsDir, subdir);
        results.push(...findAllArtifacts(phaseDir, epic));
      }
      return results;
    }

    default:
      return [];
  }
}

/**
 * Find the latest artifact matching *-{suffix}.md in a directory.
 * Files are sorted lexicographically (date prefix ensures chronological order).
 * Returns the full path or undefined.
 */
function findLatestArtifact(dir: string, suffix: string): string | undefined {
  if (!existsSync(dir)) return undefined;

  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.endsWith(`-${suffix}.md`))
    .sort();

  if (candidates.length === 0) return undefined;
  return join(dir, candidates[candidates.length - 1]);
}

/**
 * Find all .md artifacts in a directory whose filename contains the epic name.
 * Returns an array of file contents.
 */
function findAllArtifacts(dir: string, epic: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.includes(epic))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf-8"));
}

/**
 * Evaluate gates for the validate phase.
 * Checks implementation artifacts for completion status.
 * Returns a markdown section with gate results.
 */
function evaluateGates(epic: string, artifactsDir: string): string {
  const implDir = join(artifactsDir, "implement");
  if (!existsSync(implDir)) {
    return "## Gate Status\n\nNo implementation artifacts found.";
  }

  const features: Array<{ name: string; status: string }> = [];
  for (const filename of readdirSync(implDir)) {
    if (!filename.endsWith(".md") || !filename.includes(epic)) continue;
    // Skip .tasks.md files
    if (filename.endsWith(".tasks.md")) continue;

    const content = readFileSync(join(implDir, filename), "utf-8");
    const fm = parseFrontmatter(content);
    if (fm.feature) {
      features.push({ name: fm.feature, status: fm.status ?? "unknown" });
    }
  }

  if (features.length === 0) {
    return "## Gate Status\n\nNo feature implementation artifacts found.";
  }

  const allCompleted = features.every((f) => f.status === "completed");
  const statusLines = features.map((f) => `- ${f.name}: ${f.status}`).join("\n");

  const summary = allCompleted
    ? "All features completed."
    : `Incomplete: not all features have completed status.`;

  return `## Gate Status\n\n${summary}\n\n${statusLines}`;
}

// --- Output Formatting ---

/**
 * Format the assembled context into the SessionStart hook JSON output.
 */
export function formatOutput(context: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      additionalContext: context,
    },
  });
}

// --- CLI Entry Point ---

/**
 * Run the session-start hook from CLI invocation.
 * Reads env vars, calls assembleContext, writes JSON to stdout.
 * Exits non-zero on any error.
 */
export function runSessionStart(repoRoot: string): void {
  const phase = process.env.BEASTMODE_PHASE;
  const epic = process.env.BEASTMODE_EPIC;
  const slug = process.env.BEASTMODE_SLUG;
  const feature = process.env.BEASTMODE_FEATURE;

  if (!phase) throw new Error("Missing environment variable: BEASTMODE_PHASE");
  if (!epic) throw new Error("Missing environment variable: BEASTMODE_EPIC");
  if (!slug) throw new Error("Missing environment variable: BEASTMODE_SLUG");

  const context = assembleContext({ phase, epic, slug, feature, repoRoot });
  process.stdout.write(formatOutput(context));
}
```

- [ ] **Step 3: Run unit tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start.test.ts`
Expected: PASS

- [ ] **Step 4: Run integration tests to verify progress**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start-hook.integration.test.ts`
Expected: Most tests PASS (tests that exercise assembleContext)

- [ ] **Step 5: Commit**

```bash
git add cli/src/hooks/session-start.ts cli/src/__tests__/session-start.test.ts
git commit -m "feat(session-start-hook): add core assembleContext function and unit tests"
```

---

## Task 2: CLI Router Registration

**Wave:** 2
**Depends on:** Task 1

Register `session-start` in the hooks command router so it can be invoked via `bunx beastmode hooks session-start`.

**Files:**
- Modify: `cli/src/commands/hooks.ts`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/session-start.test.ts` a test verifying the router recognizes `session-start`:

```typescript
// In describe("runSessionStart CLI entry", () => {...})
describe("hooks command router", () => {
  test("VALID_HOOKS includes session-start", async () => {
    // Verify via import that session-start is recognized
    const hooksModule = await import("../commands/hooks");
    // The module doesn't export VALID_HOOKS, but we can check the behavior:
    // calling hooksCommand(["session-start"]) with env vars should not exit(1) for unknown hook
    // This is tested implicitly via the integration test
  });
});
```

Actually, the router test is best done via the integration test. Skip the unit test addition — proceed directly to implementation.

- [ ] **Step 2: Modify hooks.ts to add session-start**

In `cli/src/commands/hooks.ts`, add the import and switch case:

Add import:
```typescript
import { runSessionStart } from "../hooks/session-start.js";
```

Update `VALID_HOOKS`:
```typescript
const VALID_HOOKS = ["hitl-auto", "hitl-log", "generate-output", "session-start"];
```

Add switch case (after `generate-output` case):
```typescript
case "session-start":
  runSessionStartHook();
  break;
```

Add the handler function:
```typescript
function runSessionStartHook(): void {
  const repoRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
  }).trim();
  runSessionStart(repoRoot);
}
```

Note: Unlike other hooks that silently exit 0, `session-start` should propagate errors. The `try/catch` around the switch already catches and exits 0, but for `session-start`, errors should cause non-zero exit. Move the `session-start` case BEFORE the try/catch, or rethrow.

Actually, re-reading hooks.ts: the try/catch wraps all hook executions and `process.exit(0)` is called after. For session-start, errors must cause non-zero exit. Solution: have `runSessionStart` call `process.exit(1)` on error internally, or add special handling in the switch.

Better approach: handle `session-start` before the main try/catch block since it has different exit behavior:

```typescript
// Session-start hook has different exit semantics — errors must cause non-zero exit
if (hookName === "session-start") {
  try {
    runSessionStartHook();
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`session-start hook failed: ${message}\n`);
    process.exit(1);
  }
}
```

- [ ] **Step 3: Run existing hook tests to verify no regression**

Run: `cd cli && bun --bun vitest run src/__tests__/hitl-auto.test.ts`
Expected: PASS (no regression)

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/hooks.ts
git commit -m "feat(session-start-hook): register session-start in hooks command router"
```

---

## Task 3: Settings Writer

**Wave:** 2
**Depends on:** Task 1

Add `writeSessionStartHook()`, `cleanSessionStartHook()`, and `buildSessionStartHook()` to `hitl-settings.ts` for registering the SessionStart hook in `settings.local.json`.

**Files:**
- Modify: `cli/src/hooks/hitl-settings.ts`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/session-start.test.ts`:

```typescript
describe("session-start settings writer", () => {
  test("writeSessionStartHook adds SessionStart hook to settings.local.json", () => {
    const { writeSessionStartHook } = require("../hooks/hitl-settings");
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "plan", epic: "my-epic", slug: "abc123" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.SessionStart).toHaveLength(1);
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain("session-start");
    expect(settings.hooks.SessionStart[0].hooks[0].command).toContain("BEASTMODE_PHASE=plan");
  });

  test("cleanSessionStartHook removes SessionStart hook from settings", () => {
    const { writeSessionStartHook, cleanSessionStartHook } = require("../hooks/hitl-settings");
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "plan", epic: "my-epic", slug: "abc123" });
    cleanSessionStartHook(claudeDir);

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks.SessionStart).toBeUndefined();
  });

  test("preserves existing hooks when writing SessionStart hook", () => {
    const { writeSessionStartHook } = require("../hooks/hitl-settings");
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, "settings.local.json"), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "AskUserQuestion", hooks: [{ type: "command", command: "existing" }] }] }
    }, null, 2));

    writeSessionStartHook({ claudeDir, phase: "plan", epic: "my-epic", slug: "abc123" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
  });

  test("includes feature env var for implement phase", () => {
    const { writeSessionStartHook } = require("../hooks/hitl-settings");
    const claudeDir = join(tempDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });

    writeSessionStartHook({ claudeDir, phase: "implement", epic: "my-epic", slug: "abc123", feature: "my-feat" });

    const settings = JSON.parse(readFileSync(join(claudeDir, "settings.local.json"), "utf-8"));
    const command = settings.hooks.SessionStart[0].hooks[0].command;
    expect(command).toContain("BEASTMODE_FEATURE=my-feat");
  });
});
```

- [ ] **Step 2: Implement the settings writer functions**

Add to `cli/src/hooks/hitl-settings.ts`:

Types:
```typescript
export interface WriteSessionStartHookOptions {
  claudeDir: string;
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
}
```

Functions:
```typescript
/**
 * Build the SessionStart command hook entry.
 * Sets BEASTMODE_* env vars inline and calls the session-start subcommand.
 */
export function buildSessionStartHook(opts: { phase: string; epic: string; slug: string; feature?: string }): HookEntry {
  const envParts = [
    `BEASTMODE_PHASE=${opts.phase}`,
    `BEASTMODE_EPIC=${opts.epic}`,
    `BEASTMODE_SLUG=${opts.slug}`,
  ];
  if (opts.feature) {
    envParts.push(`BEASTMODE_FEATURE=${opts.feature}`);
  }
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `${envParts.join(" ")} bunx beastmode hooks session-start`,
      },
    ],
  };
}

/**
 * Write SessionStart hook to settings.local.json.
 * Preserves all existing keys and replaces only the SessionStart hook.
 */
export function writeSessionStartHook(options: WriteSessionStartHookOptions): void {
  const { claudeDir, phase, epic, slug, feature } = options;
  const settingsPath = resolve(claudeDir, "settings.local.json");

  let settings: SettingsLocal = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      settings = {};
    }
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }

  const hook = buildSessionStartHook({ phase, epic, slug, feature });
  settings.hooks.SessionStart = [hook];

  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}

/**
 * Remove SessionStart hook from settings.local.json.
 */
export function cleanSessionStartHook(claudeDir: string): void {
  const settingsPath = resolve(claudeDir, "settings.local.json");
  if (!existsSync(settingsPath)) return;

  let settings: SettingsLocal;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return;
  }

  if (!settings.hooks) return;

  delete settings.hooks.SessionStart;

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
```

Also update the `SettingsLocal` interface to include `SessionStart`:
```typescript
interface SettingsLocal {
  enabledPlugins?: Record<string, boolean>;
  hooks?: {
    PreToolUse?: HookEntry[];
    PostToolUse?: HookEntry[];
    SessionStart?: HookEntry[];
    [key: string]: HookEntry[] | undefined;
  };
  [key: string]: unknown;
}
```

- [ ] **Step 3: Run tests**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add cli/src/hooks/hitl-settings.ts
git commit -m "feat(session-start-hook): add settings writer for SessionStart hook"
```

---

## Task 4: Wiring — Phase Command and Pipeline Runner

**Wave:** 3
**Depends on:** Task 2, Task 3

Wire `writeSessionStartHook()` and `cleanSessionStartHook()` into both the cmux path (`phase.ts`) and the manual pipeline path (`runner.ts`).

**Files:**
- Modify: `cli/src/commands/phase.ts`
- Modify: `cli/src/pipeline/runner.ts`

- [ ] **Step 1: Modify phase.ts cmux path**

Add import:
```typescript
import {
  writeHitlSettings, cleanHitlSettings, buildPreToolUseHook,
  writeSessionStartHook, cleanSessionStartHook,
} from "../hooks/hitl-settings";
```

In the cmux path (after file-permission hooks write), add:
```typescript
// SessionStart hook
cleanSessionStartHook(claudeDir);
writeSessionStartHook({ claudeDir, phase, epic: epicSlug, slug: epicSlug, feature: args[1] });
```

Note: For the implement phase, the feature slug needs to be extracted from args. The existing code already has `args` available. The epic slug is `epicSlug` (derived earlier). For implement phase, the feature is `args[1]` if provided (implement takes `<epic> <feature>` args).

Actually, looking at the CLI argument structure more carefully: `beastmode implement <epic-slug> <feature>`. So args[0] is epic, args[1] would be feature in the CLI. But `worktreeSlug` is derived from args[0]. Let me trace this more carefully.

In phase.ts, `args` is passed from the router. For implement: `beastmode implement session-start-hook hook-implementation`. So args = ["session-start-hook", "hook-implementation"]. `worktreeSlug` = `deriveWorktreeSlug(phase, args)` = `args[0]` = "session-start-hook". The feature would be `args[1]`.

Add after file-permission settings write:
```typescript
// SessionStart hook — injects phase context before Claude starts
cleanSessionStartHook(claudeDir);
const featureSlug = phase === "implement" ? args[1] : undefined;
writeSessionStartHook({ claudeDir, phase, epic: epicSlug, slug: epicSlug, feature: featureSlug });
```

- [ ] **Step 2: Modify runner.ts step 3**

Add import (alongside existing hitl-settings import):
```typescript
import {
  writeHitlSettings, cleanHitlSettings, buildPreToolUseHook,
  writeSessionStartHook, cleanSessionStartHook,
} from "../hooks/hitl-settings.js";
```

In step 3 (after file-permission hooks), add:
```typescript
// SessionStart hook — injects phase context before Claude starts
cleanSessionStartHook(claudeDir);
writeSessionStartHook({
  claudeDir,
  phase: config.phase,
  epic: epicSlug,
  slug: epicSlug,
  feature: config.featureSlug,
});
```

- [ ] **Step 3: Run existing tests to verify no regression**

Run: `cd cli && bun --bun vitest run src/__tests__/hitl-settings.test.ts`
Expected: PASS (no regression in existing settings tests)

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/phase.ts cli/src/pipeline/runner.ts
git commit -m "feat(session-start-hook): wire SessionStart hook into dispatch paths"
```

---

## Task 5: Verification

**Wave:** 4
**Depends on:** Task 1, Task 2, Task 3, Task 4

Run the full test suite and verify all tests pass. Verify the output file tree is correct.

**Files:**
- Read: all files from Tasks 1-4

- [ ] **Step 1: Run unit tests**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start.test.ts`
Expected: PASS

- [ ] **Step 2: Run integration tests**

Run: `cd cli && bun --bun vitest run src/__tests__/session-start-hook.integration.test.ts`
Expected: PASS

- [ ] **Step 3: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS (no regressions)

- [ ] **Step 4: Run typecheck**

Run: `cd cli && bun x tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Verify file tree**

Verify these files exist:
- `cli/src/hooks/session-start.ts` (core module)
- `cli/src/__tests__/session-start.test.ts` (unit tests)
- `cli/src/__tests__/session-start-hook.integration.test.ts` (integration test)
- `cli/src/commands/hooks.ts` (modified — includes session-start)
- `cli/src/hooks/hitl-settings.ts` (modified — includes writeSessionStartHook)
- `cli/src/commands/phase.ts` (modified — calls writeSessionStartHook)
- `cli/src/pipeline/runner.ts` (modified — calls writeSessionStartHook)

- [ ] **Step 6: Commit verification pass**

```bash
git add -A
git status
# Verify no unexpected files
```
