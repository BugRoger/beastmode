/**
 * Tests for session factory wiring:
 * - SdkSessionFactory delegation
 * - createSessionStrategy selection logic
 */

import { describe, test, expect } from "bun:test";
import { SdkSessionFactory } from "../session";
import type { SessionCreateOpts, SessionHandle } from "../session";
import type { SessionResult } from "../watch-types";
import { createSessionStrategy } from "../session-factory";
import { SdkStrategy } from "../sdk-strategy";

// ---------------------------------------------------------------------------
// SdkSessionFactory
// ---------------------------------------------------------------------------

describe("SdkSessionFactory", () => {
  test("delegates create to wrapped function", async () => {
    let receivedOpts: SessionCreateOpts | undefined;
    const mockHandle: SessionHandle = {
      id: "test-1",
      worktreeSlug: "my-epic",
      promise: Promise.resolve({
        success: true,
        exitCode: 0,
        costUsd: 0.5,
        durationMs: 1000,
      }),
    };

    const factory = new SdkSessionFactory(async (opts) => {
      receivedOpts = opts;
      return mockHandle;
    });

    const opts: SessionCreateOpts = {
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test",
      signal: new AbortController().signal,
    };

    const handle = await factory.create(opts);
    expect(handle).toBe(mockHandle);
    expect(receivedOpts).toBe(opts);
  });

  test("returns session result from wrapped function", async () => {
    const expectedResult: SessionResult = {
      success: true,
      exitCode: 0,
      costUsd: 1.23,
      durationMs: 5000,
    };

    const factory = new SdkSessionFactory(async () => ({
      id: "test-1",
      worktreeSlug: "my-epic",
      promise: Promise.resolve(expectedResult),
    }));

    const handle = await factory.create({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test",
      signal: new AbortController().signal,
    });

    const result = await handle.promise;
    expect(result).toEqual(expectedResult);
  });

  test("has no cleanup method", () => {
    const factory = new SdkSessionFactory(async () => ({
      id: "test",
      worktreeSlug: "test",
      promise: Promise.resolve({ success: true, exitCode: 0, costUsd: 0, durationMs: 0 }),
    }));
    // SdkSessionFactory does not implement the optional cleanup method
    expect((factory as unknown as Record<string, unknown>).cleanup).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// createSessionStrategy — selection logic
// ---------------------------------------------------------------------------

describe("createSessionStrategy", () => {
  test("returns SdkStrategy for 'sdk'", async () => {
    const strategy = await createSessionStrategy({ strategy: "sdk" });
    expect(strategy).toBeInstanceOf(SdkStrategy);
  });

  test("returns SdkStrategy for 'cmux' when cmux unavailable", async () => {
    const strategy = await createSessionStrategy({
      strategy: "cmux",
      isCmuxAvailable: async () => false,
    });
    // Falls back to SDK with warning
    expect(strategy).toBeInstanceOf(SdkStrategy);
  });

  test("returns CmuxStrategy for 'cmux' when cmux available", async () => {
    const strategy = await createSessionStrategy({
      strategy: "cmux",
      isCmuxAvailable: async () => true,
    });
    // Should not be SdkStrategy
    expect(strategy).not.toBeInstanceOf(SdkStrategy);
    expect(strategy.dispatch).toBeDefined();
    expect(strategy.cleanup).toBeDefined();
  });

  test("returns SdkStrategy for 'auto' when cmux unavailable", async () => {
    const strategy = await createSessionStrategy({
      strategy: "auto",
      isCmuxAvailable: async () => false,
    });
    expect(strategy).toBeInstanceOf(SdkStrategy);
  });

  test("returns CmuxStrategy for 'auto' when cmux available", async () => {
    const strategy = await createSessionStrategy({
      strategy: "auto",
      isCmuxAvailable: async () => true,
    });
    expect(strategy).not.toBeInstanceOf(SdkStrategy);
    expect(strategy.dispatch).toBeDefined();
    expect(strategy.cleanup).toBeDefined();
  });
});
