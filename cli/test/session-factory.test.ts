import { describe, it, expect } from "bun:test";
import { createSessionStrategy } from "../src/session-factory.js";
import { SdkStrategy } from "../src/sdk-strategy.js";
import { CmuxStrategy } from "../src/cmux-strategy.js";

describe("SessionFactory", () => {
  it("returns SdkStrategy for 'sdk' config", async () => {
    const strategy = await createSessionStrategy({ strategy: "sdk" });
    expect(strategy).toBeInstanceOf(SdkStrategy);
  });

  it("falls back to SdkStrategy when cmux config but cmux unavailable", async () => {
    const strategy = await createSessionStrategy({
      strategy: "cmux",
      isCmuxAvailable: async () => false,
    });
    // Falls back to SDK with a warning rather than throwing
    expect(strategy).toBeInstanceOf(SdkStrategy);
  });

  it("returns CmuxStrategy when cmux config and cmux available", async () => {
    const strategy = await createSessionStrategy({
      strategy: "cmux",
      isCmuxAvailable: async () => true,
    });
    expect(strategy).toBeInstanceOf(CmuxStrategy);
  });

  it("returns SdkStrategy for 'auto' when cmux unavailable", async () => {
    const strategy = await createSessionStrategy({
      strategy: "auto",
      isCmuxAvailable: async () => false,
    });
    expect(strategy).toBeInstanceOf(SdkStrategy);
  });

  it("returns CmuxStrategy for 'auto' when cmux available", async () => {
    const strategy = await createSessionStrategy({
      strategy: "auto",
      isCmuxAvailable: async () => true,
    });
    expect(strategy).toBeInstanceOf(CmuxStrategy);
  });

  it("defaults to SdkStrategy for unknown strategy value", async () => {
    const strategy = await createSessionStrategy({
      strategy: "sdk",
    });
    expect(strategy).toBeInstanceOf(SdkStrategy);
  });
});
