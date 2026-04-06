import { World, setWorldConstructor } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CLI_SRC = resolve(import.meta.dirname, "../../src");

export class StatsPanelWorld extends World {
  emitter = new EventEmitter();
  accumulator: any = null;
  stats: any = null;
  contentResult: any = null;
  detailsPanelSource = "";

  setup(): void {
    this.detailsPanelSource = readFileSync(resolve(CLI_SRC, "dashboard/DetailsPanel.tsx"), "utf-8");
  }

  async loadAccumulator(): Promise<void> {
    const mod = await import("../../src/dashboard/session-stats.js");
    this.accumulator = new mod.SessionStatsAccumulator(this.emitter);
  }

  emitSessionStarted(epicSlug: string, phase: string, sessionId: string, featureSlug?: string): void {
    this.emitter.emit("session-started", { epicSlug, phase, sessionId, featureSlug });
  }

  emitSessionCompleted(epicSlug: string, phase: string, success: boolean, durationMs: number, featureSlug?: string): void {
    this.emitter.emit("session-completed", { epicSlug, phase, success, durationMs, featureSlug });
  }

  emitScanComplete(epicsScanned: number, dispatched: number): void {
    this.emitter.emit("scan-complete", { epicsScanned, dispatched });
  }

  getStats(): any {
    this.stats = this.accumulator.getStats();
    return this.stats;
  }

  async resolveContent(selection: any): Promise<any> {
    const { resolveDetailsContent } = await import("../../src/dashboard/details-panel.js");
    this.contentResult = resolveDetailsContent(selection, { stats: this.accumulator.getStats() });
    return this.contentResult;
  }
}

setWorldConstructor(StatsPanelWorld);
