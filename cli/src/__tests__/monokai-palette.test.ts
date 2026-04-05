import { describe, test, expect } from "vitest";
import { isDim } from "../dashboard/monokai-palette.js";

describe("isDim", () => {
  test("done is dim", () => expect(isDim("done")).toBe(true));
  test("cancelled is dim", () => expect(isDim("cancelled")).toBe(true));
  test("blocked is dim", () => expect(isDim("blocked")).toBe(true));
  test("pending is dim", () => expect(isDim("pending")).toBe(true));
  test("implement is not dim", () => expect(isDim("implement")).toBe(false));
  test("design is not dim", () => expect(isDim("design")).toBe(false));
  test("in-progress is not dim", () => expect(isDim("in-progress")).toBe(false));
});
