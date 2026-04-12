import { describe, test, expect } from "vitest";
import {
  createCountdownState,
  handleStarted,
  handleScanStarted,
  handleScanComplete,
  handleStopped,
  decrementCountdown,
  formatCountdown,
} from "../dashboard/use-countdown.js";

describe("countdown state machine", () => {
  test("createCountdownState returns stopped state", () => {
    const state = createCountdownState(60);
    expect(state.mode).toBe("stopped");
    expect(state.secondsRemaining).toBe(0);
    expect(state.intervalSeconds).toBe(60);
  });

  test("handleStarted transitions to counting state", () => {
    const state = createCountdownState(60);
    const next = handleStarted(state, 60);
    expect(next.mode).toBe("counting");
    expect(next.secondsRemaining).toBe(60);
  });

  test("handleScanStarted transitions to scanning state", () => {
    const state = { mode: "counting" as const, secondsRemaining: 45, intervalSeconds: 60 };
    const next = handleScanStarted(state);
    expect(next.mode).toBe("scanning");
    expect(next.secondsRemaining).toBe(45);
  });

  test("handleScanComplete with poll trigger resets countdown", () => {
    const state = { mode: "scanning" as const, secondsRemaining: 0, intervalSeconds: 60 };
    const next = handleScanComplete(state, "poll");
    expect(next.mode).toBe("counting");
    expect(next.secondsRemaining).toBe(60);
  });

  test("handleScanComplete with event trigger does not reset", () => {
    const state = { mode: "counting" as const, secondsRemaining: 42, intervalSeconds: 60 };
    const next = handleScanComplete(state, "event");
    expect(next.mode).toBe("counting");
    expect(next.secondsRemaining).toBe(42);
  });

  test("handleStopped transitions to stopped state", () => {
    const state = { mode: "counting" as const, secondsRemaining: 30, intervalSeconds: 60 };
    const next = handleStopped(state);
    expect(next.mode).toBe("stopped");
    expect(next.secondsRemaining).toBe(0);
  });

  test("decrementCountdown decreases by 1", () => {
    const state = { mode: "counting" as const, secondsRemaining: 10, intervalSeconds: 60 };
    const next = decrementCountdown(state);
    expect(next.secondsRemaining).toBe(9);
  });

  test("decrementCountdown clamps at 0", () => {
    const state = { mode: "counting" as const, secondsRemaining: 0, intervalSeconds: 60 };
    const next = decrementCountdown(state);
    expect(next.secondsRemaining).toBe(0);
  });

  test("decrementCountdown only works in counting mode", () => {
    const scanning = { mode: "scanning" as const, secondsRemaining: 10, intervalSeconds: 60 };
    expect(decrementCountdown(scanning).secondsRemaining).toBe(10);

    const stopped = { mode: "stopped" as const, secondsRemaining: 0, intervalSeconds: 60 };
    expect(decrementCountdown(stopped).secondsRemaining).toBe(0);
  });
});

describe("formatCountdown", () => {
  test("counting mode shows Ns", () => {
    expect(formatCountdown({ mode: "counting", secondsRemaining: 43, intervalSeconds: 60 })).toBe("43s");
  });

  test("counting mode at 0 shows 0s", () => {
    expect(formatCountdown({ mode: "counting", secondsRemaining: 0, intervalSeconds: 60 })).toBe("0s");
  });

  test("scanning mode shows scanning...", () => {
    expect(formatCountdown({ mode: "scanning", secondsRemaining: 10, intervalSeconds: 60 })).toBe("scanning...");
  });

  test("stopped mode shows stopped (Ns)", () => {
    expect(formatCountdown({ mode: "stopped", secondsRemaining: 0, intervalSeconds: 60 })).toBe("stopped (60s)");
  });
});
