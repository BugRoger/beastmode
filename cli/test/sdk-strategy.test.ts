import { describe, it, expect } from "bun:test";
import { SdkStrategy } from "../src/sdk-strategy.js";

describe("SdkStrategy", () => {
  describe("cleanup", () => {
    it("resolves without error", async () => {
      const strategy = new SdkStrategy();
      await strategy.cleanup("some-epic");
      // If we get here, it resolved successfully
    });

    it("is a true no-op (returns undefined)", async () => {
      const strategy = new SdkStrategy();
      const result = await strategy.cleanup("any-slug");
      expect(result).toBeUndefined();
    });

    it("can be called multiple times for same epic", async () => {
      const strategy = new SdkStrategy();
      await strategy.cleanup("epic-a");
      await strategy.cleanup("epic-a");
      await strategy.cleanup("epic-b");
      // All should resolve without error
    });
  });
});
