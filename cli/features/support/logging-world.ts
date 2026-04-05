/**
 * Cucumber World for logging-cleanup integration tests.
 *
 * Hybrid approach:
 * - Mock Logger/LogSink/LogEntry types for behavioral assertions (US1-5)
 * - Source analysis for structural assertions (US6-7)
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const CLI_SRC = resolve(import.meta.dirname, "../../src");

// ---------------------------------------------------------------------------
// Types — mirrors the planned Logger/LogSink/LogEntry interface
// These are test doubles; the real types will be defined by the core-logger feature
// ---------------------------------------------------------------------------

export interface LogContext {
  phase?: string;
  epic?: string;
  feature?: string;
}

export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  timestamp: Date;
  message: string;
  data: Record<string, unknown>;
  context: LogContext;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogSink {
  write(entry: LogEntry): void;
}

// ---------------------------------------------------------------------------
// Mock Sink — captures entries for assertions
// ---------------------------------------------------------------------------

export class MockSink implements LogSink {
  entries: LogEntry[] = [];
  write(entry: LogEntry): void {
    this.entries.push(entry);
  }
}

// ---------------------------------------------------------------------------
// Mock Logger — 4-level interface with sink delegation
// ---------------------------------------------------------------------------

export class MockLogger {
  private sink: LogSink;
  private ctx: LogContext;

  constructor(sink: LogSink, context?: LogContext) {
    this.sink = sink;
    this.ctx = context ?? {};
  }

  private emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    this.sink.write({
      level,
      timestamp: new Date(),
      message,
      data: data ?? {},
      context: { ...this.ctx },
    });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.emit("info", message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.emit("debug", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.emit("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.emit("error", message, data);
  }

  child(ctx: Partial<LogContext>): MockLogger {
    return new MockLogger(this.sink, { ...this.ctx, ...ctx });
  }

  // Expose method names for interface assertion (US1)
  get methodNames(): string[] {
    return ["info", "debug", "warn", "error", "child"];
  }

  hasMethod(name: string): boolean {
    return typeof (this as Record<string, unknown>)[name] === "function";
  }
}

// ---------------------------------------------------------------------------
// Verbosity-Filtering Sink — wraps another sink with level gating
// ---------------------------------------------------------------------------

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class FilteringSink implements LogSink {
  private inner: LogSink;
  private minLevel: LogLevel;
  displayed: LogEntry[] = [];

  constructor(inner: LogSink, minLevel: LogLevel) {
    this.inner = inner;
    this.minLevel = minLevel;
  }

  write(entry: LogEntry): void {
    this.inner.write(entry);
    if (LEVEL_PRIORITY[entry.level] >= LEVEL_PRIORITY[this.minLevel]) {
      this.displayed.push(entry);
    }
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// ---------------------------------------------------------------------------
// Epic/Feature Filter — filters entries by context hierarchy
// ---------------------------------------------------------------------------

export function filterEntries(
  entries: LogEntry[],
  epicFilter?: string,
  featureFilter?: string,
): LogEntry[] {
  return entries.filter((e) => {
    if (epicFilter && e.context.epic !== epicFilter) return false;
    if (featureFilter && e.context.feature !== featureFilter) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Source Scanner — finds console.log/console.error in CLI runtime source
// ---------------------------------------------------------------------------

function collectTsFiles(dir: string, exclude: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const relDir = relative(CLI_SRC, full);
      if (exclude.some((ex) => relDir.startsWith(ex))) continue;
      if (entry.name === "node_modules") continue;
      results.push(...collectTsFiles(full, exclude));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

export interface ConsoleViolation {
  file: string;
  line: number;
  text: string;
  type: "console.log" | "console.error";
}

export function scanForConsoleUsage(excludeDirs: string[] = ["../scripts"]): ConsoleViolation[] {
  const files = collectTsFiles(CLI_SRC, excludeDirs);
  const violations: ConsoleViolation[] = [];
  const pattern = /\bconsole\.(log|error)\b/g;

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(line)) !== null) {
        // Skip comments
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        violations.push({
          file: relative(CLI_SRC, file),
          line: i + 1,
          text: trimmed,
          type: `console.${match[1]}` as "console.log" | "console.error",
        });
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// World Class
// ---------------------------------------------------------------------------

export class LoggingWorld extends World {
  // ---- Mock infrastructure ----
  mockSink = new MockSink();
  logger = new MockLogger(this.mockSink);
  childLogger?: MockLogger;

  // ---- Multi-sink setup (US4) ----
  cliSink?: FilteringSink;
  dashboardSink?: FilteringSink;

  // ---- Filtering results (US3) ----
  allEntries: LogEntry[] = [];
  visibleEntries: LogEntry[] = [];

  // ---- Source scan results (US6) ----
  consoleViolations: ConsoleViolation[] = [];

  // ---- Custom sink (US5) ----
  customSinkEntries: LogEntry[] = [];

  // ---- Dashboard state (US4) ----
  dashboardVerbosity: LogLevel = "info";
  dashboardRunning = false;

  reset(): void {
    this.mockSink = new MockSink();
    this.logger = new MockLogger(this.mockSink);
    this.childLogger = undefined;
    this.cliSink = undefined;
    this.dashboardSink = undefined;
    this.allEntries = [];
    this.visibleEntries = [];
    this.consoleViolations = [];
    this.customSinkEntries = [];
    this.dashboardVerbosity = "info";
    this.dashboardRunning = false;
  }

  // ---- Factory helpers ----

  createLoggerWithContext(context: LogContext): void {
    this.mockSink = new MockSink();
    this.logger = new MockLogger(this.mockSink, context);
  }

  createLoggerWithCliSink(level: LogLevel): void {
    this.mockSink = new MockSink();
    this.cliSink = new FilteringSink(this.mockSink, level);
    this.logger = new MockLogger(this.cliSink);
  }

  attachDashboardSink(level: LogLevel = "info"): void {
    const dashboardBackend = new MockSink();
    this.dashboardSink = new FilteringSink(dashboardBackend, level);
  }

  // Emit to both sinks when dual-sink mode is active
  emitToBothSinks(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date(),
      message,
      data: data ?? {},
      context: { ...this.logger["ctx"] },
    };
    if (this.cliSink) this.cliSink.write(entry);
    if (this.dashboardSink) this.dashboardSink.write(entry);
  }
}

setWorldConstructor(LoggingWorld);
