# Unified Hook Context

## Context
Three divergent mechanisms for passing session context to hooks: inline env vars (SessionStart only), positional CLI args (HITL), and filesystem inference (`basename(repoRoot)` in generate-output). Skills derived artifact filenames independently from slash command args.

## Decision
Standardize on inline env var prefix for all command hooks. Metadata section in SessionStart provides resolved paths so skills never derive filenames. Pre-create entities so IDs are always available.

## Rationale
- Inline env vars over positional args: env vars scale to N parameters without breaking existing arg parsers; positional args required exact ordering knowledge per hook
- Metadata prepended, not appended: skills parse top-down, metadata at top is found immediately without scanning past potentially large context
- Pre-creation over create-if-missing: eliminates a second code path for entity creation that existed solely because design phase historically created entities during reconciliation; single creation path is easier to reason about and test
- Fallback retained for HITL only: backwards compatibility for manual `bunx beastmode hooks hitl-auto plan` invocation; session-start/session-stop have no manual invocation use case
