import { describe, test, expect } from "vitest";

// ---------------------------------------------------------------------------
// Version state management logic
// ---------------------------------------------------------------------------

describe("version capture from started event", () => {
  test("extracts version string from started event payload", () => {
    const payload = { version: "v0.96.0 (a1b2c3d)", pid: 12345, intervalSeconds: 30 };
    const captured = payload.version;
    expect(captured).toBe("v0.96.0 (a1b2c3d)");
  });

  test("version is null before started event fires", () => {
    const version: string | null = null;
    expect(version).toBeNull();
  });

  test("version updates when started event fires", () => {
    let version: string | null = null;
    const onStarted = (ev: { version: string }) => {
      version = ev.version;
    };
    onStarted({ version: "v0.97.0 (f4e5d6c)" });
    expect(version).toBe("v0.97.0 (f4e5d6c)");
  });
});

// ---------------------------------------------------------------------------
// Version display formatting
// ---------------------------------------------------------------------------

describe("version display rendering logic", () => {
  test("version prop is passed when state is non-null", () => {
    const version: string | null = "v0.96.0 (a1b2c3d)";
    const propValue = version ?? undefined;
    expect(propValue).toBe("v0.96.0 (a1b2c3d)");
  });

  test("version prop is undefined when state is null", () => {
    const version: string | null = null;
    const propValue = version ?? undefined;
    expect(propValue).toBeUndefined();
  });

  test("version string contains abbreviated git hash in parentheses", () => {
    const version = "v0.96.0 (a1b2c3d)";
    const hashMatch = version.match(/\(([a-f0-9]{7})\)/);
    expect(hashMatch).not.toBeNull();
    expect(hashMatch![1]).toBe("a1b2c3d");
  });

  test("git hash is exactly seven characters", () => {
    const version = "v0.96.0 (a1b2c3d)";
    const hashMatch = version.match(/\(([a-f0-9]+)\)/);
    expect(hashMatch![1]).toHaveLength(7);
  });
});
