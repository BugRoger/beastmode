# 2. Validate

## 1. Analyze Results

Check each gate:
- Tests: PASS/FAIL
- Lint: PASS/FAIL/SKIP
- Types: PASS/FAIL/SKIP
- Custom: PASS/FAIL/SKIP

## 2. Determine Overall Status

- All required gates pass → PASS
- Any required gate fails → FAIL

## 3. Generate Report

```markdown
# Validation Report

## Status: {PASS|FAIL}

### Tests
{output}

### Lint
{output or "Skipped"}

### Types
{output or "Skipped"}

### Custom Gates
{output or "None configured"}
```
