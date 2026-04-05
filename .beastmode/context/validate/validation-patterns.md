# Validation Patterns

## Report Structure
- ALWAYS include date, feature name, and overall PASS/FAIL status in the header — identification
- ALWAYS include standard gate sections even when all are skipped — completeness
- ALWAYS present custom gates as a table with gate name and pass/fail result — scannable format
- ALWAYS include gate count summary (e.g., "6/6 gates passed") — at-a-glance status
- ALWAYS include feature completion section for multi-feature deliveries — sub-feature tracking
- Consistent skeleton regardless of feature type — standardized across 41+ validated features

## Acceptance Criteria Verification
- ALWAYS trace each custom gate back to a design acceptance criterion — design coverage
- ALWAYS use PASS/FAIL/DEFER status per criterion — never leave status ambiguous
- NEVER mark a criterion PASS without performing the actual check — honest verification
- DEFER for checks requiring conditions not available in the current session — explicit deferral

## Delta Framing
- ALWAYS report test results as (new count) vs. (baseline), not as absolute — delta catches regressions and improvements equally
- ALWAYS note pre-existing failures fixed by this feature as an improvement in the delta row — a net decrease in failures is a positive signal, not noise
- ALWAYS explain each element of the delta: new failures (regressions), fixed failures (improvements), new files (additions) — even a zero-delta is worth confirming explicitly

## Evidence Standards
- ALWAYS include concrete evidence for PASS results (file paths, line counts, grep output) — proof
- ALWAYS use tabular format for acceptance criteria (criterion | status columns minimum) — structured display
- NEVER assert PASS without verifiable evidence — assertion without proof is not validation
