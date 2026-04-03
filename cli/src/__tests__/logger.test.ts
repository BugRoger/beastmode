import { describe, test, expect } from "bun:test";
import { createLogger, createNullLogger } from "../logger";
import type { Logger, LogContext } from "../logger";

function captureWith(verbosity: number, context: LogContext | undefined, fn: (logger: Logger) => void): { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origStdout = process.stdout.write;
  const origStderr = process.stderr.write;
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => { stderr.push(chunk); return true; }) as typeof process.stderr.write;
  try {
    fn(createLogger(verbosity, context));
  } finally {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
  }
  return { stdout, stderr };
}

describe("createLogger", () => {
  describe("level gating", () => {
    test("verbosity 0: only log() writes to stdout", () => {
      const { stdout } = captureWith(0, { phase: "test" }, (l) => {
        l.log("visible"); l.detail("hidden"); l.debug("hidden"); l.trace("hidden");
      });
      expect(stdout.length).toBe(1);
      expect(stdout[0]).toContain("visible");
    });

    test("verbosity 1: log() and detail() write to stdout", () => {
      const { stdout } = captureWith(1, { phase: "test" }, (l) => {
        l.log("a"); l.detail("b"); l.debug("hidden"); l.trace("hidden");
      });
      expect(stdout.length).toBe(2);
      expect(stdout[1]).toContain("b");
    });

    test("verbosity 2: log(), detail(), debug() write to stdout", () => {
      const { stdout } = captureWith(2, { phase: "test" }, (l) => {
        l.log("a"); l.detail("b"); l.debug("c"); l.trace("hidden");
      });
      expect(stdout.length).toBe(3);
      expect(stdout[2]).toContain("c");
    });

    test("verbosity 3: all levels write to stdout", () => {
      const { stdout } = captureWith(3, { phase: "test" }, (l) => {
        l.log("a"); l.detail("b"); l.debug("c"); l.trace("d");
      });
      expect(stdout.length).toBe(4);
      expect(stdout[3]).toContain("d");
    });
  });

  describe("stderr/stdout separation", () => {
    test("warn() always writes to stderr", () => {
      const { stdout, stderr } = captureWith(0, { phase: "test" }, (l) => { l.warn("w"); });
      expect(stdout.length).toBe(0);
      expect(stderr.length).toBe(1);
      expect(stderr[0]).toContain("w");
    });

    test("error() always writes to stderr", () => {
      const { stdout, stderr } = captureWith(0, { phase: "test" }, (l) => { l.error("e"); });
      expect(stdout.length).toBe(0);
      expect(stderr.length).toBe(1);
      expect(stderr[0]).toContain("e");
    });
  });

  describe("output format", () => {
    test("full context: phase/epic/feature scope", () => {
      const { stdout } = captureWith(0, { phase: "plan", epic: "my-epic", feature: "auth" }, (l) => {
        l.log("test message");
      });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} plan\/my-epic\/auth: test message\n$/);
    });

    test("phase+epic context: phase/epic scope", () => {
      const { stdout } = captureWith(0, { phase: "plan", epic: "my-epic" }, (l) => {
        l.log("test message");
      });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} plan\/my-epic: test message\n$/);
    });

    test("phase-only context: phase scope", () => {
      const { stdout } = captureWith(0, { phase: "plan" }, (l) => {
        l.log("test message");
      });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} plan: test message\n$/);
    });

    test("no context: no scope prefix", () => {
      const { stdout } = captureWith(0, undefined, (l) => {
        l.log("test message");
      });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} test message\n$/);
    });

    test("scope is included in all methods", () => {
      const { stdout, stderr } = captureWith(3, { phase: "plan", epic: "my-epic", feature: "auth" }, (l) => {
        l.log("a"); l.detail("b"); l.debug("c"); l.trace("d"); l.warn("e"); l.error("f");
      });
      for (const line of [...stdout, ...stderr]) {
        expect(line).toContain("plan/my-epic/auth:");
      }
    });
  });

  describe("child logger", () => {
    test("merges parent and child context", () => {
      const { stdout } = captureWith(0, { phase: "plan", epic: "my-epic" }, (l) => {
        const child = l.child({ feature: "auth" });
        child.log("test message");
      });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} plan\/my-epic\/auth: test message\n$/);
    });

    test("child inherits parent verbosity", () => {
      const { stdout } = captureWith(0, { phase: "plan" }, (l) => {
        const child = l.child({ epic: "my-epic" });
        child.log("visible");
        child.detail("hidden");
      });
      expect(stdout.length).toBe(1);
      expect(stdout[0]).toContain("visible");
    });

    test("child context overrides parent fields", () => {
      const { stdout } = captureWith(0, { phase: "plan", epic: "old-epic" }, (l) => {
        const child = l.child({ epic: "new-epic" });
        child.log("test message");
      });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} plan\/new-epic: test message\n$/);
    });

    test("child does not modify parent context", () => {
      const { stdout } = captureWith(0, { phase: "plan", epic: "my-epic" }, (l) => {
        l.child({ feature: "auth" });
        l.log("test message");
      });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} plan\/my-epic: test message\n$/);
    });
  });
});

describe("createNullLogger", () => {
  test("suppresses all output", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const origStdout = process.stdout.write;
    const origStderr = process.stderr.write;
    process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string) => { stderr.push(chunk); return true; }) as typeof process.stderr.write;
    try {
      const l = createNullLogger();
      l.log("x"); l.detail("x"); l.debug("x"); l.trace("x"); l.warn("x"); l.error("x");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
    expect(stdout.length).toBe(0);
    expect(stderr.length).toBe(0);
  });

  test("child() returns a logger", () => {
    const child = createNullLogger().child({ phase: "test" });
    expect(typeof child.log).toBe("function");
    expect(typeof child.detail).toBe("function");
    expect(typeof child.debug).toBe("function");
    expect(typeof child.trace).toBe("function");
    expect(typeof child.warn).toBe("function");
    expect(typeof child.error).toBe("function");
    expect(typeof child.child).toBe("function");
  });

  test("child also suppresses all output", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const origStdout = process.stdout.write;
    const origStderr = process.stderr.write;
    process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string) => { stderr.push(chunk); return true; }) as typeof process.stderr.write;
    try {
      const child = createNullLogger().child({ phase: "test" });
      child.log("x"); child.detail("x"); child.debug("x"); child.trace("x"); child.warn("x"); child.error("x");
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
    expect(stdout.length).toBe(0);
    expect(stderr.length).toBe(0);
  });
});
