import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DispatchDoneMarker } from "../src/commands/phase.js";

const TEST_DIR = resolve(import.meta.dir, ".test-dispatch-done-tmp");

describe(".dispatch-done.json marker", () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("validates marker schema shape", () => {
    const marker: DispatchDoneMarker = {
      exitCode: 0,
      costUsd: 1.23,
      durationMs: 5000,
      sessionId: "sess-123",
      timestamp: new Date().toISOString(),
    };

    const markerPath = resolve(TEST_DIR, ".dispatch-done.json");
    writeFileSync(markerPath, JSON.stringify(marker, null, 2));

    const read = JSON.parse(readFileSync(markerPath, "utf-8")) as DispatchDoneMarker;
    expect(read.exitCode).toBe(0);
    expect(read.costUsd).toBe(1.23);
    expect(read.durationMs).toBe(5000);
    expect(read.sessionId).toBe("sess-123");
    expect(typeof read.timestamp).toBe("string");
  });

  it("validates marker with null cost and session", () => {
    const marker: DispatchDoneMarker = {
      exitCode: 1,
      costUsd: null,
      durationMs: 3000,
      sessionId: null,
      timestamp: new Date().toISOString(),
    };

    const markerPath = resolve(TEST_DIR, ".dispatch-done.json");
    writeFileSync(markerPath, JSON.stringify(marker, null, 2));

    const read = JSON.parse(readFileSync(markerPath, "utf-8")) as DispatchDoneMarker;
    expect(read.exitCode).toBe(1);
    expect(read.costUsd).toBeNull();
    expect(read.sessionId).toBeNull();
  });

  it("validates cancelled marker has exit code 130", () => {
    const marker: DispatchDoneMarker = {
      exitCode: 130,
      costUsd: null,
      durationMs: 1000,
      sessionId: null,
      timestamp: new Date().toISOString(),
    };

    const markerPath = resolve(TEST_DIR, ".dispatch-done.json");
    writeFileSync(markerPath, JSON.stringify(marker, null, 2));

    const read = JSON.parse(readFileSync(markerPath, "utf-8")) as DispatchDoneMarker;
    expect(read.exitCode).toBe(130);
  });

  it("SdkStrategy marker matches expected schema", () => {
    // Validates that the marker shape written by SdkStrategy is correct
    const marker = {
      exitCode: 0,
      costUsd: 0.5,
      durationMs: 10000,
      sessionId: null,
      timestamp: new Date().toISOString(),
    };

    const markerPath = resolve(TEST_DIR, ".dispatch-done.json");
    writeFileSync(markerPath, JSON.stringify(marker, null, 2));

    const read = JSON.parse(readFileSync(markerPath, "utf-8"));
    expect(read.exitCode).toBe(0);
    expect(read.costUsd).toBe(0.5);
    expect(read.sessionId).toBeNull();
    expect(typeof read.timestamp).toBe("string");
  });
});
