# tree-line-coloring-2

**Goal:** Decompose warn/error color paths in `formatTreeLine` (dashboard) so tree prefixes are always dim, timestamps are always dim, only the level label carries the level color, and message text is default/white.

**Architecture:** The normal (info/debug) path at line 125 already does segmented coloring correctly:
```
colorPrefix(prefix) + badge + chalk.dim(time) + chalk.green(label) + message
```
The warn/error paths (lines 117-122) wrap the entire assembled string in `chalk.yellow()`/`chalk.red()`. Fix: assemble them identically to the normal path, substituting `chalk.yellow(label)` / `chalk.red(label)`.

**Tech Stack:** TypeScript, chalk 5.4.1, vitest 4.1.2, bun

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/dashboard/tree-format.ts` | Modify | Decompose warn/error color paths |
| `cli/src/__tests__/tree-format.palette.test.ts` | Modify | Add segmented-coloring assertions for warn/error |

---

### Task 1: Add segmented coloring tests for warn/error and fix implementation

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/tree-format.palette.test.ts`
- Modify: `cli/src/dashboard/tree-format.ts`

- [x] **Step 1: Write failing tests for warn/error segmented coloring**

Add these tests to the `tree-format with monokai-palette` describe block in `cli/src/__tests__/tree-format.palette.test.ts`:

```typescript
  test("warn line has dim prefix, not full-line yellow", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("leaf-epic", "warn", "plan", "Warning!", timestamp);

    // Prefix should be dim (not yellow)
    expect(line).toContain("\x1b[2m"); // dim code for prefix

    // Should NOT have yellow wrapping the entire string — yellow should only wrap the label
    // The dim prefix proves the line is not fully wrapped in yellow
    const plain = stripAnsi(line);
    expect(plain).toContain("│");
    expect(plain).toContain("WARN");
    expect(plain).toContain("Warning!");
  });

  test("warn line has yellow label only, not yellow message", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("leaf-epic", "warn", "plan", "Warning!", timestamp);

    // Yellow code should be present (for the label)
    expect(line).toContain("\x1b[33m");

    // Split at the message text — message should NOT be inside yellow
    // The message "Warning!" should appear after the yellow reset
    const msgIdx = line.indexOf("Warning!");
    const labelIdx = line.indexOf("WARN");
    // Between label and message, there should be a reset/close
    const between = line.slice(labelIdx, msgIdx);
    expect(between).toContain("\x1b[39m"); // yellow reset (default foreground)
  });

  test("error line has dim prefix and red label only", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const line = formatTreeLine("leaf-epic", "error", "plan", "Error!", timestamp);

    // Prefix should be dim
    expect(line).toContain("\x1b[2m");

    // Red code for label
    expect(line).toContain("\x1b[31m");

    // Message should not be inside red — check reset between label and message
    const msgIdx = line.indexOf("Error!");
    const labelIdx = line.indexOf("ERR");
    const between = line.slice(labelIdx, msgIdx);
    expect(between).toContain("\x1b[39m");
  });

  test("warn line has dim timestamp", () => {
    const timestamp = new Date("2024-04-04T10:30:45Z").getTime();
    const localTime = new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });
    const line = formatTreeLine("leaf-epic", "warn", "plan", "Warning!", timestamp);

    const plain = stripAnsi(line);
    expect(plain).toContain(localTime);
    // Timestamp should be wrapped in dim, same as normal level
    // The dim code should appear before the timestamp
    const timeIdx = line.indexOf(localTime);
    const beforeTime = line.slice(Math.max(0, timeIdx - 10), timeIdx);
    expect(beforeTime).toContain("\x1b[2m");
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/tree-format.palette.test.ts`
Expected: FAIL — the new tests fail because warn/error currently wrap the entire line

- [x] **Step 3: Fix formatTreeLine warn/error paths**

In `cli/src/dashboard/tree-format.ts`, replace lines 116-122 (the warn/error block):

```typescript
  // Warn/error: segmented coloring (same structure as normal path)
  if (level === "warn") {
    return `${colorPrefix(prefix)}${badge}${chalk.dim(time)} ${chalk.yellow(label)} ${message}`;
  }
  if (level === "error") {
    return `${colorPrefix(prefix)}${badge}${chalk.dim(time)} ${chalk.red(label)} ${message}`;
  }
```

- [x] **Step 4: Update existing palette tests that assert full-line coloring**

The existing tests "formatTreeLine warn level is colored yellow" and "formatTreeLine error level is colored red" at lines 62-76 in the palette test file still pass because yellow/red ANSI codes are still present (just on the label now, not the whole line). No changes needed to those tests.

Verify: `npx vitest run src/__tests__/tree-format.palette.test.ts`
Expected: ALL tests pass (both old and new)

- [x] **Step 5: Update the JSDoc comment in formatTreeLine**

In `cli/src/dashboard/tree-format.ts`, update the comment at lines 88-89 from:
```
 * Warn/error: full-line yellow/red coloring.
 * Normal: phase-colored prefix, dimmed timestamp.
```
to:
```
 * All leaf levels: dimmed prefix, dimmed timestamp, colored level label, default message.
 * Level label colors: green (info), blue (debug), yellow (warn), red (error).
```

- [x] **Step 6: Run full test suite**

Run: `npx vitest run src/__tests__/tree-format.palette.test.ts src/__tests__/tree-format-dashboard.test.ts src/__tests__/tree-format.test.ts`
Expected: ALL tests pass

- [x] **Step 7: Commit**

```bash
git add cli/src/dashboard/tree-format.ts cli/src/__tests__/tree-format.palette.test.ts
git commit -m "fix(tree-format): decompose warn/error to segmented coloring"
```
