/**
 * Session factory — selects the appropriate SessionStrategy
 * based on config and runtime availability.
 *
 * - "sdk":  Always use SdkStrategy (default)
 * - "cmux": Use CmuxStrategy; fall back to SDK if cmux is unreachable
 * - "auto": Probe cmux at startup; use it when available, SDK otherwise
 */

import type { DispatchStrategy } from "./config.js";
import type { SessionStrategy } from "./session-strategy.js";
import { SdkStrategy } from "./sdk-strategy.js";
import { CmuxClient, cmuxAvailable } from "./cmux-client.js";
import { CmuxStrategy } from "./cmux-strategy.js";

export interface SessionFactoryOptions {
  strategy: DispatchStrategy;
  /** Runtime check: is cmux available?  Defaults to cmuxAvailable(). */
  isCmuxAvailable?: () => Promise<boolean>;
}

/**
 * Create the appropriate session strategy based on config.
 *
 * - "sdk":  Always returns SdkStrategy
 * - "cmux": Returns CmuxStrategy if available, falls back to SDK with warning
 * - "auto": Returns CmuxStrategy if available, SdkStrategy fallback
 */
export async function createSessionStrategy(
  options: SessionFactoryOptions,
): Promise<SessionStrategy> {
  const { strategy } = options;
  const checkAvailable = options.isCmuxAvailable ?? cmuxAvailable;

  switch (strategy) {
    case "sdk":
      return new SdkStrategy();

    case "cmux": {
      const available = await checkAvailable();
      if (!available) {
        console.error(
          "[watch] cmux not available but dispatch-strategy is 'cmux'. Falling back to SDK.",
        );
        return new SdkStrategy();
      }
      console.log("[watch] Using cmux dispatch strategy");
      return new CmuxStrategy(new CmuxClient());
    }

    case "auto": {
      const available = await checkAvailable();
      if (available) {
        console.log("[watch] cmux detected — using cmux dispatch strategy");
        return new CmuxStrategy(new CmuxClient());
      }
      return new SdkStrategy();
    }

    default:
      return new SdkStrategy();
  }
}
