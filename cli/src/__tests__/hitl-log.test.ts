import { describe, test, expect } from "bun:test";
import {
  formatLogEntry,
  detectTag,
  isFilePermissionInput,
  detectFilePermissionTag,
  inferToolName,
  formatFilePermissionLogEntry,
  routeAndFormat,
} from "../hooks/hitl-log";
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

// --- File Permission Detection ---

describe("isFilePermissionInput", () => {
  test("returns true for Write-shaped input", () => {
    const raw = { file_path: "/tmp/test.ts", content: "hello" };
    expect(isFilePermissionInput(raw)).toBe(true);
  });

  test("returns true for Edit-shaped input", () => {
    const raw = { file_path: "/tmp/test.ts", old_string: "old", new_string: "new" };
    expect(isFilePermissionInput(raw)).toBe(true);
  });

  test("returns false for AskUserQuestion-shaped input", () => {
    const raw = { questions: [{ question: "Which DB?" }] };
    expect(isFilePermissionInput(raw)).toBe(false);
  });

  test("returns false for empty object", () => {
    expect(isFilePermissionInput({})).toBe(false);
  });

  test("returns false for null", () => {
    expect(isFilePermissionInput(null)).toBe(false);
  });
});

describe("inferToolName", () => {
  test("returns Write when input has content field", () => {
    expect(inferToolName({ file_path: "/tmp/f.ts", content: "x" })).toBe("Write");
  });

  test("returns Edit when input has old_string field", () => {
    expect(inferToolName({ file_path: "/tmp/f.ts", old_string: "a", new_string: "b" })).toBe("Edit");
  });

  test("returns Write as default when only file_path present", () => {
    expect(inferToolName({ file_path: "/tmp/f.ts" })).toBe("Write");
  });
});

describe("detectFilePermissionTag", () => {
  test("returns auto-allow for successful output", () => {
    expect(detectFilePermissionTag("File written successfully")).toBe("auto-allow");
  });

  test("returns auto-allow for empty output (success)", () => {
    expect(detectFilePermissionTag("")).toBe("auto-allow");
  });

  test("returns auto-deny when output contains denied", () => {
    expect(detectFilePermissionTag("Permission denied by hook")).toBe("auto-deny");
  });

  test("returns auto-deny when output contains blocked", () => {
    expect(detectFilePermissionTag("Tool use blocked")).toBe("auto-deny");
  });

  test("returns auto-deny when output contains permissionDecision deny", () => {
    expect(detectFilePermissionTag(JSON.stringify({ permissionDecision: "deny" }))).toBe("auto-deny");
  });

  test("returns deferred when output contains user approved", () => {
    expect(detectFilePermissionTag("User approved the operation")).toBe("deferred");
  });
});

describe("formatFilePermissionLogEntry", () => {
  test("produces markdown with timestamp heading", () => {
    const entry = formatFilePermissionLogEntry("Write", "/tmp/test.ts", "auto-allow");
    expect(entry).toMatch(/## \d{4}-\d{2}-\d{2}T/);
  });

  test("includes tag", () => {
    const entry = formatFilePermissionLogEntry("Write", "/tmp/test.ts", "auto-allow");
    expect(entry).toContain("**Tag:** auto-allow");
  });

  test("includes tool name", () => {
    const entry = formatFilePermissionLogEntry("Edit", "/tmp/test.ts", "auto-deny");
    expect(entry).toContain("**Tool:** Edit");
  });

  test("includes file path", () => {
    const entry = formatFilePermissionLogEntry("Write", ".claude/settings.local.json", "auto-allow");
    expect(entry).toContain("**File:** .claude/settings.local.json");
  });

  test("includes decision line matching tag", () => {
    const entry = formatFilePermissionLogEntry("Write", "/tmp/f.ts", "deferred");
    expect(entry).toContain("**Decision:** deferred");
  });

  test("format is distinct from AskUserQuestion entries (no Q: heading)", () => {
    const entry = formatFilePermissionLogEntry("Write", "/tmp/f.ts", "auto-allow");
    expect(entry).not.toContain("### Q:");
    expect(entry).not.toContain("**Options:**");
    expect(entry).not.toContain("**Answer:**");
  });
});

// --- CLI routing logic ---

describe("routeAndFormat", () => {
  test("routes AskUserQuestion input to HITL formatter", () => {
    const input = { questions: [{ question: "Which DB?", options: [{ label: "PG" }] }] };
    const output = { answers: { "Which DB?": "PG" } };
    const result = routeAndFormat(JSON.stringify(input), JSON.stringify(output));
    expect(result).not.toBeNull();
    expect(result).toContain("### Q: Which DB?");
    expect(result).toContain("**Tag:** human");
  });

  test("routes Write input to file permission formatter", () => {
    const input = { file_path: ".claude/settings.json", content: "{}" };
    const output = "File written successfully";
    const result = routeAndFormat(JSON.stringify(input), output);
    expect(result).not.toBeNull();
    expect(result).toContain("**Tool:** Write");
    expect(result).toContain("**File:** .claude/settings.json");
    expect(result).toContain("**Tag:** auto-allow");
  });

  test("routes Edit input to file permission formatter", () => {
    const input = { file_path: ".claude/settings.json", old_string: "a", new_string: "b" };
    const output = "Edit applied";
    const result = routeAndFormat(JSON.stringify(input), output);
    expect(result).not.toBeNull();
    expect(result).toContain("**Tool:** Edit");
    expect(result).toContain("**Tag:** auto-allow");
  });

  test("returns null for unparseable input", () => {
    const result = routeAndFormat("not json{{{", "output");
    expect(result).toBeNull();
  });

  test("returns null for unknown input shape", () => {
    const result = routeAndFormat(JSON.stringify({ random: "data" }), "output");
    expect(result).toBeNull();
  });
});
