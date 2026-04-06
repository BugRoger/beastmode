import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CLI_PATH = resolve(import.meta.dirname, "../../src/index.ts");

function makeTempProject(hitlPhase: string = "design", hitlProse: string = "always defer to human"): string {
  const tempDir = mkdtempSync(join(tmpdir(), "hooks-int-"));
  mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
  writeFileSync(
    join(tempDir, ".beastmode", "config.yaml"),
    `hitl:\n  ${hitlPhase}: '${hitlProse}'\n`,
  );
  return tempDir;
}

function makeTempProjectWithGit(hitlPhase: string = "design", hitlProse: string = "always defer to human"): string {
  const tempDir = makeTempProject(hitlPhase, hitlProse);
  execSync("git init", { cwd: tempDir, encoding: "utf-8" });
  return tempDir;
}

describe("hooks-command integration", () => {
  describe("hooks hitl-auto dispatches to handler", () => {
    test("hitl-auto with phase and TOOL_INPUT produces JSON response", () => {
      const toolInput = JSON.stringify({
        questions: [{ question: "Approve?", options: [{ label: "Yes" }] }],
      });

      const tempDir = makeTempProjectWithGit("implement", "approve all tool calls without asking");

      const result = execSync(
        `bun run "${CLI_PATH}" hooks hitl-auto implement`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, TOOL_INPUT: toolInput },
        },
      );

      const parsed = JSON.parse(result.trim());
      expect(parsed.permissionDecision).toBe("allow");
      expect(parsed.updatedInput).toBeDefined();
    });
  });

  describe("hooks hitl-log dispatches to handler", () => {
    test("hitl-log with phase and env vars exits cleanly", () => {
      const toolInput = JSON.stringify({
        questions: [{ question: "Which DB?", options: [{ label: "Postgres" }] }],
        answers: { "Which DB?": "Postgres" },
      });
      const toolOutput = JSON.stringify({
        answers: { "Which DB?": "Postgres" },
      });

      const tempDir = makeTempProjectWithGit("design", "always defer to human");

      execSync(
        `bun run "${CLI_PATH}" hooks hitl-log design`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, TOOL_INPUT: toolInput, TOOL_OUTPUT: toolOutput },
        },
      );

      const logPath = join(tempDir, ".beastmode", "artifacts", "design", "hitl-log.md");
      expect(existsSync(logPath)).toBe(true);
    });
  });

  describe("hooks generate-output dispatches to handler", () => {
    test("generate-output exits cleanly", () => {
      const tempDir = makeTempProjectWithGit();

      execSync(
        `bun run "${CLI_PATH}" hooks generate-output`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env },
        },
      );
    });
  });

  describe("hooks command rejects unknown subcommands", () => {
    test("unknown subcommand exits non-zero", () => {
      const tempDir = makeTempProject();

      expect(() => {
        execSync(
          `bun run "${CLI_PATH}" hooks nonexistent`,
          {
            encoding: "utf-8",
            cwd: tempDir,
            env: { ...process.env },
          },
        );
      }).toThrow();
    });
  });

  describe("hooks command preserves env vars", () => {
    test("TOOL_INPUT is accessible to hitl-auto handler", () => {
      const toolInput = JSON.stringify({
        questions: [{ question: "Test?", options: [{ label: "Yes" }] }],
      });

      const tempDir = makeTempProjectWithGit("plan", "auto-approve everything");

      const result = execSync(
        `bun run "${CLI_PATH}" hooks hitl-auto plan`,
        {
          encoding: "utf-8",
          cwd: tempDir,
          env: { ...process.env, TOOL_INPUT: toolInput },
        },
      );

      const parsed = JSON.parse(result.trim());
      expect(parsed.updatedInput.questions[0].question).toBe("Test?");
    });
  });

  describe("hook modules have no standalone entry points", () => {
    test("hitl-auto.ts has no import.meta.main block", () => {
      const src = readFileSync(
        resolve(import.meta.dirname, "../../src/hooks/hitl-auto.ts"),
        "utf-8",
      );
      expect(src).not.toContain("import.meta.main");
    });

    test("hitl-log.ts has no import.meta.main block", () => {
      const src = readFileSync(
        resolve(import.meta.dirname, "../../src/hooks/hitl-log.ts"),
        "utf-8",
      );
      expect(src).not.toContain("import.meta.main");
    });

    test("generate-output.ts has no import.meta.main block", () => {
      const src = readFileSync(
        resolve(import.meta.dirname, "../../src/hooks/generate-output.ts"),
        "utf-8",
      );
      expect(src).not.toContain("import.meta.main");
    });
  });
});
