# 2. Validate

## 1. Verify Release Notes

Check that release notes file exists in `.beastmode/state/release/`.

## 2. Verify CHANGELOG

If project has CHANGELOG.md, verify new section was prepended with correct version.

## 3. Verify Plugin Version

Check `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` have updated version matching the release.

## 4. Verify Commit

Check unified commit was created with cycle artifact references.

## 5. Validation Gate

If any check fails:
- Report specific problems
- Do NOT proceed to checkpoint

If all clean:
- Report: "Release verified. Proceeding to checkpoint."
