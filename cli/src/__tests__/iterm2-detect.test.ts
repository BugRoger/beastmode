import { describe, test, expect } from "vitest";
import {
  detectITerm2Env,
  checkIt2Available,
  iterm2Available,
  IT2_SETUP_INSTRUCTIONS,
  type SpawnFn,
} from "../dispatch/it2";

// ---------------------------------------------------------------------------
// Mock helpers (same pattern as cmux-client.test.ts)
// ---------------------------------------------------------------------------

function mockProc(
  stdout: string,
  stderr: string,
  exitCode: number,
): ReturnType<SpawnFn> {
  return {
    stdout: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(stdout));
        c.close();
      },
    }),
    stderr: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(stderr));
        c.close();
      },
    }),
    exited: Promise.resolve(exitCode),
  };
}

function spawnOk(stdout = "iterm2 1.0.0\n"): SpawnFn {
  return () => mockProc(stdout, "", 0);
}

function spawnFail(): SpawnFn {
  return () => mockProc("", "command not found", 127);
}

function spawnThrows(): SpawnFn {
  return () => {
    throw new Error("spawn failed");
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("detectITerm2Env", () => {
  test("detects iTerm2 when both env vars present", () => {
    const result = detectITerm2Env({
      TERM_PROGRAM: "iTerm.app",
      ITERM_SESSION_ID: "w0t0p0:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    });
    expect(result.detected).toBe(true);
    expect(result.sessionId).toBe("w0t0p0:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX");
  });

  test("returns false when TERM_PROGRAM is not iTerm.app", () => {
    const result = detectITerm2Env({
      TERM_PROGRAM: "Apple_Terminal",
      ITERM_SESSION_ID: "w0t0p0:xxx",
    });
    expect(result.detected).toBe(false);
    expect(result.sessionId).toBeUndefined();
  });

  test("returns false when ITERM_SESSION_ID is missing", () => {
    const result = detectITerm2Env({
      TERM_PROGRAM: "iTerm.app",
    });
    expect(result.detected).toBe(false);
  });

  test("returns false for empty env", () => {
    const result = detectITerm2Env({});
    expect(result.detected).toBe(false);
  });

  test("returns false when TERM_PROGRAM is undefined", () => {
    const result = detectITerm2Env({
      TERM_PROGRAM: undefined,
      ITERM_SESSION_ID: "w0t0p0:xxx",
    });
    expect(result.detected).toBe(false);
  });
});

describe("checkIt2Available", () => {
  test("returns true when it2 --version exits 0", async () => {
    expect(await checkIt2Available(spawnOk())).toBe(true);
  });

  test("returns false when it2 exits non-zero", async () => {
    expect(await checkIt2Available(spawnFail())).toBe(false);
  });

  test("returns false when spawn throws (binary not found)", async () => {
    expect(await checkIt2Available(spawnThrows())).toBe(false);
  });
});

describe("iterm2Available", () => {
  const iterm2Env = {
    TERM_PROGRAM: "iTerm.app",
    ITERM_SESSION_ID: "w0t0p0:session-123",
  };

  const nonItermEnv = {
    TERM_PROGRAM: "Apple_Terminal",
  };

  test("available when env detected and it2 responds", async () => {
    const result = await iterm2Available(spawnOk(), iterm2Env);
    expect(result.available).toBe(true);
    expect(result.sessionId).toBe("w0t0p0:session-123");
    expect(result.reason).toBeUndefined();
  });

  test("unavailable when not in iTerm2", async () => {
    const result = await iterm2Available(spawnOk(), nonItermEnv);
    expect(result.available).toBe(false);
    expect(result.reason).toContain("Not running inside iTerm2");
  });

  test("unavailable when in iTerm2 but it2 missing", async () => {
    const result = await iterm2Available(spawnFail(), iterm2Env);
    expect(result.available).toBe(false);
    expect(result.sessionId).toBe("w0t0p0:session-123");
    expect(result.reason).toContain("it2");
  });

  test("unavailable when in iTerm2 but spawn throws", async () => {
    const result = await iterm2Available(spawnThrows(), iterm2Env);
    expect(result.available).toBe(false);
    expect(result.reason).toContain("it2");
  });

  test("unavailable for empty env", async () => {
    const result = await iterm2Available(spawnOk(), {});
    expect(result.available).toBe(false);
  });
});

describe("IT2_SETUP_INSTRUCTIONS", () => {
  test("mentions pip install", () => {
    expect(IT2_SETUP_INSTRUCTIONS).toContain("pip install iterm2");
  });

  test("mentions Python API setting", () => {
    expect(IT2_SETUP_INSTRUCTIONS).toContain("Enable Python API");
  });

  test("mentions it2 --version verification", () => {
    expect(IT2_SETUP_INSTRUCTIONS).toContain("it2 --version");
  });
});
