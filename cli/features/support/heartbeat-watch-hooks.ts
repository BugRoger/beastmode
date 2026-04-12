import { Before } from "@cucumber/cucumber";
import { HeartbeatWatchWorld } from "./heartbeat-watch-world.js";

Before(function (this: HeartbeatWatchWorld) {
  this.reset();
});
