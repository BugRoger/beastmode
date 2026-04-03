# Tree View Component — Implementation Tasks

## Goal

Build an Ink `<TreeView />` React component that renders pipeline state as a terminal tree with `│ ·` connectors and phase-based coloring. The component accepts tree state as props and renders epic > phase > feature hierarchy with leaf messages.

## Architecture

- **Runtime:** Bun + TypeScript (ESNext, jsx: react-jsx)
- **UI:** React 19 + Ink 6.8.0 for terminal rendering
- **Coloring:** chalk 5.4.1 (existing PHASE_COLOR map)
- **Testing:** bun:test with ANSI stripping

## Design Constraints (locked)

- Phase coloring: design=magenta, plan=blue, implement=yellow, validate=cyan, release=green, done=green (dimmed), cancelled=red
- Tree connectors: `│ ` (phase), `│ │ ` (feature), `│ · ` (leaf under phase), `│ │ · ` (leaf under feature)
- System messages render flat (no tree prefix)
- Leaf format: `[tree-prefix] [HH:MM:SS] LEVEL  message` — no scope, no phase column
- Full scrollback: all entries rendered, no truncation, normal terminal buffer
- Warn/error: yellow/red full-line coloring overrides phase color

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/dashboard/tree-types.ts` | Create | Tree data types: TreeNode, TreeEntry, TreeState |
| `src/dashboard/tree-format.ts` | Create | Pure functions: buildTreePrefix, formatTreeLine |
| `src/dashboard/TreeView.tsx` | Create | Ink component: renders TreeState as terminal tree |
| `src/__tests__/tree-format.test.ts` | Create | Unit tests for tree prefix/line formatting |
| `src/__tests__/tree-view.test.ts` | Create | Snapshot tests for TreeView component rendering |

---

## Task 0: Tree Data Types

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/dashboard/tree-types.ts`

- [x] **Step 1: Create tree data types**

```typescript
/**
 * Tree data types for the hierarchical log view.
 *
 * Three-level hierarchy: Epic > Phase > Feature
 * Leaf entries attach to phases (no feature) or features.
 */

import type { LogLevel } from "../logger.js";

/** A leaf log entry in the tree. */
export interface TreeEntry {
  /** Timestamp in milliseconds since epoch. */
  timestamp: number;
  /** Log level for coloring. */
  level: LogLevel;
  /** Message text. */
  message: string;
  /** Unique sequence number for stable ordering. */
  seq: number;
}

/** A feature node under a phase. */
export interface FeatureNode {
  /** Feature slug. */
  slug: string;
  /** Leaf entries under this feature. */
  entries: TreeEntry[];
}

/** A phase node under an epic. */
export interface PhaseNode {
  /** Phase name (design, plan, implement, validate, release). */
  phase: string;
  /** Feature nodes under this phase (implement fan-out). */
  features: FeatureNode[];
  /** Leaf entries directly under the phase (no feature). */
  entries: TreeEntry[];
}

/** An epic node — top level of the tree. */
export interface EpicNode {
  /** Epic slug. */
  slug: string;
  /** Phase nodes under this epic. */
  phases: PhaseNode[];
}

/** System-level entry — renders flat, no tree prefix. */
export interface SystemEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  seq: number;
}

/** Full tree state passed to the TreeView component. */
export interface TreeState {
  /** Epic trees, ordered by creation time. */
  epics: EpicNode[];
  /** System-level messages (startup, shutdown, etc.). */
  system: SystemEntry[];
}
```

- [x] **Step 2: Verify the file compiles**

Run: `bunx tsc --noEmit src/dashboard/tree-types.ts`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add src/dashboard/tree-types.ts
git commit -m "feat(tree-view): add tree data types"
```

---

## Task 1: Tree Format Functions

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `src/dashboard/tree-format.ts`
- Create: `src/__tests__/tree-format.test.ts`

- [x] **Step 1: Write the failing tests**

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import chalk from "chalk";
import { buildTreePrefix, formatTreeLine } from "../dashboard/tree-format";
import type { LogLevel } from "../logger";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("buildTreePrefix", () => {
  test("epic level returns empty string", () => {
    expect(buildTreePrefix("epic")).toBe("");
  });

  test("phase level returns vertical bar prefix", () => {
    expect(buildTreePrefix("phase")).toBe("│ ");
  });

  test("feature level returns double vertical bar prefix", () => {
    expect(buildTreePrefix("feature")).toBe("│ │ ");
  });

  test("leaf-phase level returns bar-dot prefix", () => {
    expect(buildTreePrefix("leaf-phase")).toBe("│ · ");
  });

  test("leaf-feature level returns double-bar-dot prefix", () => {
    expect(buildTreePrefix("leaf-feature")).toBe("│ │ · ");
  });
});

describe("formatTreeLine", () => {
  let savedLevel: typeof chalk.level;

  beforeEach(() => {
    savedLevel = chalk.level;
    chalk.level = 0; // No ANSI for content assertions
  });

  afterEach(() => {
    chalk.level = savedLevel;
  });

  test("leaf line has timestamp, level, message — no scope, no phase column", () => {
    const line = formatTreeLine("leaf-phase", "info", "plan", "hello world", 1000);
    // Format: [prefix] [HH:MM:SS] LEVEL  message
    expect(line).toMatch(/^│ · \d{2}:\d{2}:\d{2} INFO  hello world$/);
  });

  test("leaf-feature line uses double-depth prefix", () => {
    const line = formatTreeLine("leaf-feature", "info", "implement", "building", 1000);
    expect(line).toMatch(/^│ │ · \d{2}:\d{2}:\d{2} INFO  building$/);
  });

  test("warn line gets full yellow treatment", () => {
    chalk.level = 3;
    const line = formatTreeLine("leaf-phase", "warn", "plan", "watch out", 1000);
    expect(line).toContain("\x1b[33m"); // yellow ANSI
  });

  test("error line gets full red treatment", () => {
    chalk.level = 3;
    const line = formatTreeLine("leaf-phase", "error", "plan", "bad stuff", 1000);
    expect(line).toContain("\x1b[31m"); // red ANSI
  });

  test("system line has no prefix", () => {
    const line = formatTreeLine("system", "info", undefined, "startup complete", 1000);
    expect(line).toMatch(/^\d{2}:\d{2}:\d{2} INFO  startup complete$/);
  });

  test("phase coloring applied to connectors on normal lines", () => {
    chalk.level = 3;
    const line = formatTreeLine("leaf-phase", "info", "plan", "thinking", 1000);
    // The prefix should contain blue ANSI (plan = blue)
    expect(line).toContain("\x1b[34m"); // blue ANSI
  });

  test("epic node renders as label", () => {
    const line = formatTreeLine("epic", "info", undefined, "my-epic", 1000);
    expect(line).toBe("my-epic");
  });

  test("phase node renders with prefix and colored label", () => {
    chalk.level = 0;
    const line = formatTreeLine("phase", "info", "plan", "plan", 1000);
    expect(line).toBe("│ plan");
  });

  test("feature node renders with double prefix and label", () => {
    chalk.level = 0;
    const line = formatTreeLine("feature", "info", "implement", "write-plan", 1000);
    expect(line).toBe("│ │ write-plan");
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/tree-format.test.ts`
Expected: FAIL — module not found

- [x] **Step 3: Implement tree-format.ts**

```typescript
/**
 * Pure formatting functions for tree-mode log output.
 *
 * Builds tree prefixes (│ · connectors) and formats leaf lines
 * with timestamp + level + message (no scope, no phase column).
 */

import chalk from "chalk";
import type { LogLevel } from "../logger.js";

/** Depth level in the tree hierarchy. */
export type TreeDepth =
  | "epic"          // top-level — no prefix
  | "phase"         // │
  | "feature"       // │ │
  | "leaf-phase"    // │ ·
  | "leaf-feature"  // │ │ ·
  | "system";       // flat — no prefix

/** Phase-to-color mapping (matches dashboard convention). */
const PHASE_COLOR: Record<string, string> = {
  design: "magenta",
  plan: "blue",
  implement: "yellow",
  validate: "cyan",
  release: "green",
  done: "green",
  cancelled: "red",
};

/** Level labels — fixed 5-char width (matches logger.ts). */
const LEVEL_LABELS: Record<LogLevel, string> = {
  info:   "INFO ",
  detail: "DETL ",
  debug:  "DEBUG",
  trace:  "TRACE",
  warn:   "WARN ",
  error:  "ERR  ",
};

/**
 * Build the tree connector prefix for a given depth.
 */
export function buildTreePrefix(depth: TreeDepth): string {
  switch (depth) {
    case "epic":
    case "system":
      return "";
    case "phase":
      return "│ ";
    case "feature":
      return "│ │ ";
    case "leaf-phase":
      return "│ · ";
    case "leaf-feature":
      return "│ │ · ";
  }
}

/**
 * Format a timestamp (ms since epoch) to HH:MM:SS.
 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

/**
 * Colorize tree prefix connectors with the phase color.
 */
function colorPrefix(prefix: string, phase: string | undefined): string {
  if (!prefix || !phase) return prefix;
  const color = PHASE_COLOR[phase];
  if (!color) return prefix;
  return (chalk as any)[color](prefix);
}

/**
 * Format a single tree line.
 *
 * For node labels (epic, phase, feature): renders prefix + label.
 * For leaf entries: renders prefix + HH:MM:SS + LEVEL + message.
 * For system entries: renders HH:MM:SS + LEVEL + message (no prefix).
 *
 * Warn/error: full-line yellow/red coloring.
 * Normal: phase-colored prefix, dimmed timestamp.
 */
export function formatTreeLine(
  depth: TreeDepth,
  level: LogLevel,
  phase: string | undefined,
  message: string,
  timestamp: number,
): string {
  const prefix = buildTreePrefix(depth);

  // Node labels (epic, phase, feature) — just prefix + message
  if (depth === "epic") {
    return message;
  }
  if (depth === "phase") {
    const color = phase ? PHASE_COLOR[phase] : undefined;
    const label = color ? (chalk as any)[color](message) : message;
    return `${colorPrefix(prefix, phase)}${label}`;
  }
  if (depth === "feature") {
    return `${colorPrefix(prefix, phase)}${message}`;
  }

  // Leaf and system entries — timestamp + level + message
  const time = formatTime(timestamp);
  const label = LEVEL_LABELS[level];

  // Warn/error: full-line coloring
  if (level === "warn") {
    return chalk.yellow(`${prefix}${time} ${label} ${message}`);
  }
  if (level === "error") {
    return chalk.red(`${prefix}${time} ${label} ${message}`);
  }

  // Normal: phase-colored prefix, dim timestamp
  if (depth === "system") {
    return `${chalk.dim(time)} ${chalk.green(label)} ${message}`;
  }

  return `${colorPrefix(prefix, phase)}${chalk.dim(time)} ${chalk.green(label)} ${message}`;
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `bun test src/__tests__/tree-format.test.ts`
Expected: PASS — all tests green

- [x] **Step 5: Commit**

```bash
git add src/dashboard/tree-format.ts src/__tests__/tree-format.test.ts
git commit -m "feat(tree-view): add tree format functions with tests"
```

---

## Task 2: TreeView Ink Component

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Create: `src/dashboard/TreeView.tsx`
- Create: `src/__tests__/tree-view.test.ts`

- [x] **Step 1: Write the failing tests**

```typescript
import { describe, test, expect } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import TreeView from "../dashboard/TreeView";
import type { TreeState, EpicNode, PhaseNode, TreeEntry, SystemEntry } from "../dashboard/tree-types";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function makeEntry(msg: string, seq: number, level: "info" | "warn" | "error" = "info"): TreeEntry {
  return { timestamp: 1000, level, message: msg, seq };
}

function makeSystemEntry(msg: string, seq: number): SystemEntry {
  return { timestamp: 1000, level: "info", message: msg, seq };
}

describe("TreeView", () => {
  test("renders empty state when no epics or system entries", () => {
    const state: TreeState = { epics: [], system: [] };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    expect(output).toContain("no activity");
  });

  test("renders epic label at top level", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [],
      }],
      system: [],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    expect(output).toContain("my-epic");
  });

  test("renders phase node indented under epic", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "plan",
          features: [],
          entries: [],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    expect(output).toContain("│ plan");
  });

  test("renders leaf entries under phase with bar-dot prefix", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "plan",
          features: [],
          entries: [makeEntry("thinking hard", 1)],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    expect(output).toContain("│ ·");
    expect(output).toContain("thinking hard");
  });

  test("renders feature node under phase with double prefix", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "implement",
          features: [{
            slug: "write-plan",
            entries: [],
          }],
          entries: [],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    expect(output).toContain("│ │ write-plan");
  });

  test("renders leaf entries under feature with double-bar-dot prefix", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "implement",
          features: [{
            slug: "write-plan",
            entries: [makeEntry("compiling", 1)],
          }],
          entries: [],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    expect(output).toContain("│ │ ·");
    expect(output).toContain("compiling");
  });

  test("renders system entries flat (no tree prefix)", () => {
    const state: TreeState = {
      epics: [],
      system: [makeSystemEntry("pipeline started", 1)],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    expect(output).toContain("pipeline started");
    // Should not have tree connectors
    expect(output).not.toContain("│");
  });

  test("renders multiple epics sequentially", () => {
    const state: TreeState = {
      epics: [
        { slug: "epic-a", phases: [] },
        { slug: "epic-b", phases: [] },
      ],
      system: [],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    const aIdx = output.indexOf("epic-a");
    const bIdx = output.indexOf("epic-b");
    expect(aIdx).toBeLessThan(bIdx);
  });

  test("leaf lines have timestamp and level — no scope or phase column", () => {
    const state: TreeState = {
      epics: [{
        slug: "my-epic",
        phases: [{
          phase: "plan",
          features: [],
          entries: [makeEntry("hello", 1)],
        }],
      }],
      system: [],
    };
    const { lastFrame } = render(<TreeView state={state} />);
    const output = stripAnsi(lastFrame());
    // Should have HH:MM:SS and INFO
    expect(output).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(output).toContain("INFO");
    // Should NOT have scope parens or phase column
    expect(output).not.toContain("(my-epic):");
    expect(output).not.toMatch(/plan\s{5}/); // 9-char padded phase
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/tree-view.test.ts`
Expected: FAIL — module not found

- [x] **Step 3: Install ink-testing-library if needed**

Run: `bun add -d ink-testing-library`
Expected: Package installed (or already present)

- [x] **Step 4: Implement TreeView.tsx**

```tsx
/**
 * TreeView — Ink component that renders pipeline hierarchy as a terminal tree.
 *
 * Renders: Epic > Phase > Feature with │ · connectors and phase-based coloring.
 * System entries render flat (no prefix).
 * Full scrollback — all entries rendered, no truncation.
 */

import { Box, Text } from "ink";
import type { TreeState, EpicNode, PhaseNode, FeatureNode, TreeEntry, SystemEntry } from "./tree-types.js";
import { formatTreeLine } from "./tree-format.js";

export interface TreeViewProps {
  /** Full tree state to render. */
  state: TreeState;
}

function EntryLine({ depth, level, phase, message, timestamp }: {
  depth: "leaf-phase" | "leaf-feature" | "system";
  level: TreeEntry["level"];
  phase?: string;
  message: string;
  timestamp: number;
}) {
  const formatted = formatTreeLine(depth, level, phase, message, timestamp);
  return <Text>{formatted}</Text>;
}

function FeatureNodeView({ node, phase }: { node: FeatureNode; phase: string }) {
  return (
    <>
      <Text>{formatTreeLine("feature", "info", phase, node.slug, 0)}</Text>
      {node.entries.map((entry) => (
        <EntryLine
          key={entry.seq}
          depth="leaf-feature"
          level={entry.level}
          phase={phase}
          message={entry.message}
          timestamp={entry.timestamp}
        />
      ))}
    </>
  );
}

function PhaseNodeView({ node }: { node: PhaseNode }) {
  return (
    <>
      <Text>{formatTreeLine("phase", "info", node.phase, node.phase, 0)}</Text>
      {node.entries.map((entry) => (
        <EntryLine
          key={entry.seq}
          depth="leaf-phase"
          level={entry.level}
          phase={node.phase}
          message={entry.message}
          timestamp={entry.timestamp}
        />
      ))}
      {node.features.map((feat) => (
        <FeatureNodeView key={feat.slug} node={feat} phase={node.phase} />
      ))}
    </>
  );
}

function EpicNodeView({ node }: { node: EpicNode }) {
  return (
    <>
      <Text bold>{formatTreeLine("epic", "info", undefined, node.slug, 0)}</Text>
      {node.phases.map((phase) => (
        <PhaseNodeView key={phase.phase} node={phase} />
      ))}
    </>
  );
}

export default function TreeView({ state }: TreeViewProps) {
  const hasContent = state.epics.length > 0 || state.system.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no activity</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* System entries first */}
      {state.system.map((entry) => (
        <EntryLine
          key={`sys-${entry.seq}`}
          depth="system"
          level={entry.level}
          message={entry.message}
          timestamp={entry.timestamp}
        />
      ))}
      {/* Epic trees */}
      {state.epics.map((epic) => (
        <EpicNodeView key={epic.slug} node={epic} />
      ))}
    </Box>
  );
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `bun test src/__tests__/tree-view.test.ts`
Expected: PASS — all tests green

- [x] **Step 6: Commit**

```bash
git add src/dashboard/TreeView.tsx src/__tests__/tree-view.test.ts
git commit -m "feat(tree-view): add TreeView Ink component with snapshot tests"
```

---

## Task 3: Full Test Suite Pass

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Verify: all existing test files in `src/__tests__/` and `src/pipeline-machine/__tests__/`

- [x] **Step 1: Run the full test suite**

Run: `bash scripts/test.sh`
Expected: All existing tests pass (new files don't break anything)

- [x] **Step 2: Fix any regressions**

If any existing tests fail, identify the cause and fix. New files should not affect existing code — if they do, investigate import resolution or type conflicts.

- [x] **Step 3: Run TypeScript type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

- [x] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(tree-view): resolve test suite regressions"
```
(Skip if no fixes needed)
