# Error Hierarchy

## Context
Plan specified a CmuxNotAvailableError for missing binary. Implementation needed a broader error taxonomy covering connection, protocol, and timeout failures.

## Decision
CmuxError base class with three subclasses: CmuxConnectionError (binary not found, not running, connection refused), CmuxProtocolError (JSON parse failure), CmuxTimeoutError (command exceeded timeout). Renamed from plan's CmuxNotAvailableError.

## Rationale
Single CmuxNotAvailableError was too coarse — callers need to distinguish "cmux crashed" (retry later) from "bad JSON" (bug in cmux or client) from "timed out" (maybe retry with longer timeout). Subclass hierarchy lets callers catch CmuxError for generic handling or specific subclasses for targeted recovery.

## Source
cli/src/cmux-client.ts
