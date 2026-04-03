---
phase: plan
slug: github-issue-enrichment-3d61b1
epic: github-issue-enrichment
feature: section-extractor
wave: 1
---

# Section Extractor

**Design:** `.beastmode/artifacts/design/2026-04-03-github-issue-enrichment-3d61b1.md`

## User Stories

7. As a developer, I want the system to degrade gracefully when artifact paths are missing, so that GitHub sync never fails due to missing content.

## What to Build

A pure utility module that extracts named sections from markdown files using `## ` heading boundaries. The module exposes a function that takes markdown content and a section name, and returns the section body text (everything between the target `## <name>` heading and the next `## ` heading or end of file). A convenience variant accepts a file path, reads it, and delegates to the content-based function — returning `undefined` if the file doesn't exist or the section isn't found.

The extractor must strip YAML frontmatter before scanning. It must handle edge cases: missing sections, empty sections, sections at end of file, and files that don't exist. All failure modes return `undefined` — never throw.

A second convenience function extracts multiple named sections at once, returning a partial record keyed by section name. This supports the PRD extraction use case where problem, solution, user stories, and decisions are all needed in one call.

The regex approach splits on `## ` headings. No markdown AST library. The PRD template headings are controlled and predictable, so regex is sufficient.

## Acceptance Criteria

- [ ] Extracts a named `## ` section from markdown content, returning the body text between the heading and the next `## ` heading or EOF
- [ ] Strips YAML frontmatter before scanning
- [ ] Returns `undefined` for missing sections, missing files, and empty content
- [ ] Multi-section extraction returns a partial record of found sections
- [ ] File-based variant reads from disk and degrades gracefully on missing files
- [ ] Unit tests cover: normal extraction, missing section, empty section, section at EOF, frontmatter stripping, multi-section extraction, missing file
