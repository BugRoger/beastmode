import { describe, test, expect } from "vitest";

describe("gh() AbortSignal support", () => {
  test("accepts an optional signal in opts", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    // Should not throw — signal is optional and not yet aborted
    const result = await gh(["--version"], { signal: controller.signal });
    // gh --version should succeed if gh is installed
    if (result) {
      expect(result.exitCode).toBe(0);
    }
  });

  test("returns undefined when signal is already aborted before spawn", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    controller.abort();
    const result = await gh(["--version"], { signal: controller.signal });
    expect(result).toBeUndefined();
  });

  test("kills the process when signal fires mid-execution", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    // Start a command that takes long enough for the abort to fire mid-execution
    const promise = gh(["api", "repos/invalid-owner-zzz/invalid-repo-zzz"], {
      signal: controller.signal,
    });
    // Abort after a short delay
    setTimeout(() => controller.abort(), 50);
    const result = await promise;
    // Should return undefined (aborted = failure)
    expect(result).toBeUndefined();
  });

  test("never throws when signal fires", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    controller.abort();
    let threw = false;
    try {
      await gh(["--version"], { signal: controller.signal });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
