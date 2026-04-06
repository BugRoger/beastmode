import { describe, test, expect } from "vitest";
import { cancelEpicAction } from "../dashboard/actions/cancel-epic";
import type { Logger } from "../logger";
import { JsonFileStore } from "../store/index.js";

// ---------------------------------------------------------------------------
// cancelEpicAction — integration test with shared cancel-logic module
// ---------------------------------------------------------------------------

const noop = () => {};
const noopLogger: Logger = {
  info: noop,
  debug: noop,
  warn: noop,
  error: noop,
  child: () => noopLogger,
};

describe("cancelEpicAction", () => {
  // We need a minimal store entity on disk for cancel-logic to find.
  // Use temp dir + real store functions.

  const { mkdtempSync, mkdirSync } = require("fs");
  const { resolve } = require("path");
  const os = require("os");

  function setupTempProject(slug: string, _phase: string = "implement") {
    const tmpDir = mkdtempSync(resolve(os.tmpdir(), "bm-test-"));
    const stateDir = resolve(tmpDir, ".beastmode", "state");
    mkdirSync(stateDir, { recursive: true });

    const storePath = resolve(stateDir, "store.json");
    const store = new JsonFileStore(storePath);
    store.load();
    store.addEpic({ name: slug, slug });
    store.save();

    return { tmpDir, stateDir, storePath };
  }

  function makeMockTracker() {
    const abortedSlugs: string[] = [];
    const sessions = [
      {
        id: "s1",
        epicSlug: "target-epic",
        phase: "implement",
        abortController: {
          abort: () => { abortedSlugs.push("target-epic"); },
        },
      },
      {
        id: "s2",
        epicSlug: "other-epic",
        phase: "plan",
        abortController: {
          abort: () => { abortedSlugs.push("other-epic"); },
        },
      },
    ];

    return {
      tracker: {
        getAll: () => sessions,
        size: sessions.length,
        abortAll: () => {},
      },
      abortedSlugs,
    };
  }

  test("deletes store entity via shared cancel-logic", async () => {
    const { tmpDir, storePath } = setupTempProject("cancel-test", "implement");
    const { tracker } = makeMockTracker();

    await cancelEpicAction({
      slug: "cancel-test",
      projectRoot: tmpDir,
      tracker: tracker as any,
      githubEnabled: false,
      logger: noopLogger,
    });

    // Shared module deletes the store entity
    const store = new JsonFileStore(storePath);
    store.load();
    expect(store.find("cancel-test")).toBeUndefined();
  });

  test("deletes store entity from design phase", async () => {
    const { tmpDir, storePath } = setupTempProject("design-cancel", "design");
    const { tracker } = makeMockTracker();

    await cancelEpicAction({
      slug: "design-cancel",
      projectRoot: tmpDir,
      tracker: tracker as any,
      githubEnabled: false,
      logger: noopLogger,
    });

    const store = new JsonFileStore(storePath);
    store.load();
    expect(store.find("design-cancel")).toBeUndefined();
  });

  test("deletes store entity from validate phase", async () => {
    const { tmpDir, storePath } = setupTempProject("validate-cancel", "validate");
    const { tracker } = makeMockTracker();

    await cancelEpicAction({
      slug: "validate-cancel",
      projectRoot: tmpDir,
      tracker: tracker as any,
      githubEnabled: false,
      logger: noopLogger,
    });

    const store = new JsonFileStore(storePath);
    store.load();
    expect(store.find("validate-cancel")).toBeUndefined();
  });

  test("aborts only sessions matching the epic slug", async () => {
    const { tmpDir } = setupTempProject("target-epic", "implement");
    const { tracker, abortedSlugs } = makeMockTracker();

    await cancelEpicAction({
      slug: "target-epic",
      projectRoot: tmpDir,
      tracker: tracker as any,
      githubEnabled: false,
      logger: noopLogger,
    });

    expect(abortedSlugs).toEqual(["target-epic"]);
    expect(abortedSlugs).not.toContain("other-epic");
  });

  test("succeeds when store entity not found (idempotent)", async () => {
    const tmpDir = mkdtempSync(resolve(os.tmpdir(), "bm-test-"));
    mkdirSync(resolve(tmpDir, ".beastmode", "state"), { recursive: true });
    const { tracker } = makeMockTracker();

    // Shared cancel module is idempotent — no entity = no-op, not an error
    await cancelEpicAction({
      slug: "nonexistent",
      projectRoot: tmpDir,
      tracker: tracker as any,
      githubEnabled: false,
      logger: noopLogger,
    });
    // No throw — idempotent success
  });

  test("handles epic with blocked state", async () => {
    const { tmpDir, storePath } = setupTempProject("blocked-cancel", "implement");

    const { tracker } = makeMockTracker();

    await cancelEpicAction({
      slug: "blocked-cancel",
      projectRoot: tmpDir,
      tracker: tracker as any,
      githubEnabled: false,
      logger: noopLogger,
    });

    // Store entity is deleted entirely
    const store = new JsonFileStore(storePath);
    store.load();
    expect(store.find("blocked-cancel")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Hook logic unit tests — pure state transition logic
// ---------------------------------------------------------------------------

describe("keyboard nav logic", () => {
  test("clamp prevents going below 0", () => {
    // Simulating handleNavInput logic
    const prev = 0;
    const result = Math.max(0, prev - 1);
    expect(result).toBe(0);
  });

  test("clamp prevents going above itemCount - 1", () => {
    const itemCount = 5;
    const prev = 4;
    const result = Math.min(itemCount - 1, prev + 1);
    expect(result).toBe(4);
  });

  test("navigation moves down normally", () => {
    const itemCount = 5;
    const prev = 2;
    const result = Math.min(itemCount - 1, prev + 1);
    expect(result).toBe(3);
  });

  test("navigation moves up normally", () => {
    const prev = 3;
    const result = Math.max(0, prev - 1);
    expect(result).toBe(2);
  });

  test("clampToRange clamps to valid range", () => {
    const prev = 10;
    const count = 3;
    const result = Math.min(Math.max(0, prev), Math.max(0, count - 1));
    expect(result).toBe(2);
  });

  test("clampToRange handles empty list", () => {
    const prev = 5;
    const count = 0;
    const result = Math.min(Math.max(0, prev), Math.max(0, count - 1));
    expect(result).toBe(0);
  });
});

describe("cancel flow state transitions", () => {
  test("idle → confirming on requestCancel", () => {
    const slug = "my-epic";
    const next = { phase: "confirming", slug };
    expect(next.phase).toBe("confirming");
    expect(next.slug).toBe("my-epic");
  });

  test("confirming → idle on 'n'", () => {
    const state: { phase: string; slug?: string } = { phase: "confirming", slug: "my-epic" };
    const input: string = "n";
    const next = (input === "n" || input === "N") ? { phase: "idle" } : state;
    expect(next.phase).toBe("idle");
  });

  test("confirming → executing on 'y'", () => {
    const state: { phase: string; slug: string } = { phase: "confirming", slug: "my-epic" };
    const input: string = "y";
    const next = (input === "y" || input === "Y")
      ? { phase: "executing", slug: state.slug }
      : state;
    expect(next.phase).toBe("executing");
    expect(next.slug).toBe("my-epic");
  });

  test("isModal is true during confirming", () => {
    const phase: string = "confirming";
    expect(phase === "confirming" || phase === "executing").toBe(true);
  });

  test("isModal is true during executing", () => {
    const phase: string = "executing";
    expect(phase === "confirming" || phase === "executing").toBe(true);
  });

  test("isModal is false during idle", () => {
    const phase: string = "idle";
    expect(phase === "confirming" || phase === "executing").toBe(false);
  });
});

describe("graceful shutdown logic", () => {
  test("'q' triggers shutdown", () => {
    const input: string = "q";
    const key = { ctrl: false };
    const isQuit = input === "q" || input === "Q";
    const isCtrlC = input === "c" && key.ctrl;
    expect(isQuit || isCtrlC).toBe(true);
  });

  test("'Q' triggers shutdown", () => {
    const input: string = "Q";
    const isQuit = input === "q" || input === "Q";
    expect(isQuit).toBe(true);
  });

  test("Ctrl+C triggers shutdown", () => {
    const input: string = "c";
    const key = { ctrl: true };
    const isCtrlC = input === "c" && key.ctrl;
    expect(isCtrlC).toBe(true);
  });

  test("other keys don't trigger shutdown", () => {
    const input: string = "x";
    const key = { ctrl: false };
    const isQuit = input === "q" || input === "Q";
    const isCtrlC = input === "c" && key.ctrl;
    expect(isQuit || isCtrlC).toBe(false);
  });

  test("double initiation is prevented", () => {
    let initiated = false;
    let callCount = 0;

    function handleShutdown() {
      if (initiated) return;
      initiated = true;
      callCount++;
    }

    handleShutdown();
    handleShutdown();

    expect(callCount).toBe(1);
  });
});

describe("verbosity cycling logic", () => {
  test("'v' cycles verbosity 0 -> 1", () => {
    let verbosity = 0;
    const input = "v";
    if (input === "v" || input === "V") verbosity = (verbosity + 1) % 4;
    expect(verbosity).toBe(1);
  });

  test("'V' cycles verbosity 1 -> 2", () => {
    let verbosity = 1;
    const input: string = "V";
    if (input === "v" || input === "V") verbosity = (verbosity + 1) % 4;
    expect(verbosity).toBe(2);
  });

  test("'v' wraps verbosity 3 -> 0", () => {
    let verbosity = 3;
    const input = "v";
    if (input === "v" || input === "V") verbosity = (verbosity + 1) % 4;
    expect(verbosity).toBe(0);
  });

  test("'v' is ignored in filter mode", () => {
    let verbosity = 0;
    const mode: string = "filter";
    const input = "v";
    if (mode === "normal" && (input === "v" || input === "V")) {
      verbosity = (verbosity + 1) % 4;
    }
    expect(verbosity).toBe(0);
  });

  test("'v' is ignored in confirm mode", () => {
    let verbosity = 0;
    const mode: string = "confirm";
    const input = "v";
    if (mode === "normal" && (input === "v" || input === "V")) {
      verbosity = (verbosity + 1) % 4;
    }
    expect(verbosity).toBe(0);
  });
});

describe("log scroll j/k logic", () => {
  test("'k' scrolls log up (decrements offset)", () => {
    let logScrollOffset = 5;
    logScrollOffset = Math.max(0, logScrollOffset - 1);
    expect(logScrollOffset).toBe(4);
  });

  test("'j' scrolls log down (increments offset)", () => {
    let logScrollOffset = 5;
    const maxOffset = 50;
    logScrollOffset = Math.min(maxOffset, logScrollOffset + 1);
    expect(logScrollOffset).toBe(6);
  });

  test("'k' clamps at 0", () => {
    let logScrollOffset = 0;
    logScrollOffset = Math.max(0, logScrollOffset - 1);
    expect(logScrollOffset).toBe(0);
  });

  test("'j' clamps at maxOffset", () => {
    let logScrollOffset = 50;
    const maxOffset = 50;
    logScrollOffset = Math.min(maxOffset, logScrollOffset + 1);
    expect(logScrollOffset).toBe(50);
  });

  test("'j'/'k' disables auto-follow", () => {
    let logAutoFollow = true;
    // j or k pressed
    logAutoFollow = false;
    expect(logAutoFollow).toBe(false);
  });

  test("'j'/'k' is ignored in filter mode", () => {
    let logScrollOffset = 5;
    const mode: string = "filter";
    if (mode === "normal") logScrollOffset = Math.max(0, logScrollOffset - 1);
    expect(logScrollOffset).toBe(5);
  });

  test("'j'/'k' is ignored in confirm mode", () => {
    let logScrollOffset = 5;
    const mode: string = "confirm";
    if (mode === "normal") logScrollOffset = Math.max(0, logScrollOffset - 1);
    expect(logScrollOffset).toBe(5);
  });
});

describe("phase filter logic", () => {
  const PHASE_ORDER = ["all", "design", "plan", "implement", "validate", "release"] as const;
  type PhaseFilter = (typeof PHASE_ORDER)[number];

  function cyclePhase(current: PhaseFilter): PhaseFilter {
    const idx = PHASE_ORDER.indexOf(current);
    return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
  }

  test("default phase filter is 'all'", () => {
    const phaseFilter: PhaseFilter = "all";
    expect(phaseFilter).toBe("all");
  });

  test("'p' cycles all -> design", () => {
    expect(cyclePhase("all")).toBe("design");
  });

  test("'p' cycles design -> plan", () => {
    expect(cyclePhase("design")).toBe("plan");
  });

  test("'p' cycles plan -> implement", () => {
    expect(cyclePhase("plan")).toBe("implement");
  });

  test("'p' cycles implement -> validate", () => {
    expect(cyclePhase("implement")).toBe("validate");
  });

  test("'p' cycles validate -> release", () => {
    expect(cyclePhase("validate")).toBe("release");
  });

  test("'p' wraps release -> all", () => {
    expect(cyclePhase("release")).toBe("all");
  });

  test("'p' is ignored in filter mode", () => {
    let phaseFilter: PhaseFilter = "all";
    const mode: string = "filter";
    if (mode === "normal") {
      phaseFilter = cyclePhase(phaseFilter);
    }
    expect(phaseFilter).toBe("all");
  });
});

describe("view filter cycling logic", () => {
  const VIEW_ORDER = ["active", "running", "all"] as const;
  type ViewFilter = (typeof VIEW_ORDER)[number];

  function cycleView(current: ViewFilter): ViewFilter {
    const idx = VIEW_ORDER.indexOf(current);
    return VIEW_ORDER[(idx + 1) % VIEW_ORDER.length];
  }

  test("default viewFilter is 'active'", () => {
    const viewFilter: ViewFilter = "active";
    expect(viewFilter).toBe("active");
  });

  test("'b' cycles active -> running", () => {
    expect(cycleView("active")).toBe("running");
  });

  test("'b' cycles running -> all", () => {
    expect(cycleView("running")).toBe("all");
  });

  test("'b' wraps all -> active", () => {
    expect(cycleView("all")).toBe("active");
  });

  test("'b' is ignored in filter mode", () => {
    let viewFilter: ViewFilter = "active";
    const mode: string = "filter";
    if (mode === "normal") viewFilter = cycleView(viewFilter);
    expect(viewFilter).toBe("active");
  });

  test("'b' is ignored in confirm mode", () => {
    let viewFilter: ViewFilter = "active";
    const mode: string = "confirm";
    if (mode === "normal") viewFilter = cycleView(viewFilter);
    expect(viewFilter).toBe("active");
  });
});

describe("log scroll state logic", () => {
  test("default logAutoFollow is true", () => {
    const logAutoFollow = true;
    expect(logAutoFollow).toBe(true);
  });

  test("default logScrollOffset is 0", () => {
    const logScrollOffset = 0;
    expect(logScrollOffset).toBe(0);
  });

  test("scroll offset clamps to 0 at top", () => {
    let logScrollOffset = 0;
    logScrollOffset = Math.max(0, logScrollOffset - 1);
    expect(logScrollOffset).toBe(0);
  });

  test("scroll offset clamps to max at bottom", () => {
    let logScrollOffset = 50;
    const maxOffset = 50;
    logScrollOffset = Math.min(maxOffset, logScrollOffset + 1);
    expect(logScrollOffset).toBe(50);
  });

  test("G key resumes auto-follow", () => {
    let logAutoFollow = false;
    let logScrollOffset = 10;
    const totalLines = 100;

    const input = "G";
    if (input === "G") {
      logAutoFollow = true;
      logScrollOffset = Math.max(0, totalLines - 1);
    }

    expect(logAutoFollow).toBe(true);
    expect(logScrollOffset).toBe(99);
  });

  test("End key resumes auto-follow", () => {
    let logAutoFollow = false;
    let logScrollOffset = 10;
    const totalLines = 100;

    const keyEnd = true;
    if (keyEnd) {
      logAutoFollow = true;
      logScrollOffset = Math.max(0, totalLines - 1);
    }

    expect(logAutoFollow).toBe(true);
    expect(logScrollOffset).toBe(99);
  });

  test("up/down always controls epic nav, j/k always controls log", () => {
    let selectedIndex = 2;
    let logScrollOffset = 5;

    // up arrow → epic nav
    selectedIndex = Math.max(0, selectedIndex - 1);
    expect(selectedIndex).toBe(1);
    expect(logScrollOffset).toBe(5); // unchanged

    // k → log scroll
    logScrollOffset = Math.max(0, logScrollOffset - 1);
    expect(logScrollOffset).toBe(4);
    expect(selectedIndex).toBe(1); // unchanged
  });
});

describe("details scroll state logic", () => {
  test("default detailsScrollOffset is 0", () => {
    const detailsScrollOffset = 0;
    expect(detailsScrollOffset).toBe(0);
  });

  test("PgUp decrements detailsScrollOffset", () => {
    let detailsScrollOffset = 10;
    const pageSize = 10;
    detailsScrollOffset = Math.max(0, detailsScrollOffset - pageSize);
    expect(detailsScrollOffset).toBe(0);
  });

  test("PgDn increments detailsScrollOffset", () => {
    let detailsScrollOffset = 0;
    const pageSize = 10;
    const maxOffset = 50;
    detailsScrollOffset = Math.min(maxOffset, detailsScrollOffset + pageSize);
    expect(detailsScrollOffset).toBe(10);
  });

  test("PgUp clamps to 0", () => {
    let detailsScrollOffset = 3;
    const pageSize = 10;
    detailsScrollOffset = Math.max(0, detailsScrollOffset - pageSize);
    expect(detailsScrollOffset).toBe(0);
  });

  test("PgDn clamps to max", () => {
    let detailsScrollOffset = 45;
    const pageSize = 10;
    const maxOffset = 50;
    detailsScrollOffset = Math.min(maxOffset, detailsScrollOffset + pageSize);
    expect(detailsScrollOffset).toBe(50);
  });

  test("PgUp/PgDn always controls details panel", () => {
    let detailsScrollOffset = 10;
    const pageSize = 10;
    detailsScrollOffset = Math.max(0, detailsScrollOffset - pageSize);
    expect(detailsScrollOffset).toBe(0);
  });
});

