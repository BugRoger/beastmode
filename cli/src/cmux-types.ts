/**
 * cmux types — interfaces for cmux CLI integration.
 *
 * These types model the structured JSON responses from the cmux binary
 * and the client interface consumed by reconciliation and strategy modules.
 */

/** A cmux surface within a workspace. */
export interface CmuxSurface {
  /** Surface ID (cmux-assigned) */
  id: string;
  /** Surface title/name */
  title: string;
  /** Whether the surface process is still running */
  alive: boolean;
  /** Process ID of the surface shell, if alive */
  pid?: number;
}

/** A cmux workspace containing surfaces. */
export interface CmuxWorkspace {
  /** Workspace ID (cmux-assigned) */
  id: string;
  /** Workspace name */
  name: string;
  /** Surfaces within this workspace */
  surfaces: CmuxSurface[];
}

/** Subset of CmuxClient methods needed by reconciliation. */
export interface CmuxClientLike {
  /** List all workspaces with their surfaces and process status. */
  listWorkspaces(): Promise<CmuxWorkspace[]>;
  /** Close a specific surface by ID. */
  closeSurface(surfaceId: string): Promise<void>;
  /** Close a workspace and all its surfaces by ID. */
  closeWorkspace(workspaceId: string): Promise<void>;
}

/** Schema for .dispatch-done.json marker files. */
export interface DispatchDoneMarker {
  exitCode: number;
  costUsd: number;
  durationMs: number;
  sessionId?: string;
  timestamp: string;
}
