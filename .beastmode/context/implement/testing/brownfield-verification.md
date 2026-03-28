# Brownfield Verification

## Context
Init --brownfield generates L2 context files from existing codebases. These must contain real project data, not placeholders.

## Decision
Always verify L2 files contain project-specific content. Check for populated sections, actual file paths, and real patterns. Never accept generic content. Success criteria: all L2 files populated after brownfield with no placeholder patterns.

## Rationale
Placeholder L2 files are worse than no L2 files — they give false confidence. Real data verification ensures the context hierarchy actually reflects the project.

## Source
Source artifact unknown — backfill needed
