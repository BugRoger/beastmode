import { describe, test, expect } from "vitest";
import { EventEmitter } from "node:events";
import { SessionStatsAccumulator } from "../dashboard/session-stats.js";

function createAccumulator(): { emitter: EventEmitter; acc: SessionStatsAccumulator } {
  const emitter = new EventEmitter();
  const acc = new SessionStatsAccumulator(emitter);
  return { emitter, acc };
}

describe("SessionStatsAccumulator", () => {
  describe("initial state", () => {
    test("all counters are zero", () => {
      const { acc } = createAccumulator();
      const stats = acc.getStats();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.failures).toBe(0);
      expect(stats.reDispatches).toBe(0);
      expect(stats.cumulativeMs).toBe(0);
    });

    test("isEmpty is true", () => {
      const { acc } = createAccumulator();
      expect(acc.getStats().isEmpty).toBe(true);
    });

    test("successRate is 0", () => {
      const { acc } = createAccumulator();
      expect(acc.getStats().successRate).toBe(0);
    });

    test("all phase durations are null", () => {
      const { acc } = createAccumulator();
      const stats = acc.getStats();
      expect(stats.phaseDurations.plan).toBeNull();
      expect(stats.phaseDurations.implement).toBeNull();
      expect(stats.phaseDurations.validate).toBeNull();
      expect(stats.phaseDurations.release).toBeNull();
    });
  });

  describe("session-started", () => {
    test("increments active count", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      expect(acc.getStats().active).toBe(1);
    });

    test("multiple starts increment active count", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-started", { epicSlug: "e2", phase: "plan", sessionId: "s2" });
      expect(acc.getStats().active).toBe(2);
    });
  });

  describe("session-completed", () => {
    test("increments total and decrements active on success", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      const stats = acc.getStats();
      expect(stats.total).toBe(1);
      expect(stats.active).toBe(0);
      expect(stats.successes).toBe(1);
    });

    test("increments failures on failure", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: false, durationMs: 5000 });
      const stats = acc.getStats();
      expect(stats.total).toBe(1);
      expect(stats.failures).toBe(1);
      expect(stats.successes).toBe(0);
    });

    test("sets isEmpty to false after first completion", () => {
      const { emitter, acc } = createAccumulator();
      expect(acc.getStats().isEmpty).toBe(true);
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      expect(acc.getStats().isEmpty).toBe(false);
    });

    test("accumulates cumulative duration", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 120000 });
      emitter.emit("session-started", { epicSlug: "e2", phase: "plan", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e2", phase: "plan", success: true, durationMs: 60000 });
      expect(acc.getStats().cumulativeMs).toBe(180000);
    });
  });

  describe("success rate", () => {
    test("computes percentage from successes and total", () => {
      const { emitter, acc } = createAccumulator();
      for (let i = 1; i <= 3; i++) {
        emitter.emit("session-started", { epicSlug: `e${i}`, phase: "plan", sessionId: `s${i}` });
        emitter.emit("session-completed", { epicSlug: `e${i}`, phase: "plan", success: true, durationMs: 5000 });
      }
      emitter.emit("session-started", { epicSlug: "e4", phase: "plan", sessionId: "s4" });
      emitter.emit("session-completed", { epicSlug: "e4", phase: "plan", success: false, durationMs: 5000 });
      expect(acc.getStats().successRate).toBe(75);
    });

    test("returns 0 when no sessions completed", () => {
      const { acc } = createAccumulator();
      expect(acc.getStats().successRate).toBe(0);
    });
  });

  describe("phase durations", () => {
    test("tracks average duration per phase", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 30000 });
      emitter.emit("session-started", { epicSlug: "e2", phase: "plan", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e2", phase: "plan", success: true, durationMs: 50000 });
      expect(acc.getStats().phaseDurations.plan).toBe(40000);
    });

    test("unseen phases remain null", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 30000 });
      const stats = acc.getStats();
      expect(stats.phaseDurations.implement).toBeNull();
      expect(stats.phaseDurations.validate).toBeNull();
      expect(stats.phaseDurations.release).toBeNull();
    });

    test("each phase tracks independently", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 30000 });
      emitter.emit("session-started", { epicSlug: "e2", phase: "implement", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e2", phase: "implement", success: true, durationMs: 60000 });
      const stats = acc.getStats();
      expect(stats.phaseDurations.plan).toBe(30000);
      expect(stats.phaseDurations.implement).toBe(60000);
    });
  });

  describe("re-dispatch detection", () => {
    test("detects re-dispatch when same epic+phase+feature completes again", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      expect(acc.getStats().reDispatches).toBe(0);
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      expect(acc.getStats().reDispatches).toBe(1);
    });

    test("different epic+phase combos do not count as re-dispatch", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      emitter.emit("session-started", { epicSlug: "e1", phase: "implement", sessionId: "s2" });
      emitter.emit("session-completed", { epicSlug: "e1", phase: "implement", success: true, durationMs: 5000 });
      expect(acc.getStats().reDispatches).toBe(0);
    });
  });

  describe("uptime", () => {
    test("computes uptime from start on scan-complete", () => {
      let now = 1000000;
      const emitter = new EventEmitter();
      const acc = new SessionStatsAccumulator(emitter, { nowFn: () => now });
      now = 1000000 + 300000;
      emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
      const stats = acc.getStats();
      expect(stats.uptimeMs).toBe(300000);
    });

    test("uptime updates on each scan-complete", () => {
      let now = 0;
      const emitter = new EventEmitter();
      const acc = new SessionStatsAccumulator(emitter, { nowFn: () => now });
      now = 60000;
      emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
      expect(acc.getStats().uptimeMs).toBe(60000);
      now = 120000;
      emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
      expect(acc.getStats().uptimeMs).toBe(120000);
    });
  });

  describe("dispose", () => {
    test("stops processing events after disposal", () => {
      const { emitter, acc } = createAccumulator();
      emitter.emit("session-started", { epicSlug: "e1", phase: "plan", sessionId: "s1" });
      expect(acc.getStats().active).toBe(1);

      acc.dispose();

      // After disposal, events should no longer be processed
      emitter.emit("session-started", { epicSlug: "e2", phase: "plan", sessionId: "s2" });
      expect(acc.getStats().active).toBe(1); // Still 1, not 2

      emitter.emit("session-completed", { epicSlug: "e1", phase: "plan", success: true, durationMs: 5000 });
      expect(acc.getStats().total).toBe(0); // Session not counted
    });

    test("allows multiple dispose calls without error", () => {
      const { acc } = createAccumulator();
      expect(() => {
        acc.dispose();
        acc.dispose();
      }).not.toThrow();
    });
  });
});
