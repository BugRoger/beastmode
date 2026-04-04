# App Rewrite — Implementation Tasks

## Goal

Rewrite App.tsx to use ThreePanelLayout with EpicsPanel, DetailsPanel, and LogPanel as slot children. Replace useKeyboardController with useDashboardKeyboard. Delete all legacy drill-down components. Clean up barrel exports and tests.

## Architecture

- **ThreePanelLayout** — k9s-style 3-panel layout: EPICS (top-left 30%), DETAILS (top-right 70%), LOG (bottom 65%)
- **useDashboardKeyboard** — flat interaction model: normal/filter/confirm modes, no view stack
- **State threading** — App lifts selectedIndex from keyboard hook, passes selected epic data down to panels
- **Slot composition** — ThreePanelLayout receives panel content as `epicsSlot`, `detailsSlot`, `logSlot` props

## Tech Stack

- Bun runtime, TypeScript, React 19, Ink 6
- Test runner: `bun test <file>`
- No build step needed — Bun runs TypeScript directly

## File Structure

### Create
- (none — all target files already exist)

### Modify
- `cli/src/dashboard/App.tsx` — complete rewrite: ThreePanelLayout + useDashboardKeyboard
- `cli/src/dashboard/hooks/index.ts` — remove exports of deleted hooks, keep internal dependencies
- `cli/src/dashboard/key-hints.ts` — remove legacy ViewType mappings, keep DashboardMode hints
- `cli/src/__tests__/keyboard-nav.test.ts` — remove keyboard controller priority tests (reference old hook)

### Delete
- `cli/src/dashboard/EpicTable.tsx`
- `cli/src/dashboard/FeatureList.tsx`
- `cli/src/dashboard/AgentLog.tsx`
- `cli/src/dashboard/ActivityLog.tsx`
- `cli/src/dashboard/CrumbBar.tsx`
- `cli/src/dashboard/view-stack.ts`
- `cli/src/dashboard/hooks/use-keyboard-controller.ts`
- `cli/src/dashboard/hooks/use-log-entries.ts`
- `cli/src/__tests__/activity-log.test.ts`

### Keep (internal deps of useDashboardKeyboard, not exported from barrel)
- `cli/src/dashboard/hooks/use-keyboard-nav.ts`
- `cli/src/dashboard/hooks/use-cancel-flow.ts`
- `cli/src/dashboard/hooks/use-toggle-all.ts`
- `cli/src/dashboard/hooks/use-graceful-shutdown.ts`
- `cli/src/dashboard/hooks/use-terminal-size.ts`

---

### Task 0: Rewrite App.tsx to use ThreePanelLayout

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

This task replaces the entire App.tsx with a clean implementation using ThreePanelLayout + useDashboardKeyboard. No TDD for this task — it's a component rewrite verified by import/compile check and the existing panel unit tests.

- [ ] **Step 1: Rewrite App.tsx**

Replace the entire contents of `cli/src/dashboard/App.tsx` with:

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Text, useApp } from "ink";
import type { BeastmodeConfig } from "../config.js";
import type { EnrichedManifest } from "../manifest/store.js";
import type { WatchLoopEventMap, DispatchedSession } from "../dispatch/types.js";
import type { WatchLoop } from "../commands/watch-loop.js";
import ThreePanelLayout from "./ThreePanelLayout.js";
import EpicsPanel from "./EpicsPanel.js";
import DetailsPanel from "./DetailsPanel.js";
import LogPanel from "./LogPanel.js";
import { useDashboardTreeState } from "./hooks/use-dashboard-tree-state.js";
import { useDashboardKeyboard } from "./hooks/use-dashboard-keyboard.js";
import { getKeyHints } from "./key-hints.js";
import { cancelEpicAction } from "./actions/cancel-epic.js";
import { createLogger } from "../logger.js";

export interface AppProps {
  config: BeastmodeConfig;
  verbosity: number;
  loop?: WatchLoop;
  projectRoot?: string;
}

function formatClock(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function App({ config, verbosity, loop, projectRoot }: AppProps) {
  const { exit } = useApp();
  const [clock, setClock] = useState(formatClock());
  const [epics, setEpics] = useState<EnrichedManifest[]>([]);
  const [watchRunning, setWatchRunning] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [trackerSessions, setTrackerSessions] = useState<DispatchedSession[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const loopRef = useRef(loop);
  loopRef.current = loop;

  // --- Visible epics (filtered by active filter and toggle-all) ---
  const slugAtIndex = useCallback(
    (index: number): string | undefined => {
      // index 0 = "(all)" row, returns undefined
      if (index === 0) return undefined;
      return epics[index - 1]?.slug;
    },
    [epics],
  );

  const handleCancelEpic = useCallback(
    async (slug: string) => {
      const l = loopRef.current;
      if (!l || !projectRoot) return;
      await cancelEpicAction({
        slug,
        projectRoot,
        tracker: l.getTracker(),
        githubEnabled: config.github.enabled,
        logger: createLogger(verbosity, {}),
      });
    },
    [projectRoot, config.github.enabled, verbosity],
  );

  const handleShutdown = useCallback(async () => {
    if (loopRef.current) {
      await loopRef.current.stop();
    }
    exit();
  }, [exit]);

  const handleFilterApply = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const handleFilterClear = useCallback(() => {
    setActiveFilter("");
  }, []);

  // --- Keyboard hook (flat model — no view stack) ---
  const keyboard = useDashboardKeyboard({
    itemCount: epics.length + 1, // +1 for "(all)" row
    onCancelEpic: handleCancelEpic,
    onShutdown: handleShutdown,
    slugAtIndex,
    onFilterApply: handleFilterApply,
    onFilterClear: handleFilterClear,
  });

  // --- Filter + toggle-all ---
  const filteredEpics = epics.filter((e) => {
    if (!keyboard.toggleAll.showAll && (e.phase === "done" || e.phase === "cancelled")) {
      return false;
    }
    if (activeFilter && !e.slug.includes(activeFilter)) {
      return false;
    }
    return true;
  });

  // Clamp nav when list changes
  useEffect(() => {
    keyboard.nav.clampToRange(filteredEpics.length + 1); // +1 for "(all)"
  }, [filteredEpics.length]);

  // --- Tree state for log panel ---
  const selectedEpicSlug = keyboard.nav.selectedIndex === 0
    ? undefined
    : filteredEpics[keyboard.nav.selectedIndex - 1]?.slug;

  const { state: treeState } = useDashboardTreeState({
    sessions: trackerSessions,
    selectedEpicSlug,
  });

  // --- Clock tick every 1s ---
  useEffect(() => {
    const timer = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- WatchLoop event subscriptions ---
  useEffect(() => {
    if (!loop) return;

    const refreshSessions = () => {
      setTrackerSessions(loop.getTracker().getAll());
    };

    const onStarted = () => setWatchRunning(true);
    const onStopped = () => setWatchRunning(false);

    const onSessionStarted = (ev: WatchLoopEventMap["session-started"][0]) => {
      setActiveSessions((prev) => new Set([...prev, ev.epicSlug]));
      refreshSessions();
    };

    const onSessionCompleted = (ev: WatchLoopEventMap["session-completed"][0]) => {
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(ev.epicSlug);
        return next;
      });
      refreshSessions();
    };

    const onScanComplete = (_ev: WatchLoopEventMap["scan-complete"][0]) => {
      const activeEpicSlugs = new Set(loop.getTracker().getAll().map((s) => s.epicSlug));
      setActiveSessions(activeEpicSlugs);
      refreshSessions();
    };

    loop.on("started", onStarted);
    loop.on("stopped", onStopped);
    loop.on("session-started", onSessionStarted);
    loop.on("session-completed", onSessionCompleted);
    loop.on("scan-complete", onScanComplete);

    return () => {
      loop.off("started", onStarted);
      loop.off("stopped", onStopped);
      loop.off("session-started", onSessionStarted);
      loop.off("session-completed", onSessionCompleted);
      loop.off("scan-complete", onScanComplete);
    };
  }, [loop]);

  // --- Refresh epics from manifest store ---
  useEffect(() => {
    if (!loop || !projectRoot) return;

    const refreshEpics = async () => {
      try {
        const { listEnriched } = await import("../manifest/store.js");
        const result = listEnriched(projectRoot);
        const epicList = Array.isArray(result) ? result : result.epics;
        setEpics(epicList);
      } catch {
        // Non-fatal — will retry on next scan
      }
    };

    refreshEpics();

    loop.on("scan-complete", refreshEpics);
    loop.on("session-completed", refreshEpics);
    loop.on("epic-cancelled", refreshEpics);

    return () => {
      loop.off("scan-complete", refreshEpics);
      loop.off("session-completed", refreshEpics);
      loop.off("epic-cancelled", refreshEpics);
    };
  }, [loop, projectRoot]);

  // --- Cancel confirmation slug ---
  const cancelConfirmingSlug =
    keyboard.cancelFlow.state.phase === "confirming"
      ? keyboard.cancelFlow.state.slug
      : undefined;

  // --- Key hints ---
  const keyHintText = getKeyHints(keyboard.mode, {
    slug: cancelConfirmingSlug,
    filterInput: keyboard.filterInput,
  });

  // --- Cancel prompt ---
  const cancelPrompt = cancelConfirmingSlug ? (
    <Text color="yellow">Cancel {cancelConfirmingSlug}? (y/n)</Text>
  ) : undefined;

  return (
    <ThreePanelLayout
      watchRunning={watchRunning}
      clock={clock}
      epicsSlot={
        <EpicsPanel
          epics={filteredEpics}
          activeSessions={activeSessions}
          selectedIndex={keyboard.nav.selectedIndex}
          cancelConfirmingSlug={cancelConfirmingSlug}
        />
      }
      detailsSlot={
        <DetailsPanel
          epics={filteredEpics}
          selectedIndex={keyboard.nav.selectedIndex}
          activeSessions={activeSessions}
        />
      }
      logSlot={<LogPanel state={treeState} />}
      keyHints={keyHintText}
      isShuttingDown={keyboard.shutdown.isShuttingDown}
      cancelPrompt={cancelPrompt}
    />
  );
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `cd cli && bun build src/dashboard/App.tsx --no-bundle --outdir /tmp/bm-check 2>&1`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(app-rewrite): rewrite App.tsx to use ThreePanelLayout"
```

---

### Task 1: Delete legacy components and modules

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `cli/src/dashboard/EpicTable.tsx`
- Delete: `cli/src/dashboard/FeatureList.tsx`
- Delete: `cli/src/dashboard/AgentLog.tsx`
- Delete: `cli/src/dashboard/ActivityLog.tsx`
- Delete: `cli/src/dashboard/CrumbBar.tsx`
- Delete: `cli/src/dashboard/view-stack.ts`
- Delete: `cli/src/dashboard/hooks/use-keyboard-controller.ts`
- Delete: `cli/src/dashboard/hooks/use-log-entries.ts`

No TDD — this is a deletion task verified by grep.

- [ ] **Step 1: Delete legacy files**

```bash
rm cli/src/dashboard/EpicTable.tsx
rm cli/src/dashboard/FeatureList.tsx
rm cli/src/dashboard/AgentLog.tsx
rm cli/src/dashboard/ActivityLog.tsx
rm cli/src/dashboard/CrumbBar.tsx
rm cli/src/dashboard/view-stack.ts
rm cli/src/dashboard/hooks/use-keyboard-controller.ts
rm cli/src/dashboard/hooks/use-log-entries.ts
```

- [ ] **Step 2: Verify no surviving imports**

Run: `grep -rn "EpicTable\|FeatureList\|AgentLog\|ActivityLog\|CrumbBar\|view-stack\|useKeyboardController\|use-keyboard-controller\|useLogEntries\|use-log-entries" cli/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "__tests__"`
Expected: No matches (zero lines of output)

- [ ] **Step 3: Commit**

```bash
git add -A cli/src/dashboard/EpicTable.tsx cli/src/dashboard/FeatureList.tsx cli/src/dashboard/AgentLog.tsx cli/src/dashboard/ActivityLog.tsx cli/src/dashboard/CrumbBar.tsx cli/src/dashboard/view-stack.ts cli/src/dashboard/hooks/use-keyboard-controller.ts cli/src/dashboard/hooks/use-log-entries.ts
git commit -m "feat(app-rewrite): delete legacy drill-down components and hooks"
```

---

### Task 2: Update hooks barrel and key-hints

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `cli/src/dashboard/hooks/index.ts`
- Modify: `cli/src/dashboard/key-hints.ts`

- [ ] **Step 1: Update hooks/index.ts**

Replace the entire contents of `cli/src/dashboard/hooks/index.ts` with:

```ts
export { useGracefulShutdown } from "./use-graceful-shutdown.js";
export type { GracefulShutdownState } from "./use-graceful-shutdown.js";

export { useTerminalSize } from "./use-terminal-size.js";
export type { TerminalSize } from "./use-terminal-size.js";

export { useDashboardKeyboard } from "./use-dashboard-keyboard.js";
export type { DashboardMode, DashboardKeyboardDeps, DashboardKeyboardState } from "./use-dashboard-keyboard.js";

export { useDashboardTreeState } from "./use-dashboard-tree-state.js";
export type { UseDashboardTreeStateOptions, UseDashboardTreeStateResult } from "./use-dashboard-tree-state.js";
```

Note: `useKeyboardNav`, `useCancelFlow`, and `useToggleAll` are still used internally by `useDashboardKeyboard` — we keep the files but remove their barrel exports since no external consumer should use them directly.

- [ ] **Step 2: Update key-hints.ts**

Replace the entire contents of `cli/src/dashboard/key-hints.ts` with:

```ts
/** Dashboard interaction mode — determines which key hints to show. */
export type KeyHintMode = "normal" | "filter" | "confirm";

/** Key hint strings per dashboard mode. */
const MODE_HINTS: Record<
  KeyHintMode,
  string | ((ctx: { slug?: string; filterInput?: string }) => string)
> = {
  normal: "q quit  ↑↓ navigate  / filter  x cancel  a all",
  filter: (ctx) => `/${ctx?.filterInput ?? ""}  ↵ apply  ⎋ clear`,
  confirm: (ctx) => `Cancel ${ctx?.slug ?? ""}? y confirm  n/⎋ abort`,
};

/** Get the key hints string for the given mode with optional context. */
export function getKeyHints(
  mode: KeyHintMode,
  ctx?: { slug?: string; filterInput?: string },
): string {
  const hint = MODE_HINTS[mode];
  if (typeof hint === "function") return hint(ctx ?? {});
  return hint;
}
```

- [ ] **Step 3: Verify no import errors for key-hints or hooks/index**

Run: `grep -rn "from.*hooks/index\|from.*key-hints" cli/src/dashboard/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: Only App.tsx and use-dashboard-keyboard.ts reference these

- [ ] **Step 4: Commit**

```bash
git add cli/src/dashboard/hooks/index.ts cli/src/dashboard/key-hints.ts
git commit -m "feat(app-rewrite): clean up barrel exports and key hints"
```

---

### Task 3: Clean up test files

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Delete: `cli/src/__tests__/activity-log.test.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`

- [ ] **Step 1: Delete activity-log test**

```bash
rm cli/src/__tests__/activity-log.test.ts
```

- [ ] **Step 2: Remove keyboard-controller-specific tests from keyboard-nav.test.ts**

Remove the `describe("keyboard controller priority", ...)` block (lines 348-405) from `keyboard-nav.test.ts`. This block tests the old `useKeyboardController` behavior (drill-down actions, view types).

Keep all other test blocks:
- `cancelEpicAction` tests
- `keyboard nav logic` tests
- `cancel flow state transitions` tests
- `graceful shutdown logic` tests
- `toggle all logic` tests

- [ ] **Step 3: Verify tests pass**

Run: `cd cli && bun test src/__tests__/keyboard-nav.test.ts`
Expected: All remaining tests pass

- [ ] **Step 4: Commit**

```bash
git add -A cli/src/__tests__/activity-log.test.ts cli/src/__tests__/keyboard-nav.test.ts
git commit -m "feat(app-rewrite): clean up test files for deleted components"
```

---

### Task 4: Final verification

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2, Task 3

**Files:**
- (read-only verification — no files modified)

- [ ] **Step 1: Grep for dead imports**

Run: `grep -rn "EpicTable\|FeatureList\|AgentLog\|ActivityLog\|CrumbBar\|view-stack\|useKeyboardController\|use-keyboard-controller\|useLogEntries\|use-log-entries\|ViewType" cli/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: Zero matches

- [ ] **Step 2: Run full test suite**

Run: `cd cli && bash scripts/test.sh`
Expected: All test files pass

- [ ] **Step 3: Type check**

Run: `cd cli && bun x tsc --noEmit`
Expected: No type errors
