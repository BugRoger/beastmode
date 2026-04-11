import { World, setWorldConstructor } from "@cucumber/cucumber";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";

export class StatsPersistenceWorld extends World {
  tmpDir!: string;
  statsFilePath!: string;
  emitter!: EventEmitter;
  loadedStats: any = null;
  error: any = null;
  warningLogged = false;

  createTmpDir(): void {
    this.tmpDir = mkdtempSync(join(tmpdir(), "stats-persist-"));
    this.statsFilePath = join(this.tmpDir, "dashboard-stats.json");
  }

  cleanup(): void {
    if (this.tmpDir && existsSync(this.tmpDir)) {
      rmSync(this.tmpDir, { recursive: true, force: true });
    }
  }

  writeStatsFile(content: string): void {
    writeFileSync(this.statsFilePath, content, "utf-8");
  }

  readStatsFile(): string {
    return readFileSync(this.statsFilePath, "utf-8");
  }

  statsFileExists(): boolean {
    return existsSync(this.statsFilePath);
  }
}

setWorldConstructor(StatsPersistenceWorld);
