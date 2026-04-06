import { describe, test, expect, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { SessionStatsAccumulator } from "../dashboard/session-stats.js";
import type { SessionStats } from "../dashboard/session-stats.js";

describe("SessionStatsAccumulator", () => {
  let emitter: EventEmitter;
  let acc: SessionStatsAccumulator;

  beforeEach(() => {
    emitter = new EventEmitter();
    acc = new SessionStatsAccumulator(emitter);
  });

  test("initial state: all zeros, isEmpty true", () => {
    const s = acc.getStats();
    expect(s.total).toBe(0);
    expect(s.active).toBe(0);
    expect(s.successes).toBe(0);
    expect(s.failures).toBe(0);
    expect(s.reDispatches).toBe(0);
    expect(s.successRate).toBe(0);
    expect(s.cumulativeMs).toBe(0);
    expect(s.isEmpty).toBe(true);
    expect(s.phaseDurations.plan).toBeNull();
    expect(s.phaseDurations.implement).toBeNull();
    expect(s.phaseDurations.validate).toBeNull();
    expect(s.phaseDurations.release).toBeNull();
  });

  test("session-started increments active count", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    expect(acc.getStats().active).toBe(1);
  });

  test("session-completed decrements active, increments total", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 5000 });
    const s = acc.getStats();
    expect(s.active).toBe(0);
    expect(s.total).toBe(1);
    expect(s.successes).toBe(1);
  });

  test("failed session increments failures", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: false, durationMs: 3000 });
    const s = acc.getStats();
    expect(s.failures).toBe(1);
    expect(s.total).toBe(1);
  });

  test("success rate computed correctly", () => {
    for (let i = 0; i < 3; i++) {
      emitter.emit("session-started", { epicSlug: `e${i}`, phase: "plan", sessionId: `s${i}` });
      emitter.emit("session-completed", { epicSlug: `e${i}`, phase: "plan", success: true, durationMs: 1000 });
    }
    emitter.emit("session-started", { epicSlug: "f", phase: "plan", sessionId: "sf" });
    emitter.emit("session-completed", { epicSlug: "f", phase: "plan", success: false, durationMs: 1000 });
    expect(acc.getStats().successRate).toBe(75);
  });

  test("cumulative session time sums durations", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 120000 });
    emitter.emit("session-started", { epicSlug: "b", phase: "plan", sessionId: "s2" });
    emitter.emit("session-completed", { epicSlug: "b", phase: "plan", success: true, durationMs: 60000 });
    expect(acc.getStats().cumulativeMs).toBe(180000);
  });

  test("per-phase average durations", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 30000 });
    emitter.emit("session-started", { epicSlug: "b", phase: "plan", sessionId: "s2" });
    emitter.emit("session-completed", { epicSlug: "b", phase: "plan", success: true, durationMs: 50000 });
    expect(acc.getStats().phaseDurations.plan).toBe(40000);
  });

  test("unseen phases return null", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 45000 });
    const s = acc.getStats();
    expect(s.phaseDurations.implement).toBeNull();
    expect(s.phaseDurations.validate).toBeNull();
    expect(s.phaseDurations.release).toBeNull();
  });

  test("isEmpty becomes false after first completion", () => {
    expect(acc.getStats().isEmpty).toBe(true);
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: true, durationMs: 1000 });
    expect(acc.getStats().isEmpty).toBe(false);
  });

  test("re-dispatch detection", () => {
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    emitter.emit("session-completed", { epicSlug: "a", phase: "plan", success: false, durationMs: 5000 });
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s2" });
    expect(acc.getStats().reDispatches).toBe(1);
  });

  test("uptime computed on scan-complete", () => {
    // Simulate time passing
    (acc as any).startedAt = Date.now() - 300000;
    emitter.emit("scan-complete", { epicsScanned: 5, dispatched: 2 });
    const s = acc.getStats();
    expect(s.uptimeMs).toBeGreaterThanOrEqual(299000);
    expect(s.uptimeMs).toBeLessThanOrEqual(301000);
  });

  test("dispose removes all listeners", () => {
    acc.dispose();
    emitter.emit("session-started", { epicSlug: "a", phase: "plan", sessionId: "s1" });
    expect(acc.getStats().active).toBe(0);
  });
});
