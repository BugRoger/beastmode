/**
 * Cucumber World for dashboard integration tests.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CLI_SRC = resolve(import.meta.dirname, "../../src");

/** Verbosity level names indexed by numeric level. */
const VERBOSITY_NAMES = ["info", "debug"] as const;
type VerbosityName = (typeof VERBOSITY_NAMES)[number];

export class DashboardDispatchWorld extends World {
  // ---- Config state ----
  configuredStrategy = "sdk";

  // ---- Mocked availability ----
  iterm2Available = false;

  // ---- Source analysis ----
  appSource = "";
  dashboardCommandSource = "";
  keyHintsSource = "";
  logPanelSource = "";
  keyboardHookSource = "";

  // ---- Verbosity state ----
  currentVerbosity = 0;

  setup(): void {
    this.appSource = readFileSync(resolve(CLI_SRC, "dashboard/App.tsx"), "utf-8");
    this.dashboardCommandSource = readFileSync(resolve(CLI_SRC, "commands/dashboard.ts"), "utf-8");
    this.keyHintsSource = readFileSync(resolve(CLI_SRC, "dashboard/key-hints.ts"), "utf-8");
    this.logPanelSource = readFileSync(resolve(CLI_SRC, "dashboard/LogPanel.tsx"), "utf-8");
    this.keyboardHookSource = readFileSync(
      resolve(CLI_SRC, "dashboard/hooks/use-dashboard-keyboard.ts"),
      "utf-8",
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

  /** Cycle verbosity: 0 -> 1 -> 0 */
  cycleVerbosity(): void {
    this.currentVerbosity = (this.currentVerbosity + 1) % 2;
  }

  /** Check if App.tsx has verbosity cycling state management. */
  hasVerbosityCycling(): boolean {
    return this.keyboardHookSource.includes("cycleVerbosity") ||
           this.keyboardHookSource.includes("setVerbosity") ||
           (this.appSource.includes("verbosity") && (this.appSource.includes("% 4") || this.appSource.includes("% 2")));
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
