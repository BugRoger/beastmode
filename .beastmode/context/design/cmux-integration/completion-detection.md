## Context
The watch loop needs to detect when a dispatched agent finishes work, regardless of whether it was dispatched via SDK or cmux.

## Decision
Stop hook always generates output.json from artifact frontmatter when Claude finishes — universal completion signal regardless of dispatch strategy. output.json is the sole completion marker (`.dispatch-done.json` is deleted). `CmuxStrategy` watches `artifacts/<phase>/` for `*.output.json` via `fs.watch` for near-instant detection. `SdkStrategy` reads output.json after query() iterator completes.

## Rationale
The Stop hook generates output.json by infrastructure, making completion detection implementation-agnostic at the data layer. A single completion marker simplifies both strategy implementations. The hook approach means skills never need to write a completion signal.

## Source
.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
