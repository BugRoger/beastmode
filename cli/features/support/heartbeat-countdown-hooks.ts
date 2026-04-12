import { Before } from "@cucumber/cucumber";
import { HeartbeatCountdownWorld } from "./heartbeat-countdown-world.js";

Before(function (this: HeartbeatCountdownWorld) {
  this.reset();
});
