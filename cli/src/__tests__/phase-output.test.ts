import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import {
  findOutputFile,
  readOutput,
  loadOutput,
  readPhaseOutput,
  loadPhaseOutput,
} from "../phase-output";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-phase-output");

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "design"), {
    recursive: true,
  });
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "plan"), {
    recursive: true,
  });
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "implement"), {
    recursive: true,
  });
}

function writeOutput(
  phase: string,
  filename: string,
  content: string,
): void {
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "state", phase, filename),
    content,
  );
}

const VALID_OUTPUT = JSON.stringify({
  status: "completed",
  artifacts: { design: ".beastmode/artifacts/design/2026-03-29-my-epic.md" },
});

describe("findOutputFile", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns undefined when directory doesn't exist", () => {
    // Remove the design dir so it truly doesn't exist
    rmSync(resolve(TEST_ROOT, ".beastmode", "state", "design"), {
      recursive: true,
    });
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBeUndefined();
  });

  test("returns undefined when no matching files exist", () => {
    // Directory exists but is empty — no output files
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBeUndefined();
  });

  test("finds the most recent file by date prefix", () => {
    writeOutput("design", "2026-03-28-my-epic.output.json", VALID_OUTPUT);
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBe(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "design",
        "2026-03-28-my-epic.output.json",
      ),
    );
  });

  test("handles multiple date-prefixed files (picks latest)", () => {
    writeOutput("plan", "2026-03-25-my-epic.output.json", VALID_OUTPUT);
    writeOutput("plan", "2026-03-28-my-epic.output.json", VALID_OUTPUT);
    writeOutput("plan", "2026-03-26-my-epic.output.json", VALID_OUTPUT);

    const result = findOutputFile(TEST_ROOT, "plan", "my-epic");
    expect(result).toBe(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "plan",
        "2026-03-28-my-epic.output.json",
      ),
    );
  });

  test("does not match files for a different slug", () => {
    writeOutput("design", "2026-03-28-other-epic.output.json", VALID_OUTPUT);
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBeUndefined();
  });
});

describe("readOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("parses a valid output file", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-my-epic.output.json",
    );
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = readOutput(filePath);
    expect(result.status).toBe("completed");
    expect(result.artifacts).toEqual({
      design: ".beastmode/artifacts/design/2026-03-29-my-epic.md",
    });
  });

  test("throws on missing file", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "does-not-exist.output.json",
    );
    expect(() => readOutput(filePath)).toThrow("Phase output file not found");
  });

  test("throws on invalid JSON (corrupt file)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-bad.output.json",
    );
    writeOutput("design", "2026-03-29-bad.output.json", "not valid json {{{");

    expect(() => readOutput(filePath)).toThrow("Corrupt phase output");
  });

  test("throws on malformed structure (missing status)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-no-status.output.json",
    );
    writeOutput(
      "design",
      "2026-03-29-no-status.output.json",
      JSON.stringify({ artifacts: { design: "foo.md" } }),
    );

    expect(() => readOutput(filePath)).toThrow("Malformed phase output");
  });

  test("throws on malformed structure (missing artifacts)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-no-artifacts.output.json",
    );
    writeOutput(
      "design",
      "2026-03-29-no-artifacts.output.json",
      JSON.stringify({ status: "completed" }),
    );

    expect(() => readOutput(filePath)).toThrow("Malformed phase output");
  });
});

describe("loadOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns undefined on missing file (no throw)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "does-not-exist.output.json",
    );
    const result = loadOutput(filePath);
    expect(result).toBeUndefined();
  });

  test("returns undefined on corrupt file (no throw)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-corrupt.output.json",
    );
    writeOutput(
      "design",
      "2026-03-29-corrupt.output.json",
      "totally broken json",
    );

    const result = loadOutput(filePath);
    expect(result).toBeUndefined();
  });

  test("returns parsed output on valid file", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-my-epic.output.json",
    );
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = loadOutput(filePath);
    expect(result).toBeDefined();
    expect(result!.status).toBe("completed");
  });
});

describe("readPhaseOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("finds and reads output by phase+slug", () => {
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = readPhaseOutput(TEST_ROOT, "design", "my-epic");
    expect(result).toBeDefined();
    expect(result!.status).toBe("completed");
    expect(result!.artifacts).toEqual({
      design: ".beastmode/artifacts/design/2026-03-29-my-epic.md",
    });
  });

  test("returns undefined when no output exists", () => {
    const result = readPhaseOutput(TEST_ROOT, "design", "nonexistent");
    expect(result).toBeUndefined();
  });

  test("throws on corrupt output file", () => {
    writeOutput(
      "plan",
      "2026-03-29-my-epic.output.json",
      "broken json content",
    );

    expect(() => readPhaseOutput(TEST_ROOT, "plan", "my-epic")).toThrow(
      "Corrupt phase output",
    );
  });
});

describe("loadPhaseOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns undefined on any error", () => {
    // No output file at all
    const result = loadPhaseOutput(TEST_ROOT, "design", "nonexistent");
    expect(result).toBeUndefined();
  });

  test("returns undefined on corrupt file (no throw)", () => {
    writeOutput(
      "implement",
      "2026-03-29-my-epic.output.json",
      "{{not json}}",
    );

    const result = loadPhaseOutput(TEST_ROOT, "implement", "my-epic");
    expect(result).toBeUndefined();
  });

  test("returns parsed output on valid file", () => {
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = loadPhaseOutput(TEST_ROOT, "design", "my-epic");
    expect(result).toBeDefined();
    expect(result!.status).toBe("completed");
  });
});
