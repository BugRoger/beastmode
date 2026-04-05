import { useState, useRef, useCallback } from "react";
import type { LogLevel, LogContext, Logger } from "../logger.js";
import { createLogger as coreCreateLogger } from "../logger.js";
import type { TreeState } from "./types.js";
import {
  createTreeState,
  addEntry as stateAddEntry,
  openPhase as stateOpenPhase,
  closePhase as stateClosePhase,
} from "./tree-state.js";
import { createTreeSink } from "./tree-sink.js";

export interface UseTreeStateResult {
  /** Current tree state. */
  state: TreeState;
  /** Add a log entry at the correct tree depth. */
  addEntry: (level: LogLevel, context: LogContext, message: string) => void;
  /** Open a phase node under an epic (auto-closes prior phase). */
  openPhase: (epicSlug: string, phase: string) => void;
  /** Close a specific phase node. */
  closePhase: (epicSlug: string, phase: string) => void;
  /** Create a Logger backed by a TreeSink that writes to this state and triggers re-renders. */
  createLogger: (verbosity: number, context?: LogContext) => Logger;
}

export function useTreeState(): UseTreeStateResult {
  const stateRef = useRef<TreeState>(createTreeState());
  const [, setRevision] = useState(0);

  const bump = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const addEntry = useCallback(
    (level: LogLevel, context: LogContext, message: string) => {
      stateAddEntry(stateRef.current, level, context, message);
      bump();
    },
    [bump],
  );

  const openPhase = useCallback(
    (epicSlug: string, phase: string) => {
      stateOpenPhase(stateRef.current, epicSlug, phase);
      bump();
    },
    [bump],
  );

  const closePhase = useCallback(
    (epicSlug: string, phase: string) => {
      stateClosePhase(stateRef.current, epicSlug, phase);
      bump();
    },
    [bump],
  );

  const createLogger = useCallback(
    (verbosity: number, context?: LogContext): Logger => {
      return coreCreateLogger(createTreeSink(stateRef.current, verbosity, bump), context);
    },
    [bump],
  );

  return {
    state: stateRef.current,
    addEntry,
    openPhase,
    closePhase,
    createLogger,
  };
}
