/**
 * Cucumber World for dashboard dispatch-fix integration tests.
 *
 * Hybrid approach: source analysis for not-yet-implemented UI behavior,
 * direct function calls for selectStrategy() which already exists.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StrategySelection } from "../../src/commands/watch.js";

const CLI_SRC = resolve(import.meta.dirname, "../../src");

/** Verbosity level names indexed by numeric level. */
const VERBOSITY_NAMES = ["info", "detail", "debug", "trace"] as const;
type VerbosityName = (typeof VERBOSITY_NAMES)[number];

export class DashboardDispatchWorld extends World {
  // ---- Config state ----
  configuredStrategy = "sdk";

  // ---- Strategy resolution results ----
  dashboardStrategyResult?: StrategySelection;
  watchStrategyResult?: StrategySelection;
  dashboardStrategyError?: Error;
  watchStrategyError?: Error;

  // ---- Mocked availability ----
  iterm2Available = false;
  cmuxAvailable = false;

  // ---- Source analysis ----
  appSource = "";
  dashboardCommandSource = "";
  watchSource = "";
  keyHintsSource = "";
  logPanelSource = "";
  keyboardHookSource = "";
  dispatchPhaseSource = "";

  // ---- Dispatch state ----
  dispatchError?: Error;
  fallbackAttempted = false;

  // ---- Verbosity state ----
  currentVerbosity = 0;

  // ---- Log panel state (event-based) ----
  logPanelStatus?: string;
  sdkStreamingAvailable = true;

  // ---- selectStrategy import (cached) ----
  private _selectStrategy?: typeof import("../../src/commands/watch.js").selectStrategy;

  setup(): void {
    this.appSource = readFileSync(resolve(CLI_SRC, "dashboard/App.tsx"), "utf-8");
    this.dashboardCommandSource = readFileSync(resolve(CLI_SRC, "commands/dashboard.ts"), "utf-8");
    this.watchSource = readFileSync(resolve(CLI_SRC, "commands/watch.ts"), "utf-8");
    this.keyHintsSource = readFileSync(resolve(CLI_SRC, "dashboard/key-hints.ts"), "utf-8");
    this.logPanelSource = readFileSync(resolve(CLI_SRC, "dashboard/LogPanel.tsx"), "utf-8");
    this.keyboardHookSource = readFileSync(
      resolve(CLI_SRC, "dashboard/hooks/use-dashboard-keyboard.ts"),
      "utf-8",
    );

    // Extract dispatchPhase source (the catch block with CLI fallback)
    this.dispatchPhaseSource = this.watchSource;
  }

  /** Lazy-load selectStrategy for direct function testing. */
  async getSelectStrategy(): Promise<typeof import("../../src/commands/watch.js").selectStrategy> {
    if (!this._selectStrategy) {
      const mod = await import("../../src/commands/watch.js");
      this._selectStrategy = mod.selectStrategy;
    }
    return this._selectStrategy!;
  }

  /** Run selectStrategy with mocked availability deps. */
  async resolveStrategy(strategy: string): Promise<StrategySelection> {
    const selectStrategy = await this.getSelectStrategy();
    const { createNullLogger } = await import("../../src/logger.js");
    return selectStrategy(
      strategy,
      {
        checkIterm2: async () => ({
          available: this.iterm2Available,
          sessionId: this.iterm2Available ? "mock-session-id" : undefined,
          reason: this.iterm2Available ? undefined : "not running in iTerm2",
        }),
        checkCmux: async () => this.cmuxAvailable,
      },
      createNullLogger(),
    );
  }

  /** Get verbosity name from numeric level. */
  verbosityName(): VerbosityName {
    return VERBOSITY_NAMES[this.currentVerbosity] ?? "info";
  }

  /** Set verbosity by name. */
  setVerbosityByName(name: string): void {
    const idx = VERBOSITY_NAMES.indexOf(name as VerbosityName);
    this.currentVerbosity = idx >= 0 ? idx : 0;
  }

  /** Cycle verbosity: 0 -> 1 -> 2 -> 3 -> 0 */
  cycleVerbosity(): void {
    this.currentVerbosity = (this.currentVerbosity + 1) % 4;
  }

  /** Check if dashboard.ts calls selectStrategy (vs hardcoding SDK). */
  dashboardUsesSelectStrategy(): boolean {
    return this.dashboardCommandSource.includes("selectStrategy");
  }

  /** Check if dispatchPhase has the CLI fallback (claude --print). */
  hasCliFallback(): boolean {
    // The fallback is in the catch block: Bun.spawn(["claude", "--print", ...])
    return this.dispatchPhaseSource.includes('"--print"') ||
           this.dispatchPhaseSource.includes("'--print'");
  }

  /** Check if App.tsx has verbosity cycling state management. */
  hasVerbosityCycling(): boolean {
    return this.appSource.includes("cycleVerbosity") ||
           this.appSource.includes("setVerbosity") ||
           (this.appSource.includes("verbosity") && this.appSource.includes("% 4"));
  }

  /** Check if keyboard hook handles 'v' key. */
  keyboardHandlesVKey(): boolean {
    return this.keyboardHookSource.includes('"v"') ||
           this.keyboardHookSource.includes("'v'");
  }

  /** Check if getKeyHints includes verbosity display. */
  keyHintsShowVerbosity(): boolean {
    return this.keyHintsSource.includes("verb:") ||
           this.keyHintsSource.includes("verbosity");
  }
}

setWorldConstructor(DashboardDispatchWorld);
