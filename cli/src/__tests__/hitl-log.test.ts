import { describe, test, expect } from "bun:test";
import { formatLogEntry, detectTag } from "../hooks/hitl-log";
import type { ToolInput, ToolOutput } from "../hooks/hitl-log";

// --- Fixture helpers ---

function makeQuestion(overrides: Partial<ToolInput["questions"][0]> = {}) {
  return {
    question: "Which database?",
    header: "Database Selection",
    options: [
      { label: "PostgreSQL", description: "Relational DB" },
      { label: "SQLite", description: "Embedded DB" },
    ],
    multiSelect: false,
    ...overrides,
  };
}

function makeInput(overrides: Partial<ToolInput> = {}): ToolInput {
  return {
    questions: [makeQuestion()],
    ...overrides,
  };
}

function makeOutput(overrides: Partial<ToolOutput> = {}): ToolOutput {
  return {
    questions: [makeQuestion()],
    answers: { "Which database?": "PostgreSQL" },
    ...overrides,
  };
}

// --- detectTag ---

describe("detectTag", () => {
  test("returns 'auto' when answers present in input", () => {
    const input = makeInput({ answers: { "Which database?": "PostgreSQL" } });
    expect(detectTag(input)).toBe("auto");
  });

  test("returns 'human' when no answers in input", () => {
    const input = makeInput();
    delete input.answers;
    expect(detectTag(input)).toBe("human");
  });

  test("returns 'human' when answers is empty object", () => {
    const input = makeInput({ answers: {} });
    expect(detectTag(input)).toBe("human");
  });
});

// --- formatLogEntry ---

describe("formatLogEntry", () => {
  test("produces parseable markdown with timestamp", () => {
    const input = makeInput({ answers: { "Which database?": "PostgreSQL" } });
    const output = makeOutput();
    const entry = formatLogEntry(input, output, "auto");

    // ISO timestamp heading
    expect(entry).toMatch(/## \d{4}-\d{2}-\d{2}T/);
  });

  test("includes tag badge", () => {
    const input = makeInput({ answers: { "Which database?": "PostgreSQL" } });
    const output = makeOutput();
    const entry = formatLogEntry(input, output, "auto");

    expect(entry).toContain("**Tag:** auto");
  });

  test("includes question heading", () => {
    const input = makeInput();
    const output = makeOutput();
    const entry = formatLogEntry(input, output, "human");

    expect(entry).toContain("### Q: Which database?");
  });

  test("includes options", () => {
    const input = makeInput();
    const output = makeOutput();
    const entry = formatLogEntry(input, output, "human");

    expect(entry).toContain("**Options:**");
    expect(entry).toContain("PostgreSQL");
    expect(entry).toContain("SQLite");
  });

  test("includes answer", () => {
    const input = makeInput();
    const output = makeOutput();
    const entry = formatLogEntry(input, output, "human");

    expect(entry).toContain("**Answer:** PostgreSQL");
  });

  test("handles multiple questions", () => {
    const q1 = makeQuestion({ question: "Which database?" });
    const q2 = makeQuestion({
      question: "Which framework?",
      header: "Framework Selection",
      options: [
        { label: "Express", description: "Minimal" },
        { label: "Fastify", description: "Fast" },
      ],
    });
    const input: ToolInput = { questions: [q1, q2] };
    const output: ToolOutput = {
      questions: [q1, q2],
      answers: {
        "Which database?": "PostgreSQL",
        "Which framework?": "Express",
      },
    };
    const entry = formatLogEntry(input, output, "human");

    expect(entry).toContain("### Q: Which database?");
    expect(entry).toContain("### Q: Which framework?");
    expect(entry).toContain("**Answer:** PostgreSQL");
    expect(entry).toContain("**Answer:** Express");
  });

  test("handles missing answer gracefully", () => {
    const input = makeInput();
    const output: ToolOutput = {
      questions: [makeQuestion()],
      answers: {},
    };
    const entry = formatLogEntry(input, output, "human");

    expect(entry).toContain("**Answer:** (no answer)");
  });
});
