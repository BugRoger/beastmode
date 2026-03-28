# Implement Process

## Parallel Dispatch
- ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets
- ALWAYS use uniform transformation patterns for parallel dispatch — scales to 11+ parallel subagents with zero deviations
- [HIGH] Confirmed across 5 observations in 4 features — most reliable pattern in the implement phase

## Structural Adaptation
- ALWAYS adapt heading depth to structural context — nesting changes require heading level adjustments
- ALWAYS make detection patterns portable across nesting depths — brittle patterns break when structure changes
- ALWAYS preserve demoted files with status markers — preserves history and enables recovery

## Migration as Validation
- ALWAYS treat clean migration execution as design validation — when all old data maps cleanly, it confirms the target structure

## Edit Scope Accuracy
- ALWAYS ensure task edit ranges cover all occurrences of the target pattern — scoping to specific line ranges risks missing instances

## Cross-File Verification
- ALWAYS use grep-based cross-file verification after parallel implementation — confirms consistency across all modified files

## Meta-Implementation
- The implement phase works for self-referential changes (editing beastmode's own skill definitions) without workflow modifications

## Cross-Phase Edit Scope
- Cross-cutting features spanning all 5 phases need per-phase feature decomposition to maintain file isolation

## Template Extraction Signals
- When the same block is replicated 3+ times in a single feature, flag as shared template candidate during plan review

## Step Renumbering Friction
- Plans that insert steps between existing numbered steps should explicitly include renumbering instructions for downstream steps
