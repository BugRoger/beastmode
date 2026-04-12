import { World, setWorldConstructor } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";

export class HeartbeatWatchWorld extends World {
  events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  emitter = new EventEmitter();

  captureEvent(type: string, payload: Record<string, unknown>): void {
    this.events.push({ type, payload });
  }

  reset(): void {
    this.events = [];
    this.emitter.removeAllListeners();
    this.emitter = new EventEmitter();
  }
}

setWorldConstructor(HeartbeatWatchWorld);
