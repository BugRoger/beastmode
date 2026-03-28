import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { isValidPhase, VALID_PHASES } from "../types";
import { appendRunLog } from "../utils/run-log";
import type { PhaseResult } from "../types";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-run-command");

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(TEST_ROOT, { recursive: true });
}

describe("isValidPhase", () => {
  test("accepts all valid phases", () => {
    for (const phase of VALID_PHASES) {
      expect(isValidPhase(phase)).toBe(true);
    }
  });

  test("rejects invalid phases", () => {
    expect(isValidPhase("invalid")).toBe(false);
    expect(isValidPhase("")).toBe(false);
    expect(isValidPhase("build")).toBe(false);
  });
});

describe("appendRunLog", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("creates new run log file when none exists", async () => {
    const result: PhaseResult = {
      exit_status: "success",
      cost_usd: 1.5,
      duration_ms: 5000,
      session_id: "sess-123",
    };

    await appendRunLog(TEST_ROOT, "plan", ["my-epic"], result);

    const logPath = resolve(TEST_ROOT, ".beastmode-runs.json");
    expect(existsSync(logPath)).toBe(true);

    const entries = JSON.parse(readFileSync(logPath, "utf-8"));
    expect(entries).toHaveLength(1);
    expect(entries[0].phase).toBe("plan");
    expect(entries[0].epic).toBe("my-epic");
    expect(entries[0].cost_usd).toBe(1.5);
    expect(entries[0].duration_ms).toBe(5000);
    expect(entries[0].exit_status).toBe("success");
    expect(entries[0].session_id).toBe("sess-123");
    expect(entries[0].timestamp).toBeDefined();
  });

  test("appends to existing run log", async () => {
    const existing = [
      {
        epic: "old-epic",
        phase: "design",
        feature: null,
        cost_usd: 0.5,
        duration_ms: 1000,
        exit_status: "success",
        timestamp: "2026-01-01T00:00:00Z",
        session_id: null,
      },
    ];
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode-runs.json"),
      JSON.stringify(existing),
    );

    const result: PhaseResult = {
      exit_status: "error",
      cost_usd: null,
      duration_ms: 3000,
      session_id: null,
    };

    await appendRunLog(TEST_ROOT, "implement", ["epic", "feature-a"], result);

    const entries = JSON.parse(
      readFileSync(resolve(TEST_ROOT, ".beastmode-runs.json"), "utf-8"),
    );
    expect(entries).toHaveLength(2);
    expect(entries[1].phase).toBe("implement");
    expect(entries[1].epic).toBe("epic");
    expect(entries[1].feature).toBe("feature-a");
    expect(entries[1].exit_status).toBe("error");
  });

  test("sets feature to null when no second arg", async () => {
    const result: PhaseResult = {
      exit_status: "success",
      cost_usd: null,
      duration_ms: 100,
      session_id: null,
    };

    await appendRunLog(TEST_ROOT, "validate", ["my-epic"], result);

    const entries = JSON.parse(
      readFileSync(resolve(TEST_ROOT, ".beastmode-runs.json"), "utf-8"),
    );
    expect(entries[0].feature).toBeNull();
  });

  test("handles corrupted run log by starting fresh", async () => {
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode-runs.json"),
      "not valid json",
    );

    const result: PhaseResult = {
      exit_status: "cancelled",
      cost_usd: null,
      duration_ms: 200,
      session_id: null,
    };

    await appendRunLog(TEST_ROOT, "release", ["my-epic"], result);

    const entries = JSON.parse(
      readFileSync(resolve(TEST_ROOT, ".beastmode-runs.json"), "utf-8"),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].exit_status).toBe("cancelled");
  });
});
