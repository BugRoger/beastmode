/**
 * CmuxClient interface and error types.
 *
 * Defines the contract for communicating with cmux over JSON-RPC Unix socket.
 * The actual transport implementation lives in a sibling feature branch;
 * this file provides the types and interface that consumers depend on.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Base error for all cmux operations. */
export class CmuxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmuxError";
  }
}

/** cmux socket not found or connection refused. */
export class CmuxConnectionError extends CmuxError {
  constructor(message: string = "Cannot connect to cmux socket") {
    super(message);
    this.name = "CmuxConnectionError";
  }
}

/** cmux operation timed out. */
export class CmuxTimeoutError extends CmuxError {
  constructor(message: string = "cmux operation timed out") {
    super(message);
    this.name = "CmuxTimeoutError";
  }
}

/** cmux returned a protocol-level error. */
export class CmuxProtocolError extends CmuxError {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "CmuxProtocolError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** Workspace info returned by cmux. */
export interface CmuxWorkspace {
  name: string;
  surfaces: string[];
}

/** Surface info returned by cmux. */
export interface CmuxSurface {
  name: string;
  workspace: string;
  /** Whether the surface's shell process is still running. */
  alive: boolean;
}

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

/** Interface for cmux communication. Implementations wrap the JSON-RPC protocol. */
export interface ICmuxClient {
  /** Check if cmux is reachable. */
  ping(): Promise<boolean>;

  /** Create a workspace. Idempotent -- returns existing if name matches. */
  createWorkspace(name: string): Promise<CmuxWorkspace>;

  /** List all workspaces. */
  listWorkspaces(): Promise<CmuxWorkspace[]>;

  /** Close a workspace and all its surfaces. */
  closeWorkspace(name: string): Promise<void>;

  /** Create a surface within a workspace. */
  createSurface(workspace: string, name: string): Promise<CmuxSurface>;

  /** Send text input to a surface (for launching commands). */
  sendText(workspace: string, surface: string, text: string): Promise<void>;

  /** Close a surface (kills its shell process). */
  closeSurface(workspace: string, surface: string): Promise<void>;

  /** Get info about a surface. */
  getSurface(workspace: string, surface: string): Promise<CmuxSurface | null>;

  /** Send a desktop notification. */
  notify(title: string, body: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------

/**
 * Check if cmux is available (socket exists and responds to ping).
 * Used by SessionFactory to decide dispatch strategy.
 */
export async function cmuxAvailable(): Promise<boolean> {
  try {
    const { existsSync } = await import("node:fs");
    if (!existsSync("/tmp/cmux.sock")) return false;
    // Full implementation will instantiate CmuxClient and ping.
    // For now, just check socket existence.
    return false;
  } catch {
    return false;
  }
}
