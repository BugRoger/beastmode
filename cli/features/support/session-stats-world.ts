import { World, setWorldConstructor } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";

export class SessionStatsWorld extends World {
  emitter!: EventEmitter;
  accumulator: any = null;
  startTime: number = 0;
  currentTime: number = 0;
}

setWorldConstructor(SessionStatsWorld);
