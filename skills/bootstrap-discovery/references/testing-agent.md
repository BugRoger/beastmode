# TESTING Agent Prompt

## Role

Analyze testing setup and conventions for this codebase and update the TESTING.md prime document.

## Instructions

Read the current TESTING.md content below. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- Test directories: `tests/`, `__tests__/`, `spec/`, `test/`
- Test file patterns: `*_test.*`, `*.spec.*`, `*.test.*`
- Test config: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `conftest.py`, `phpunit.xml`
- CI/CD for test commands: `.github/workflows/*.yml`
- Sample 2-3 test files for patterns

## Sections to Populate

**Test Commands:**
- Run all tests
- Run specific test file
- Run with coverage
- Run in watch mode

**Test Structure:**
- Unit tests: location + naming convention
- Integration tests: location + naming convention (if present)

**Conventions:**
- Test file naming pattern
- Test function/describe block naming pattern
- Fixtures/mocks location and usage

**Coverage:**
- Coverage target if configured
- Critical paths that must be tested
