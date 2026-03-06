# 2. Validate

## 1. Run Tests

```bash
# Run project test command
npm test  # or appropriate command
```

Capture output and exit code.

## 2. Run Build (if applicable)

```bash
npm run build  # or appropriate command
```

## 3. Check Results

- All tests pass? ✓/✗
- Build succeeds? ✓/✗
- No lint errors? ✓/✗

## 4. Validation Gate

If any check fails:
- Report failures
- Do NOT proceed to checkpoint
- Fix issues and re-run validation

If all pass:
- Proceed to checkpoint
