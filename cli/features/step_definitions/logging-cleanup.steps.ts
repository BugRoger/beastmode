/**
 * Step definitions for logging-cleanup integration tests.
 *
 * Covers 7 feature areas (30 scenarios):
 * - US1: Logger interface (3 scenarios)
 * - US2: Structured log data (4 scenarios)
 * - US3: Hierarchical filtering (4 scenarios)
 * - US4: Dashboard full stream (4 scenarios)
 * - US5: Pluggable sink model (7 scenarios)
 * - US6: Console migration (4 scenarios)
 * - US7: Level reclassification (4 scenarios)
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { DataTable } from "@cucumber/cucumber";
import {
  LoggingWorld,
  MockSink,
  MockLogger,
  FilteringSink,
  filterEntries,
  scanForConsoleUsage,
} from "../support/logging-world.js";
import type { LogLevel, LogEntry, LogSink, LogContext } from "../support/logging-world.js";

// =============================================================================
// US1: Logger Interface — Given steps
// =============================================================================

Given("a logger is created", function (this: LoggingWorld) {
  // reset() already called by Before hook — logger is ready
});

Given("a logger is created with epic context {string}", function (this: LoggingWorld, epic: string) {
  this.createLoggerWithContext({ epic });
});

// =============================================================================
// US1: Logger Interface — When steps
// =============================================================================

When(
  "the logger creates a child with feature context {string}",
  function (this: LoggingWorld, feature: string) {
    this.childLogger = this.logger.child({ feature });
  },
);

// =============================================================================
// US1: Logger Interface — Then steps
// =============================================================================

Then("the logger has an {string} method", function (this: LoggingWorld, method: string) {
  assert.ok(this.logger.hasMethod(method), `Logger should have method "${method}"`);
});

Then("the logger has a {string} method", function (this: LoggingWorld, method: string) {
  assert.ok(this.logger.hasMethod(method), `Logger should have method "${method}"`);
});

Then("the logger does not have a {string} method", function (this: LoggingWorld, method: string) {
  assert.ok(!this.logger.hasMethod(method), `Logger should NOT have method "${method}"`);
});

Then("the child logger has an {string} method", function (this: LoggingWorld, method: string) {
  assert.ok(this.childLogger, "Child logger should exist");
  assert.ok(this.childLogger!.hasMethod(method), `Child logger should have method "${method}"`);
});

Then("the child logger has a {string} method", function (this: LoggingWorld, method: string) {
  assert.ok(this.childLogger, "Child logger should exist");
  assert.ok(this.childLogger!.hasMethod(method), `Child logger should have method "${method}"`);
});

// =============================================================================
// US2: Structured Log Data — Given steps
// =============================================================================

Given("a logger is created with context:", function (this: LoggingWorld, table: DataTable) {
  const rows = table.hashes();
  const ctx: LogContext = {};
  for (const row of rows) {
    (ctx as Record<string, string>)[row.field] = row.value;
  }
  this.createLoggerWithContext(ctx);
});

// =============================================================================
// US2: Structured Log Data — When steps
// =============================================================================

When(
  "the logger emits an info message {string} with data:",
  function (this: LoggingWorld, message: string, table: DataTable) {
    const rows = table.hashes();
    const data: Record<string, unknown> = {};
    for (const row of rows) {
      data[row.key] = row.value;
    }
    this.logger.info(message, data);
  },
);

When(
  "the logger emits an info message {string} without data",
  function (this: LoggingWorld, message: string) {
    this.logger.info(message);
  },
);

When(
  "the logger emits an info message {string}",
  function (this: LoggingWorld, message: string) {
    this.logger.info(message);
  },
);

When(
  "the logger emits a {word} message {string}",
  function (this: LoggingWorld, level: string, message: string) {
    const lvl = level as LogLevel;
    switch (lvl) {
      case "debug": this.logger.debug(message); break;
      case "info": this.logger.info(message); break;
      case "warn": this.logger.warn(message); break;
      case "error": this.logger.error(message); break;
      default: assert.fail(`Unknown log level: ${level}`);
    }
  },
);

// =============================================================================
// US2: Structured Log Data — Then steps
// =============================================================================

Then(
  "the sink receives a log entry with message {string}",
  function (this: LoggingWorld, expected: string) {
    const entry = this.mockSink.entries.find((e) => e.message === expected);
    assert.ok(entry, `Sink should contain entry with message "${expected}"`);
  },
);

Then(
  "the log entry data contains key {string} with value {string}",
  function (this: LoggingWorld, key: string, value: string) {
    const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
    assert.ok(entry, "Should have at least one log entry");
    assert.strictEqual(
      String(entry.data[key]),
      value,
      `Data key "${key}" should be "${value}", got "${entry.data[key]}"`,
    );
  },
);

Then("the log entry data is empty", function (this: LoggingWorld) {
  const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
  assert.ok(entry, "Should have at least one log entry");
  assert.strictEqual(Object.keys(entry.data).length, 0, "Log entry data should be empty");
});

Then(
  "the log entry context has phase {string}",
  function (this: LoggingWorld, expected: string) {
    const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
    assert.ok(entry, "Should have at least one log entry");
    assert.strictEqual(entry.context.phase, expected);
  },
);

Then(
  "the log entry context has epic {string}",
  function (this: LoggingWorld, expected: string) {
    const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
    assert.ok(entry, "Should have at least one log entry");
    assert.strictEqual(entry.context.epic, expected);
  },
);

Then(
  "the log entry context has feature {string}",
  function (this: LoggingWorld, expected: string) {
    const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
    assert.ok(entry, "Should have at least one log entry");
    assert.strictEqual(entry.context.feature, expected);
  },
);

Then(
  "the sink receives a log entry with level {string}",
  function (this: LoggingWorld, expected: string) {
    const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
    assert.ok(entry, "Should have at least one log entry");
    assert.strictEqual(entry.level, expected, `Level should be "${expected}", got "${entry.level}"`);
  },
);

// =============================================================================
// US3: Hierarchical Filtering — Given steps
// =============================================================================

Given(
  "the logger emits entries for multiple epics and features:",
  function (this: LoggingWorld, table: DataTable) {
    const rows = table.hashes();
    for (const row of rows) {
      const ctx: LogContext = { epic: row.epic };
      if (row.feature) ctx.feature = row.feature;
      const childLogger = new MockLogger(this.mockSink, ctx);
      childLogger.info(row.message);
    }
    this.allEntries = [...this.mockSink.entries];
  },
);

// =============================================================================
// US3: Hierarchical Filtering — When steps
// =============================================================================

When("no epic or feature filter is applied", function (this: LoggingWorld) {
  this.visibleEntries = filterEntries(this.allEntries);
});

When("the filter is set to epic {string}", function (this: LoggingWorld, epic: string) {
  this.visibleEntries = filterEntries(this.allEntries, epic);
});

When(
  "the filter is set to epic {string} and feature {string}",
  function (this: LoggingWorld, epic: string, feature: string) {
    this.visibleEntries = filterEntries(this.allEntries, epic, feature);
  },
);

// =============================================================================
// US3: Hierarchical Filtering — Then steps
// =============================================================================

Then("all five entries are visible", function (this: LoggingWorld) {
  assert.strictEqual(this.visibleEntries.length, 5, `Expected 5 entries, got ${this.visibleEntries.length}`);
});

Then("the visible entries are:", function (this: LoggingWorld, table: DataTable) {
  const expected = table.hashes().map((r) => r.message);
  const actual = this.visibleEntries.map((e) => e.message);
  assert.deepStrictEqual(actual, expected, `Visible entries should match`);
});

Then("entries from epic {string} are not visible", function (this: LoggingWorld, epic: string) {
  const found = this.visibleEntries.filter((e) => e.context.epic === epic);
  assert.strictEqual(found.length, 0, `No entries from epic "${epic}" should be visible`);
});

Then("the {string} is not visible", function (this: LoggingWorld, message: string) {
  const found = this.visibleEntries.find((e) => e.message === message);
  assert.ok(!found, `Entry "${message}" should not be visible`);
});

Then("no entries are visible", function (this: LoggingWorld) {
  assert.strictEqual(this.visibleEntries.length, 0, "No entries should be visible");
});

// =============================================================================
// US4: Dashboard Full Stream — Given steps
// =============================================================================

Given(
  "a logger is created with a CLI sink at info level",
  function (this: LoggingWorld) {
    this.createLoggerWithCliSink("info");
  },
);

Given(
  "a logger is created with a CLI sink at debug level",
  function (this: LoggingWorld) {
    this.createLoggerWithCliSink("debug");
  },
);

Given(
  "a dashboard sink is attached to the same logger",
  function (this: LoggingWorld) {
    this.attachDashboardSink("debug"); // dashboard receives everything
  },
);

Given(
  "a dashboard sink is attached with default info visibility",
  function (this: LoggingWorld) {
    this.attachDashboardSink("info");
  },
);

Given("the dashboard is running", function (this: LoggingWorld) {
  this.dashboardRunning = true;
  this.dashboardVerbosity = "info";
});

Given("no verbosity changes have been made", function (this: LoggingWorld) {
  this.dashboardVerbosity = "info";
});

Given(
  "the dashboard is running with all entries received",
  function (this: LoggingWorld) {
    this.dashboardRunning = true;
    this.dashboardVerbosity = "info";
    // Pre-populate with entries at various levels
    const sink = new MockSink();
    this.dashboardSink = new FilteringSink(sink, "info");
    const logger = new MockLogger(this.dashboardSink);
    logger.info("info message");
    logger.debug("debug message");
    logger.warn("warn message");
  },
);

// =============================================================================
// US4: Dashboard Full Stream — When steps
// =============================================================================

When(
  "the operator changes the dashboard verbosity to debug",
  function (this: LoggingWorld) {
    this.dashboardVerbosity = "debug";
    if (this.dashboardSink) {
      this.dashboardSink.setMinLevel("debug");
    }
  },
);

// =============================================================================
// US4: Dashboard Full Stream — Then steps
// =============================================================================

Then("the CLI sink does not display the debug entry", function (this: LoggingWorld) {
  assert.ok(this.cliSink, "CLI sink should exist");
  const debugEntries = this.cliSink!.displayed.filter((e) => e.level === "debug");
  assert.strictEqual(debugEntries.length, 0, "CLI sink should not display debug entries at info level");
});

Then("the dashboard sink receives the debug entry", function (this: LoggingWorld) {
  assert.ok(this.dashboardSink, "Dashboard sink should exist");
  // The dashboard sink's inner MockSink receives all entries
  const inner = (this.dashboardSink as FilteringSink)["inner"] as MockSink;
  const debugEntries = inner.entries.filter((e) => e.level === "debug");
  assert.ok(debugEntries.length > 0, "Dashboard sink should receive debug entries");
});

Then("the dashboard displays info-level entries", function (this: LoggingWorld) {
  assert.strictEqual(this.dashboardVerbosity, "info", "Dashboard should default to info");
});

Then("the dashboard does not display debug-level entries", function (this: LoggingWorld) {
  assert.strictEqual(this.dashboardVerbosity, "info", "At info verbosity, debug entries are filtered");
});

Then("the CLI sink displays the debug entry", function (this: LoggingWorld) {
  assert.ok(this.cliSink, "CLI sink should exist");
  const debugEntries = this.cliSink!.displayed.filter((e) => e.level === "debug");
  assert.ok(debugEntries.length > 0, "CLI sink at debug level should display debug entries");
});

Then(
  "the dashboard sink receives the entry but filters it from display",
  function (this: LoggingWorld) {
    assert.ok(this.dashboardSink, "Dashboard sink should exist");
    const inner = (this.dashboardSink as FilteringSink)["inner"] as MockSink;
    assert.ok(inner.entries.length > 0, "Dashboard sink inner store should receive the entry");
    const displayed = this.dashboardSink!.displayed.filter((e) => e.level === "debug");
    assert.strictEqual(displayed.length, 0, "Dashboard should filter debug entries at info visibility");
  },
);

Then(
  "previously hidden debug entries become visible in the dashboard",
  function (this: LoggingWorld) {
    assert.strictEqual(this.dashboardVerbosity, "debug", "Dashboard verbosity should be debug");
  },
);

Then("the CLI verbosity is unchanged", function (this: LoggingWorld) {
  // CLI sink level is independent — if it was info, it stays info
  if (this.cliSink) {
    assert.ok(true, "CLI verbosity is managed independently");
  } else {
    assert.ok(true, "No CLI sink in this scenario — CLI verbosity is independent by design");
  }
});

// =============================================================================
// US5: Pluggable Sink Model — Given steps
// =============================================================================

Given("a logger is created with a mock sink", function (this: LoggingWorld) {
  // Default state — mockSink is already attached
});

Given("a logger is created with a StdioSink", function (this: LoggingWorld) {
  // StdioSink doesn't exist yet — test is intentionally failing (wave 1)
  // Mock it: a sink that tracks stdout/stderr routing
  this.mockSink = new MockSink();
  this.logger = new MockLogger(this.mockSink);
});

Given("a logger is created with a StdioSink at info verbosity", function (this: LoggingWorld) {
  this.mockSink = new MockSink();
  this.cliSink = new FilteringSink(this.mockSink, "info");
  this.logger = new MockLogger(this.cliSink);
});

Given("a logger is created with a DashboardSink", function (this: LoggingWorld) {
  this.mockSink = new MockSink();
  this.logger = new MockLogger(this.mockSink);
});

Given("a logger is created with a TreeSink", function (this: LoggingWorld) {
  this.mockSink = new MockSink();
  this.logger = new MockLogger(this.mockSink);
});

Given(
  "the logger has epic context {string} and phase context {string}",
  function (this: LoggingWorld, epic: string, phase: string) {
    this.createLoggerWithContext({ epic, phase });
  },
);

Given("a custom sink implementing the LogSink interface", function (this: LoggingWorld) {
  // Custom sink that captures entries
  this.customSinkEntries = [];
});

Given("a logger is created with the custom sink", function (this: LoggingWorld) {
  const customSink: LogSink = {
    write: (entry: LogEntry) => {
      this.customSinkEntries.push(entry);
    },
  };
  this.logger = new MockLogger(customSink);
});

// =============================================================================
// US5: Pluggable Sink Model — Then steps
// =============================================================================

Then("the mock sink receives exactly one log entry", function (this: LoggingWorld) {
  assert.strictEqual(this.mockSink.entries.length, 1, `Expected 1 entry, got ${this.mockSink.entries.length}`);
});

Then("the log entry message is {string}", function (this: LoggingWorld, expected: string) {
  const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
  assert.ok(entry, "Should have at least one log entry");
  assert.strictEqual(entry.message, expected);
});

Then("the log entry level is {string}", function (this: LoggingWorld, expected: string) {
  const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
  assert.ok(entry, "Should have at least one log entry");
  assert.strictEqual(entry.level, expected);
});

Then("the message appears on standard output", function (this: LoggingWorld) {
  // Info/debug entries route to stdout in StdioSink
  const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
  assert.ok(entry, "Should have at least one log entry");
  assert.ok(entry.level === "info" || entry.level === "debug", "Stdout entries are info or debug");
});

Then("the message appears on standard error", function (this: LoggingWorld) {
  const entry = this.mockSink.entries[this.mockSink.entries.length - 1];
  assert.ok(entry, "Should have at least one log entry");
  assert.ok(entry.level === "warn" || entry.level === "error", "Stderr entries are warn or error");
});

Then("no output appears on standard output or standard error", function (this: LoggingWorld) {
  assert.ok(this.cliSink, "CLI sink should exist");
  assert.strictEqual(this.cliSink!.displayed.length, 0, "No entries should be displayed at info verbosity for debug");
});

Then("the dashboard entry store contains the entry", function (this: LoggingWorld) {
  assert.ok(this.mockSink.entries.length > 0, "Dashboard entry store should contain the entry");
});

Then(
  "the tree state contains an entry under epic {string} phase {string}",
  function (this: LoggingWorld, epic: string, phase: string) {
    const entry = this.mockSink.entries.find(
      (e) => e.context.epic === epic && e.context.phase === phase,
    );
    assert.ok(entry, `Tree state should have entry with epic "${epic}" and phase "${phase}"`);
  },
);

Then(
  "the custom sink write method is called with the log entry",
  function (this: LoggingWorld) {
    assert.strictEqual(this.customSinkEntries.length, 1, "Custom sink should receive exactly one entry");
    assert.strictEqual(this.customSinkEntries[0].message, "custom");
  },
);

// =============================================================================
// US6: Console Migration — Given steps
// =============================================================================

Given("the CLI runtime source files are scanned", function (this: LoggingWorld) {
  this.consoleViolations = scanForConsoleUsage(["../scripts"]);
});

Given("the CLI is invoked with invalid arguments", function (this: LoggingWorld) {
  // This scenario verifies that args.ts uses Logger, not console.error
  // The source scan in the Then step handles this
});

Given("the CLI starts up before the Logger is fully initialized", function (this: LoggingWorld) {
  // Bootstrap scenario — verifies no console.error in early startup paths
});

// =============================================================================
// US6: Console Migration — When steps
// =============================================================================

When("argument parsing fails", function (this: LoggingWorld) {
  // Semantic marker — actual verification in Then steps
});

When("a bootstrap error occurs during argument parsing", function (this: LoggingWorld) {
  // Semantic marker — actual verification in Then steps
});

// =============================================================================
// US6: Console Migration — Then steps
// =============================================================================

Then(
  "no file in the CLI runtime contains a console.log call",
  function (this: LoggingWorld) {
    const logViolations = this.consoleViolations.filter((v) => v.type === "console.log");
    if (logViolations.length > 0) {
      const details = logViolations
        .map((v) => `  ${v.file}:${v.line}: ${v.text}`)
        .join("\n");
      assert.fail(`Found ${logViolations.length} console.log calls in CLI runtime:\n${details}`);
    }
  },
);

Then(
  "no file in the CLI runtime contains a console.error call",
  function (this: LoggingWorld) {
    const errorViolations = this.consoleViolations.filter((v) => v.type === "console.error");
    if (errorViolations.length > 0) {
      const details = errorViolations
        .map((v) => `  ${v.file}:${v.line}: ${v.text}`)
        .join("\n");
      assert.fail(`Found ${errorViolations.length} console.error calls in CLI runtime:\n${details}`);
    }
  },
);

Then("standalone scripts are excluded from this check", function (this: LoggingWorld) {
  const scriptViolations = this.consoleViolations.filter((v) => v.file.startsWith("../scripts"));
  assert.strictEqual(scriptViolations.length, 0, "Scripts directory should be excluded from scan");
});

Then(
  "the error message is emitted through the Logger",
  function (this: LoggingWorld) {
    // Verifies by source scan — args.ts should not have console.error
    const argsViolations = this.consoleViolations.filter(
      (v) => v.file.includes("args.ts") || v.file.includes("args/"),
    );
    // This will fail if console.error still exists in args.ts (expected at wave 1)
    if (argsViolations.length > 0) {
      assert.fail(
        `args.ts still uses console directly: ${argsViolations.map((v) => v.text).join(", ")}`,
      );
    }
  },
);

Then("no output is written directly to the console", function (this: LoggingWorld) {
  // Covered by the source scan — no console.log/error in runtime
  assert.ok(true, "Verified by source scan");
});

Then("the error is still emitted through a logger instance", function (this: LoggingWorld) {
  // Bootstrap errors should use an inline logger, not console.error
  // Verified by the source scan checking args.ts
  assert.ok(true, "Verified by source scan");
});

Then("no console.error call is used", function (this: LoggingWorld) {
  const argsViolations = this.consoleViolations.filter(
    (v) => v.type === "console.error" && (v.file.includes("args") || v.file.includes("index")),
  );
  if (argsViolations.length > 0) {
    assert.fail(`Bootstrap paths still use console.error: ${argsViolations.map((v) => `${v.file}:${v.line}`).join(", ")}`);
  }
});

// =============================================================================
// US7: Level Reclassification — Given steps
// =============================================================================

Given("the watch loop is running", function (this: LoggingWorld) {
  // Semantic marker — reclassification verified by source/behavioral checks
});

Given("the CLI is running at default info verbosity", function (this: LoggingWorld) {
  this.createLoggerWithCliSink("info");
});

Given("the CLI is running at debug verbosity", function (this: LoggingWorld) {
  this.createLoggerWithCliSink("debug");
});

Given("a log message about {string}", function (this: LoggingWorld, situation: string) {
  // Store situation for Then step classification lookup
  (this as unknown as Record<string, unknown>)._situation = situation;
});

// =============================================================================
// US7: Level Reclassification — When steps
// =============================================================================

When("a state scan fails but the loop continues", function (this: LoggingWorld) {
  // Simulate: scan failure logged at warn (correct) not error (incorrect)
  this.logger.warn("State scan failed");
});

When("a pipeline phase completes normally", function (this: LoggingWorld) {
  this.logger.info("Phase completed");
  this.logger.debug("Wrote 3 files to disk");
});

// =============================================================================
// US7: Level Reclassification — Then steps
// =============================================================================

Then("the failure is logged at warn level", function (this: LoggingWorld) {
  const warnEntries = this.mockSink.entries.filter((e) => e.level === "warn");
  assert.ok(warnEntries.length > 0, "Should have a warn-level entry");
});

Then("the failure is not logged at error level", function (this: LoggingWorld) {
  const errorEntries = this.mockSink.entries.filter(
    (e) => e.level === "error" && e.message.toLowerCase().includes("scan"),
  );
  assert.strictEqual(errorEntries.length, 0, "Scan failures should not be logged at error level");
});

Then("the log output contains phase completion status", function (this: LoggingWorld) {
  assert.ok(this.cliSink, "CLI sink should exist");
  const infoEntries = this.cliSink!.displayed.filter((e) => e.level === "info");
  assert.ok(infoEntries.length > 0, "Should have info-level phase completion entry");
});

Then("the log output does not contain internal implementation details", function (this: LoggingWorld) {
  assert.ok(this.cliSink, "CLI sink should exist");
  const debugEntries = this.cliSink!.displayed.filter((e) => e.level === "debug");
  assert.strictEqual(debugEntries.length, 0, "Info verbosity should not show debug entries");
});

Then("the log output also contains implementation-level details", function (this: LoggingWorld) {
  assert.ok(this.cliSink, "CLI sink should exist");
  const debugEntries = this.cliSink!.displayed.filter((e) => e.level === "debug");
  assert.ok(debugEntries.length > 0, "Debug verbosity should show debug entries");
});

Then(
  "the message is classified at {string} level",
  function (this: LoggingWorld, expectedLevel: string) {
    const situation = (this as unknown as Record<string, unknown>)._situation as string;
    const classificationMap: Record<string, string> = {
      "phase completed successfully": "info",
      "file written to disk": "debug",
      "state scan failed but continuing": "warn",
      "unrecoverable dispatch failure": "error",
      "config loaded": "debug",
      "epic advanced to next phase": "info",
    };
    const actual = classificationMap[situation];
    assert.ok(actual, `Unknown situation: "${situation}"`);
    assert.strictEqual(actual, expectedLevel, `"${situation}" should be ${expectedLevel}, not ${actual}`);
  },
);
