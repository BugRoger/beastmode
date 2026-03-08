# Implement Process

Emerging process patterns from implementation phases. Four topic clusters on parallel dispatch reliability, structural adaptation, migration-as-validation, and verification patterns.

## Parallel Dispatch
File-isolated waves enable reliable parallel dispatch [HIGH — confirmed across 4+ features]. Pattern uniformity is the second key enabler — uniform transformation patterns scale to 11+ parallel subagents with zero deviations. Grep-based cross-file verification is an emerging pattern for post-implementation consistency checks.
1. ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets

## Structural Adaptation
Heading depth must adapt to structural context but detection patterns must be portable across nesting depths. Demoted files should be preserved with status markers, not deleted.

## Migration as Validation
Clean migration execution confirms sound design. When all old data maps cleanly into the new structure, it validates that the target structure captures real relationships.
