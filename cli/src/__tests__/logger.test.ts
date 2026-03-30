import { describe, test, expect } from "bun:test";
import { createLogger, createNullLogger } from "../logger";
import type { Logger } from "../logger";

function captureWith(verbosity: number, slug: string, fn: (logger: Logger) => void): { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origStdout = process.stdout.write;
  const origStderr = process.stderr.write;
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => { stderr.push(chunk); return true; }) as typeof process.stderr.write;
  try {
    fn(createLogger(verbosity, slug));
  } finally {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
  }
  return { stdout, stderr };
}

describe("createLogger", () => {
  describe("level gating", () => {
    test("verbosity 0: only log() writes to stdout", () => {
      const { stdout } = captureWith(0, "test", (l) => {
        l.log("visible"); l.detail("hidden"); l.debug("hidden"); l.trace("hidden");
      });
      expect(stdout.length).toBe(1);
      expect(stdout[0]).toContain("visible");
    });

    test("verbosity 1: log() and detail() write to stdout", () => {
      const { stdout } = captureWith(1, "test", (l) => {
        l.log("a"); l.detail("b"); l.debug("hidden"); l.trace("hidden");
      });
      expect(stdout.length).toBe(2);
      expect(stdout[1]).toContain("b");
    });

    test("verbosity 2: log(), detail(), debug() write to stdout", () => {
      const { stdout } = captureWith(2, "test", (l) => {
        l.log("a"); l.detail("b"); l.debug("c"); l.trace("hidden");
      });
      expect(stdout.length).toBe(3);
      expect(stdout[2]).toContain("c");
    });

    test("verbosity 3: all levels write to stdout", () => {
      const { stdout } = captureWith(3, "test", (l) => {
        l.log("a"); l.detail("b"); l.debug("c"); l.trace("d");
      });
      expect(stdout.length).toBe(4);
      expect(stdout[3]).toContain("d");
    });
  });

  describe("stderr/stdout separation", () => {
    test("warn() always writes to stderr", () => {
      const { stdout, stderr } = captureWith(0, "test", (l) => { l.warn("w"); });
      expect(stdout.length).toBe(0);
      expect(stderr.length).toBe(1);
      expect(stderr[0]).toContain("w");
    });

    test("error() always writes to stderr", () => {
      const { stdout, stderr } = captureWith(0, "test", (l) => { l.error("e"); });
      expect(stdout.length).toBe(0);
      expect(stderr.length).toBe(1);
      expect(stderr[0]).toContain("e");
    });
  });

  describe("output format", () => {
    test("matches HH:MM:SS slug: message format", () => {
      const { stdout } = captureWith(0, "watch", (l) => { l.log("test message"); });
      expect(stdout[0]).toMatch(/^\d{2}:\d{2}:\d{2} watch: test message\n$/);
    });

    test("slug is included in all methods", () => {
      const { stdout, stderr } = captureWith(3, "my-slug", (l) => {
        l.log("a"); l.detail("b"); l.debug("c"); l.trace("d"); l.warn("e"); l.error("f");
      });
      for (const line of [...stdout, ...stderr]) {
        expect(line).toContain("my-slug:");
      }
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
});
