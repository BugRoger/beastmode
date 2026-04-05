/**
 * Cucumber World for dashboard wiring integration tests.
 *
 * Reads actual source files and exposes structural/behavioral
 * properties for step definitions to assert against.
 * No React rendering — pure source analysis and constant evaluation.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CLI_SRC = resolve(import.meta.dirname, "../../src");

export class DashboardWorld extends World {
  /** Raw source of App.tsx */
  appSource = "";
  /** Raw source of ThreePanelLayout.tsx */
  threePanelSource = "";
  /** Raw source of NyanBanner.tsx */
  nyanBannerSource = "";
  /** Raw source of nyan-colors.ts */
  nyanColorsSource = "";
  /** Raw source of PanelBox.tsx */
  panelBoxSource = "";
  /** Raw source of OverviewPanel.tsx */
  overviewPanelSource = "";
  /** Raw source of monokai-palette.ts */
  monokaiPaletteSource = "";
  /** Last regex match result for When/Then handoff */
  lastMatch: string | null = null;

  /** NYAN_PALETTE imported at runtime */
  nyanPalette: string[] = [];
  /** nyanColor function imported at runtime */
  nyanColorFn!: (char: string, charIndex: number, tickOffset: number) => string | undefined;
  /** TICK_INTERVAL_MS from NyanBanner */
  tickIntervalMs = 0;

  setup(): void {
    this.appSource = readFileSync(resolve(CLI_SRC, "dashboard/App.tsx"), "utf-8");
    this.threePanelSource = readFileSync(resolve(CLI_SRC, "dashboard/ThreePanelLayout.tsx"), "utf-8");
    this.nyanBannerSource = readFileSync(resolve(CLI_SRC, "dashboard/NyanBanner.tsx"), "utf-8");
    this.nyanColorsSource = readFileSync(resolve(CLI_SRC, "dashboard/nyan-colors.ts"), "utf-8");
    this.panelBoxSource = readFileSync(resolve(CLI_SRC, "dashboard/PanelBox.tsx"), "utf-8");
    this.overviewPanelSource = readFileSync(resolve(CLI_SRC, "dashboard/OverviewPanel.tsx"), "utf-8");
    this.monokaiPaletteSource = readFileSync(resolve(CLI_SRC, "dashboard/monokai-palette.ts"), "utf-8");
  }

  async loadRuntime(): Promise<void> {
    const colors = await import("../../src/dashboard/nyan-colors.js");
    this.nyanPalette = [...colors.NYAN_PALETTE];
    this.nyanColorFn = colors.nyanColor;

    // Extract TICK_INTERVAL_MS from NyanBanner source
    const tickMatch = this.nyanBannerSource.match(/TICK_INTERVAL_MS\s*=\s*(\d+)/);
    this.tickIntervalMs = tickMatch ? parseInt(tickMatch[1], 10) : 0;
  }

  /** Check if App.tsx imports a specific module name */
  appImports(moduleName: string): boolean {
    return this.appSource.includes(`from "./${moduleName}`) ||
           this.appSource.includes(`from './${moduleName}`);
  }

  /** Check if App.tsx JSX contains a component tag */
  appRendersComponent(componentName: string): boolean {
    const tagPattern = new RegExp(`<${componentName}[\\s/>]`);
    return tagPattern.test(this.appSource);
  }

  /** Extract height="XX%" from ThreePanelLayout source for a section */
  extractHeight(sectionComment: string): string | null {
    const idx = this.threePanelSource.indexOf(sectionComment);
    if (idx === -1) return null;
    const after = this.threePanelSource.slice(idx, idx + 300);
    const match = after.match(/height="(\d+%)"/);
    return match ? match[1] : null;
  }

  /** Extract width="XX%" for a panel by title */
  extractPanelWidth(panelTitle: string): string | null {
    const pattern = new RegExp(`title="${panelTitle}"\\s+width="(\\d+%)"`);
    const match = this.threePanelSource.match(pattern);
    return match ? match[1] : null;
  }

  /** Check if a panel title exists in ThreePanelLayout */
  hasPanelTitle(title: string): boolean {
    return this.threePanelSource.includes(`title="${title}"`);
  }

  /** Extract clock interval from App.tsx */
  extractClockInterval(): number {
    const match = this.appSource.match(/setInterval\(\s*\(\)\s*=>\s*setClock\(formatClock\(\)\)\s*,\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Check if formatClock produces HH:MM:SS */
  hasHHMMSSFormat(): boolean {
    return this.appSource.includes('padStart(2, "0")') && this.appSource.includes('.join(":")');
  }
}

setWorldConstructor(DashboardWorld);
