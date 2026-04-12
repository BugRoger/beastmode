import { World, setWorldConstructor } from "@cucumber/cucumber";

export interface CountdownState {
  mode: "counting" | "scanning" | "stopped";
  secondsRemaining: number;
  intervalSeconds: number;
  display: string;
}

export class HeartbeatCountdownWorld extends World {
  state: CountdownState = {
    mode: "stopped",
    secondsRemaining: 0,
    intervalSeconds: 60,
    display: "stopped (60s)",
  };

  events: Array<{ type: string; payload: Record<string, unknown> }> = [];

  reset(): void {
    this.state = {
      mode: "stopped",
      secondsRemaining: 0,
      intervalSeconds: 60,
      display: "stopped (60s)",
    };
    this.events = [];
  }
}

setWorldConstructor(HeartbeatCountdownWorld);
