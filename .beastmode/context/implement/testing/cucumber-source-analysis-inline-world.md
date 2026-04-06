# Cucumber Source-Analysis Inline World Pattern

Lightweight variant of the source-analysis World pattern for small, self-contained modules.

## When to Use
- Structural property checks on a single module (under ~6 scenarios)
- No shared setup logic needed across step files
- Full World class infrastructure adds no value

## Pattern
- Single `steps.ts` file with inline TypeScript interface on `this`
- No dedicated World class file, no hooks file, no Before/After setup
- Type via `this: InlineWorldType` directly on each step function

## Contrast with Full World Pattern
- Full pattern (`cucumber-source-analysis-world.md`): multi-file component testing with shared setup
- Inline pattern: single-module testing where all state fits in one steps file

## Example
- `cli/features/version-consolidation/steps.ts` — version module structural checks
