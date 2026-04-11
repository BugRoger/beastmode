import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve, join } from "node:path";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const CLI_PATH = resolve(import.meta.dirname, "../../src/index.ts");

function makeTempProjectWithGit(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "session-stop-int-"));
  mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
  writeFileSync(
    join(tempDir, ".beastmode", "config.yaml"),
    `hitl:\n  design: 'always defer to human'\n`,
  );
  execSync("git init", { cwd: tempDir, encoding: "utf-8" });
  return tempDir;
}

describe("session-stop-rename integration", () => {
  test("session-stop subcommand is recognized by the hook dispatcher", () => {
    const tempDir = makeTempProjectWithGit();
    // Should not throw — session-stop is a valid hook
    execSync(
      `bun run "${CLI_PATH}" hooks session-stop`,
      { encoding: "utf-8", cwd: tempDir, env: { ...process.env, BEASTMODE_EPIC_SLUG: "test-epic" } },
    );
  });

  test("session-stop reads epic slug from BEASTMODE_EPIC_SLUG env var", () => {
    const tempDir = makeTempProjectWithGit();
    const artifactsDir = join(tempDir, ".beastmode", "artifacts");
    mkdirSync(join(artifactsDir, "design"), { recursive: true });
    // Commit a baseline so git diff has a reference
    execSync("git add . && git commit -m baseline", { cwd: tempDir, encoding: "utf-8" });
    // Write the artifact AFTER the commit so it shows as a changed file
    writeFileSync(
      join(artifactsDir, "design", "2026-04-11-my-epic.md"),
      "---\nphase: design\nslug: my-epic\nepic: my-epic\nstatus: completed\n---\n# Design\n",
    );

    execSync(
      `bun run "${CLI_PATH}" hooks session-stop`,
      { encoding: "utf-8", cwd: tempDir, env: { ...process.env, BEASTMODE_EPIC_SLUG: "my-epic" } },
    );

    // Output should be derived from "my-epic" slug
    const outputPath = join(artifactsDir, "design", "2026-04-11-my-epic.output.json");
    const output = JSON.parse(readFileSync(outputPath, "utf-8"));
    expect(output.status).toBe("completed");
  });

  test("session-stop exits non-zero when BEASTMODE_EPIC_SLUG is missing", () => {
    const tempDir = makeTempProjectWithGit();
    expect(() => {
      execSync(
        `bun run "${CLI_PATH}" hooks session-stop`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, BEASTMODE_EPIC_SLUG: undefined },
        },
      );
    }).toThrow();
  });

  test("generate-output subcommand is no longer recognized", () => {
    const tempDir = makeTempProjectWithGit();
    expect(() => {
      execSync(
        `bun run "${CLI_PATH}" hooks generate-output`,
        { encoding: "utf-8", cwd: tempDir, env: { ...process.env } },
      );
    }).toThrow();
  });
});
