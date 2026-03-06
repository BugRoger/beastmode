## [0.2.0] - 2026-03-04

### Changed
- **BREAKING**: Migrated from `.agents/` to `.beastmode/` structure
- Root `CLAUDE.md` now imports from `.beastmode/` with L0/L1/L2 hierarchy
- Reorganized project knowledge into four domains: Product, State, Context, Meta
- Updated core workflow skills (design/plan/implement/validate/release) to use new paths

### Added
- `.beastmode/META.md` - Documentation maintenance and L0/L1/L2 hierarchy rules
- `.beastmode/state/` - Feature state artifacts (design/plan/release)
- `.beastmode/context/` - Build knowledge (architecture, conventions, testing)
- `.beastmode/meta/` - Self-improvement learnings

### Removed
- `.agents/CLAUDE.md` - Consolidated into root with @imports
- `.agents/prime/` directory - Merged into `.beastmode/context/`
- 39 state artifacts moved to `.beastmode/state/` (history preserved)

### Technical Details
- 39 files renamed with `git mv` (history preserved)
- 7 files deleted (.agents/CLAUDE.md, .agents/prime/*.md)
- Core workflow skills updated with new artifact paths
- Bootstrap skills defer to future migration (low priority)
