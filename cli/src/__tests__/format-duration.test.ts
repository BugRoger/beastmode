import { describe, test, expect } from "vitest";
import { formatDuration } from "../dashboard/format-duration.js";

describe("formatDuration", () => {
  test("sub-second returns milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  test("exact seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
  });

  test("seconds with remainder", () => {
    expect(formatDuration(5500)).toBe("5s");
  });

  test("minutes and seconds", () => {
    expect(formatDuration(150000)).toBe("2m 30s");
  });

  test("exact minutes", () => {
    expect(formatDuration(120000)).toBe("2m 0s");
  });

  test("hours and minutes", () => {
    expect(formatDuration(4500000)).toBe("1h 15m");
  });

  test("zero", () => {
    expect(formatDuration(0)).toBe("0ms");
  });

  test("one second exactly", () => {
    expect(formatDuration(1000)).toBe("1s");
  });

  test("one minute exactly", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
  });

  test("one hour exactly", () => {
    expect(formatDuration(3600000)).toBe("1h 0m");
  });
});
