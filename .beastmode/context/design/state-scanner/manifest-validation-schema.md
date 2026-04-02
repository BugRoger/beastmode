## Context
Scanner and store need a shared definition of what constitutes a valid PipelineManifest. The manifest-file-management design moves validation into manifest-store.ts.

## Decision
manifest-store.ts owns the validate() function — single source of truth for manifest structure. PipelineManifest required fields: slug (string, immutable hex), phase (valid Phase literal), features (ManifestFeature[]), lastUpdated (ISO-8601 string). Optional fields: epic (string, human-readable name set after rename), originId (string, birth hex for lineage tracking), artifacts (Record<string, string[]>), summary ({ problem, solution }), worktree ({ branch, path }), github ({ epic, repo, bodyHash? }). ManifestFeature extended with optional description field. The old `design` required field is dropped. Feature status values validated: pending, in-progress, completed, blocked. Strict rejection — invalid manifests are skipped entirely. Slug format validated against `[a-z0-9](?:[a-z0-9-]*[a-z0-9])?` via `isValidSlug()`.

## Rationale
Validation in the store ensures every manifest read or written passes the same structural checks. Dropping the `design` required field reflects that the manifest no longer duplicates artifact paths as required top-level fields.

## Source
.beastmode/artifacts/design/2026-03-29-status-unfuckery-v2.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
.beastmode/artifacts/design/2026-03-31-github-issue-enrichment.md
.beastmode/artifacts/design/2026-04-01-slug-redesign.md
