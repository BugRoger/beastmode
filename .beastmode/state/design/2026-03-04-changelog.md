# Design: Changelog

**Date:** 2026-03-04
**Feature:** `feature/changelog`

## Goal

Add a CHANGELOG.md to the beastmode project, consolidating 18 release notes into a scannable, personality-flavored changelog following the format from high-star GitHub repos.

## Approach

Create a `CHANGELOG.md` at repo root that consolidates 18 releases (v0.1.12 → v0.5.2) into ~10 scannable entries. Format follows the `everything-claude-code` reference: version + dash title + date, bold bullet points with dash descriptions. Patch releases that are single-fix get folded into the next significant version. README gets a one-liner link in the Credits section.

## Key Decisions

### Locked Decisions

- **Placement**: CHANGELOG.md at repo root (not in README)
- **Tone**: Subtle flavor in version titles (e.g., "The Big Redesign"), professional descriptions
- **Format**: `### vX.Y.Z — Title (Mon YYYY)` headers, `- **Feature** — Description` bullets
- **No commit hashes**: Clean, scannable entries only
- **README link**: One-liner `See [Changelog](CHANGELOG.md)` added near bottom

### Claude's Discretion

- Exact version title wording
- Which patch releases to consolidate vs keep standalone
- Ordering of bullet points within each version entry

## Components

1. **CHANGELOG.md** (new file) — ~10 consolidated version entries, newest first
2. **README.md** (edit) — Add changelog link in Credits/bottom area

## Files Affected

| File | Action |
|------|--------|
| `CHANGELOG.md` | Create |
| `README.md` | Add link |

## Version Groupings

| Target Entry | Source Releases | Title Direction |
|---|---|---|
| v0.5.2 | v0.5.1, v0.5.2 | README & PRODUCT.md rollup |
| v0.5.0 | v0.5.0 | Parallel wave execution |
| v0.4.1 | v0.4.1 | The big redesign (implement v2, design v2, task runner) |
| v0.4.0 | v0.4.0 | Progressive knowledge hierarchy |
| v0.3.6 | v0.3.5, v0.3.6, v0.3.7, v0.3.8 | Plan & release workflow improvements |
| v0.3.3 | v0.3.3, v0.3.4 | Lean prime & lazy task expansion |
| v0.3.1 | v0.3.1 | Phase retro system |
| v0.3.0 | v0.3.0 | Git branching & worktrees |
| v0.2.0 | v0.2.0, v0.2.1 | The .beastmode/ migration |
| v0.1.12 | v0.1.12, v0.1.13, v0.1.16 | Genesis (skill anatomy, task runner, session banner) |

## Acceptance Criteria

- [ ] CHANGELOG.md exists at repo root
- [ ] All 18 releases represented (consolidated into ~10 entries)
- [ ] Format matches reference: version + title + date headers, bold bullet descriptions
- [ ] Version titles have subtle personality (not dry, not silly)
- [ ] No commit hashes in the changelog
- [ ] README.md links to CHANGELOG.md
- [ ] Newest version appears first

## Testing Strategy

Visual review — verify the rendered markdown is scannable, entries are accurate against source release notes, and no releases are missing.

## Deferred Ideas

None.
