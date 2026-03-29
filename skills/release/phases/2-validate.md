# 2. Validate

## 1. Verify Release Notes

Check that release notes file exists in `.beastmode/artifacts/release/` with correct feature name and bump type.

## 2. Verify Commit Categorization

Check that release notes contain categorized commits (Features, Fixes, etc.) with no empty sections.

## 3. Validation Gate

If any check fails:
- Report specific problems
- Do NOT proceed to checkpoint

If all clean:
- Report: "Release verified. Proceeding to checkpoint."
