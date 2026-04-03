import { describe, test, expect } from "bun:test";
import { selectStrategy } from "../commands/watch";
import type { ITerm2AvailabilityResult } from "../dispatch/it2";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function mockIterm2(result: ITerm2AvailabilityResult) {
  return async () => result;
}

function mockCmux(available: boolean) {
  return async () => available;
}

const ITERM2_OK: ITerm2AvailabilityResult = {
  available: true,
  sessionId: "w0t0p0:test-session",
};

const ITERM2_NO_ENV: ITerm2AvailabilityResult = {
  available: false,
  reason: "Not running inside iTerm2",
};

const ITERM2_NO_CLI: ITerm2AvailabilityResult = {
  available: false,
  sessionId: "w0t0p0:test-session",
  reason: "iTerm2 detected but `it2` CLI is not available",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("selectStrategy", () => {
  // -----------------------------------------------------------------------
  // Explicit "iterm2" strategy
  // -----------------------------------------------------------------------

  describe('strategy: "iterm2"', () => {
    test("selects iterm2 when available", async () => {
      const result = await selectStrategy("iterm2", {
        checkIterm2: mockIterm2(ITERM2_OK),
        checkCmux: mockCmux(false),
      });
      expect(result.strategy).toBe("iterm2");
      expect(result.sessionId).toBe("w0t0p0:test-session");
    });

    test("throws when iTerm2 env not detected", async () => {
      await expect(
        selectStrategy("iterm2", {
          checkIterm2: mockIterm2(ITERM2_NO_ENV),
          checkCmux: mockCmux(false),
        }),
      ).rejects.toThrow("iTerm2 dispatch strategy unavailable");
    });

    test("throws when it2 CLI not available", async () => {
      await expect(
        selectStrategy("iterm2", {
          checkIterm2: mockIterm2(ITERM2_NO_CLI),
          checkCmux: mockCmux(false),
        }),
      ).rejects.toThrow("iTerm2 dispatch strategy unavailable");
    });
  });

  // -----------------------------------------------------------------------
  // Auto strategy
  // -----------------------------------------------------------------------

  describe('strategy: "auto"', () => {
    test("picks iTerm2 when available (highest priority)", async () => {
      const result = await selectStrategy("auto", {
        checkIterm2: mockIterm2(ITERM2_OK),
        checkCmux: mockCmux(true), // cmux also available — should be skipped
      });
      expect(result.strategy).toBe("iterm2");
      expect(result.sessionId).toBe("w0t0p0:test-session");
    });

    test("falls back to cmux when iTerm2 unavailable", async () => {
      const result = await selectStrategy("auto", {
        checkIterm2: mockIterm2(ITERM2_NO_ENV),
        checkCmux: mockCmux(true),
      });
      expect(result.strategy).toBe("cmux");
      expect(result.sessionId).toBeUndefined();
    });

    test("falls back to SDK when both unavailable", async () => {
      const result = await selectStrategy("auto", {
        checkIterm2: mockIterm2(ITERM2_NO_ENV),
        checkCmux: mockCmux(false),
      });
      expect(result.strategy).toBe("sdk");
    });

    test("skips iTerm2 silently (no throw) when unavailable", async () => {
      // Should NOT throw — unlike explicit "iterm2" strategy
      const result = await selectStrategy("auto", {
        checkIterm2: mockIterm2(ITERM2_NO_CLI),
        checkCmux: mockCmux(false),
      });
      expect(result.strategy).toBe("sdk");
    });
  });

  // -----------------------------------------------------------------------
  // Explicit "cmux" strategy
  // -----------------------------------------------------------------------

  describe('strategy: "cmux"', () => {
    test("selects cmux when available", async () => {
      const result = await selectStrategy("cmux", {
        checkIterm2: mockIterm2(ITERM2_OK),
        checkCmux: mockCmux(true),
      });
      expect(result.strategy).toBe("cmux");
    });

    test("falls back to SDK when cmux unavailable", async () => {
      const result = await selectStrategy("cmux", {
        checkIterm2: mockIterm2(ITERM2_OK),
        checkCmux: mockCmux(false),
      });
      expect(result.strategy).toBe("sdk");
    });

    test("does not check iTerm2", async () => {
      let iterm2Called = false;
      const result = await selectStrategy("cmux", {
        checkIterm2: async () => {
          iterm2Called = true;
          return ITERM2_OK;
        },
        checkCmux: mockCmux(true),
      });
      expect(result.strategy).toBe("cmux");
      expect(iterm2Called).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Explicit "sdk" strategy
  // -----------------------------------------------------------------------

  describe('strategy: "sdk"', () => {
    test("selects SDK directly", async () => {
      const result = await selectStrategy("sdk", {
        checkIterm2: mockIterm2(ITERM2_OK),
        checkCmux: mockCmux(true),
      });
      expect(result.strategy).toBe("sdk");
    });

    test("does not check iTerm2 or cmux", async () => {
      let anyChecked = false;
      const result = await selectStrategy("sdk", {
        checkIterm2: async () => {
          anyChecked = true;
          return ITERM2_OK;
        },
        checkCmux: async () => {
          anyChecked = true;
          return true;
        },
      });
      expect(result.strategy).toBe("sdk");
      expect(anyChecked).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Unknown strategy
  // -----------------------------------------------------------------------

  describe("unknown strategy", () => {
    test("defaults to SDK for unrecognized strategy", async () => {
      const result = await selectStrategy("banana", {
        checkIterm2: mockIterm2(ITERM2_OK),
        checkCmux: mockCmux(true),
      });
      expect(result.strategy).toBe("sdk");
    });
  });
});
