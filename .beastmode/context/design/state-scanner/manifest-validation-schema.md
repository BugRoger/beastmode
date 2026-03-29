## Context
Scanner and store need a shared definition of what constitutes a valid PipelineManifest. The manifest-file-management design moves validation into manifest-store.ts.

## Decision
manifest-store.ts owns the validate() function — single source of truth for manifest structure. PipelineManifest required fields: slug (string), phase (valid Phase literal), features (ManifestFeature[]), lastUpdated (ISO-8601 string). Optional fields: artifacts (Record<string, string[]>), worktree ({ branch, path }), github ({ epic, repo }), blocked ({ gate, reason } | null). The old `design` required field is dropped. Feature status values validated: pending, in-progress, completed, blocked. Strict rejection — invalid manifests are skipped entirely.

## Rationale
Validation in the store ensures every manifest read or written passes the same structural checks. Dropping the `design` required field reflects that the manifest no longer duplicates artifact paths as required top-level fields.

## Source
.beastmode/artifacts/design/2026-03-29-status-unfuckery-v2.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
