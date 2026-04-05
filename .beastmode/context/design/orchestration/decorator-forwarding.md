# Decorator Forwarding

## Context
ReconcilingFactory wraps an inner SessionFactory but never called the inner factory's `cleanup()` method on the release success path. ITermSessionFactory implemented cleanup correctly. The bug was purely that the decorator didn't forward the call.

## Decision
ALWAYS forward optional interface methods through decorator/proxy factories — when an inner factory gains a new optional method, the wrapping factory must either forward it or explicitly document why it does not.

## Rationale
Decorator patterns that selectively forward create "interface contract gaps" where capability exists at the concrete level but is invisible to the orchestration layer. This class of bug is silent (no compile error for optional methods) and only manifests at runtime when the lifecycle event fires. The epic-tab-cleanup bug survived because cleanup() was optional on the interface.

## Source
cli/src/reconciling-factory.ts — cleanup() and setBadgeOnContainer() forwarding added in epic-tab-cleanup
