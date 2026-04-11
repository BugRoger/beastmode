import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the hook modules to verify dispatch without side effects
vi.mock("../hooks/hitl-auto.js", () => ({
  decideResponse: vi.fn(() => '{"permissionDecision":"allow","updatedInput":{}}'),
}));

vi.mock("../hooks/hitl-log.js", () => ({
  routeAndFormat: vi.fn(() => "## 2026-01-01\n**Tag:** auto\n"),
}));

vi.mock("../hooks/session-stop.js", () => ({
  runSessionStop: vi.fn(() => 0),
}));

vi.mock("../config.js", () => ({
  loadConfig: vi.fn(() => ({
    hitl: { implement: "approve all" },
    github: { enabled: false },
    "file-permissions": {},
  })),
}));

vi.mock("../hooks/hitl-settings.js", () => ({
  getPhaseHitlProse: vi.fn(() => "approve all"),
}));

// Mock session-start hook module
vi.mock("../hooks/session-start.js", () => ({
  runSessionStart: vi.fn((_repoRoot: string) => {
    const phase = process.env.BEASTMODE_PHASE;
    if (!phase) throw new Error("Missing environment variable: BEASTMODE_PHASE");
    const output = JSON.stringify({
      hookSpecificOutput: {
        additionalContext: `Phase: ${phase}`,
      },
    });
    process.stdout.write(output);
  }),
}));

// Mock child_process.execSync for git rev-parse
vi.mock("node:child_process", () => ({
  execSync: vi.fn(() => "/tmp/fake-repo"),
}));

// Mock fs functions used by hitl-log handler
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    statSync: vi.fn(() => ({ isFile: () => false })),
  };
});

import { hooksCommand } from "../commands/hooks";
import { decideResponse } from "../hooks/hitl-auto.js";
import { routeAndFormat } from "../hooks/hitl-log.js";
import { runSessionStop } from "../hooks/session-stop.js";

describe("hooksCommand", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as any);
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.env.TOOL_INPUT = '{"questions":[{"question":"Test?"}]}';
    process.env.TOOL_OUTPUT = '{"answers":{"Test?":"Yes"}}';
  });

  afterEach(() => {
    exitSpy.mockRestore();
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    delete process.env.TOOL_INPUT;
    delete process.env.TOOL_OUTPUT;
    delete process.env.BEASTMODE_PHASE;
    delete process.env.BEASTMODE_EPIC;
    delete process.env.BEASTMODE_SLUG;
  });

  test("hitl-auto dispatches to decideResponse", async () => {
    try {
      await hooksCommand(["hitl-auto", "implement"]);
    } catch { /* exit mock */ }

    expect(decideResponse).toHaveBeenCalled();
  });

  test("hitl-log dispatches to routeAndFormat", async () => {
    try {
      await hooksCommand(["hitl-log", "design"]);
    } catch { /* exit mock */ }

    expect(routeAndFormat).toHaveBeenCalled();
  });

  test("session-stop dispatches to runSessionStop", async () => {
    try {
      await hooksCommand(["session-stop"]);
    } catch { /* exit mock */ }

    expect(runSessionStop).toHaveBeenCalled();
  });

  test("unknown subcommand writes error and exits 1", async () => {
    try {
      await hooksCommand(["nonexistent"]);
    } catch { /* exit mock */ }

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown hook"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("missing subcommand writes error and exits 1", async () => {
    try {
      await hooksCommand([]);
    } catch { /* exit mock */ }

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Usage"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("session-start writes JSON to stdout when env vars present", async () => {
    process.env.BEASTMODE_PHASE = "design";
    process.env.BEASTMODE_EPIC = "test-epic";
    process.env.BEASTMODE_SLUG = "abc123";

    try {
      await hooksCommand(["session-start"]);
    } catch { /* exit mock */ }

    const output = stdoutSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.hookSpecificOutput.additionalContext).toContain("design");
  });

  test("session-start exits non-zero when BEASTMODE_PHASE is missing", async () => {
    delete process.env.BEASTMODE_PHASE;
    delete process.env.BEASTMODE_EPIC;
    delete process.env.BEASTMODE_SLUG;

    try {
      await hooksCommand(["session-start"]);
    } catch { /* exit mock */ }

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Missing environment variable"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("session-start is recognized as valid hook name", async () => {
    process.env.BEASTMODE_PHASE = "plan";
    process.env.BEASTMODE_EPIC = "my-epic";
    process.env.BEASTMODE_SLUG = "def456";

    try {
      await hooksCommand(["session-start"]);
    } catch { /* exit mock */ }

    // Should NOT write "Unknown hook" error
    const stderrCalls = stderrSpy.mock.calls.map((c: unknown[]) => c[0]);
    expect(stderrCalls.some((c: unknown) => typeof c === "string" && c.includes("Unknown hook"))).toBe(false);
  });
});
