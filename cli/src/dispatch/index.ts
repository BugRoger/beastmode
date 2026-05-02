// Core dispatch types
export type {
  DispatchedSession,
  SessionResult,
  WatchConfig,
  LockfileInfo,
  WatchLoopEventMap,
  WatchLoopLike,
  SessionStartedEvent,
  SessionCompletedEvent,
  ScanCompleteEvent,
  WatchErrorEvent,
  EpicCancelledEvent,
  ReleaseHeldEvent,
  SessionDeadEvent,
} from "./types.js";

// Re-exported store types (consumer convenience)
export type { EnrichedEpic, NextAction } from "./types.js";

// Session factory and interactive runner
export type {
  LogEntry,
  SessionCreateOpts,
  SessionHandle,
  SessionFactory,
  InteractiveRunnerOptions,
} from "./factory.js";
export { runInteractive } from "./factory.js";

// Dispatch tracker
export { DispatchTracker } from "./tracker.js";

// iTerm2 integration
export {
  It2Error,
  It2ConnectionError,
  It2NotInstalledError,
  It2Client,
  ITermSessionFactory,
  detectITerm2Env,
  checkIt2Available,
  iterm2Available,
  IT2_SETUP_INSTRUCTIONS,
} from "./it2.js";
export type {
  It2Session,
  It2Tab,
  IIt2Client,
  SpawnFn,
  CreateWorktreeFn,
  ITerm2EnvResult,
  ITerm2AvailabilityResult,
} from "./it2.js";

// Cross-platform terminal factory (Windows Terminal / GNOME Terminal)
export { TerminalSessionFactory } from "./terminal.js";
export type { CreateWorktreeFn as TerminalCreateWorktreeFn } from "./terminal.js";

// Reconciling factory
export { ReconcilingFactory } from "./reconciling.js";
