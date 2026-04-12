import { describe, test, expect } from "vitest";

/**
 * Verify that fetchGitStatus awaits proc.exited on all spawned processes.
 * This is a source-level contract test — we grep the source to verify
 * the pattern is present, since the actual Bun.spawn behavior requires
 * a running dashboard.
 */
describe("fetchGitStatus proc.exited contract", () => {
  test("rev-parse spawn has await proc.exited", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../dashboard/App.tsx"),
      "utf-8",
    );

    // Find the fetchGitStatus function body
    const fnStart = source.indexOf("const fetchGitStatus");
    expect(fnStart).toBeGreaterThan(-1);

    // Find the section between the rev-parse spawn and the diffProc spawn
    const revParseSpawn = source.indexOf('Bun.spawn(["git", "rev-parse"', fnStart);
    expect(revParseSpawn).toBeGreaterThan(-1);

    const diffProcSpawn = source.indexOf('Bun.spawn(["git", "diff"', fnStart);
    expect(diffProcSpawn).toBeGreaterThan(-1);

    // Between rev-parse spawn and diffProc spawn, there should be "await proc.exited"
    const betweenSpawns = source.slice(revParseSpawn, diffProcSpawn);
    expect(betweenSpawns).toContain("await proc.exited");
  });

  test("no process.exit() in fetchGitStatus", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../dashboard/App.tsx"),
      "utf-8",
    );
    const fnStart = source.indexOf("const fetchGitStatus");
    const fnEnd = source.indexOf("fetchGitStatus();", fnStart);
    const fnBody = source.slice(fnStart, fnEnd);
    expect(fnBody).not.toContain("process.exit");
  });
});
