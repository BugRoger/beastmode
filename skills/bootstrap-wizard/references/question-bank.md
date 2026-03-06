# Question Bank

Deep-dive questions for each wizard section. Use when initial answers warrant exploration.

## Stack Questions

**Runtime:**
- What Node/Python/etc version are you targeting? Is it pinned?
- Any runtime-specific features you rely on? (e.g., Node 20's built-in test runner)

**Framework:**
- Why this framework over alternatives?
- Any framework-specific patterns to follow? (e.g., Next.js App Router vs Pages)
- Custom framework configuration?

**Dependencies:**
- Any vendored or forked dependencies?
- Dependencies to avoid or phase out?
- Required peer dependencies?

**Tooling:**
- Using a monorepo tool? (nx, turborepo, lerna)
- Custom build steps?
- Pre-commit hooks?

## Structure Questions

**Layout:**
- Monorepo or single package?
- Feature-based or layer-based organization?
- Where do shared utilities live?

**Entry Points:**
- Multiple entry points? (CLI, web, API)
- Dynamic imports or code splitting?

**Config:**
- Environment-specific configs?
- Secrets management approach?

## Conventions Questions

**Naming:**
- Barrel files (index.ts exports)?
- File suffixes (.util.ts, .types.ts)?
- Private/public distinction?

**Imports:**
- Absolute vs relative imports?
- Path aliases?
- Import order preferences?

**Errors:**
- Custom error classes?
- Error boundaries?
- Logging patterns?

## Architecture Questions

**Components:**
- Domain boundaries?
- Dependency injection?
- Plugin/extension system?

**Data Flow:**
- State management?
- Caching strategy?
- Event system?

**Decisions:**
- Key technical debt?
- Planned migrations?
- Intentional constraints?

## Testing Questions

**Frameworks:**
- Unit vs integration vs e2e split?
- Mocking strategy?
- Test data management?

**Coverage:**
- Coverage targets?
- Critical paths that must be tested?
- Areas intentionally not tested?

**Running:**
- Watch mode workflow?
- CI-specific test commands?
- Parallelization?
