# Implement Process

## Parallel Dispatch
- ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets
- Pattern uniformity is the second key enabler — uniform transformation patterns scale to 11+ parallel subagents with zero deviations

## Structural Adaptation
- Heading depth must adapt to structural context — nesting changes require heading level adjustments
- Detection patterns must be portable across nesting depths — brittle patterns break when structure changes
- Demoted files should be preserved with status markers, not deleted — preserves history and enables recovery

## Migration as Validation
- Clean migration execution confirms sound design — when all old data maps cleanly into the new structure, it validates the target captures real relationships
