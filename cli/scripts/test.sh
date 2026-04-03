#!/usr/bin/env bash
# Run each test file in its own bun process to prevent module state pollution.
# bun test shares module cache across files in the same invocation, causing
# mock leaks between test files that use spyOn or module-level state.
set -euo pipefail

cd "$(dirname "$0")/.."

failed=0
total=0

for f in src/__tests__/*.test.ts src/pipeline-machine/__tests__/*.test.ts; do
  total=$((total + 1))
  if ! bun test "$f" 2>&1; then
    failed=$((failed + 1))
  fi
done

echo ""
if [ "$failed" -gt 0 ]; then
  echo "FAILED: $failed/$total test files had failures"
  exit 1
else
  echo "ALL $total test files passed"
fi
