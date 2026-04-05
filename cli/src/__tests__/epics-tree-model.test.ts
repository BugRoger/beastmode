import { describe, test, expect } from "vitest";
import { FEATURE_STATUS_COLOR, isFeatureDim } from "../dashboard/monokai-palette.js";

describe("feature status colors", () => {
  test("pending maps to muted gray", () => {
    expect(FEATURE_STATUS_COLOR["pending"]).toBe("#727072");
  });

  test("in-progress maps to implement yellow", () => {
    expect(FEATURE_STATUS_COLOR["in-progress"]).toBe("#FFD866");
  });

  test("completed maps to done green", () => {
    expect(FEATURE_STATUS_COLOR["completed"]).toBe("#A9DC76");
  });

  test("blocked maps to blocked red", () => {
    expect(FEATURE_STATUS_COLOR["blocked"]).toBe("#FF6188");
  });

  test("isFeatureDim returns true for completed", () => {
    expect(isFeatureDim("completed")).toBe(true);
  });

  test("isFeatureDim returns false for in-progress", () => {
    expect(isFeatureDim("in-progress")).toBe(false);
  });

  test("isFeatureDim returns false for pending", () => {
    expect(isFeatureDim("pending")).toBe(false);
  });

  test("isFeatureDim returns false for blocked", () => {
    expect(isFeatureDim("blocked")).toBe(false);
  });
});
