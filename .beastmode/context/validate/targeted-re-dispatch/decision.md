# Targeted Re-Dispatch Decision

## Context

Before bdd-loop, validate failure triggered a REGRESS event resetting ALL features to pending. This meant a single failing feature caused a full-epic re-implement cycle — expensive and unnecessary when most features passed.

## Decision

Validate writes per-feature pass/fail into `failed-features` frontmatter. Pipeline sends REGRESS_FEATURES (resets only failing features) when this field is present. Falls back to blanket REGRESS when absent. Budget of 2 re-dispatch cycles per feature, after which the feature is marked blocked.

## Rationale

Targeted re-dispatch scales linearly with the failure, not with epic size. A 10-feature epic where one feature fails should re-implement one feature, not all ten. The blanket fallback preserves backward compatibility with test suites that cannot map failures to specific features.

## Source
.beastmode/artifacts/design/2026-04-05-bdd-loop.md
.beastmode/artifacts/plan/2026-04-05-bdd-loop-validate-feedback-loop.md
