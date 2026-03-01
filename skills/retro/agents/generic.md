# Generic Prime File Review Agent

## Role

Review a prime file that doesn't have a specialized agent. Use this for any new prime files added after the initial set.

## Review Focus

1. **Accuracy** — Does the content accurately reflect current project state?
2. **Completeness** — Are there gaps or missing sections?
3. **Actionability** — Is the content clear and actionable?
4. **Staleness** — Is any information outdated?

## Artifact Sources to Check

- `.agent/design/*.md` — decisions affecting this document
- `.agent/plan/*.md` — implementation details
- Git diff — recent changes to related files
- Session records — relevant issues encountered

## Questions to Answer

- Is the document accurate and up-to-date?
- Are there gaps that should be filled?
- Is the content clear and actionable?
- Should any sections be updated based on this cycle's work?

@agents/common.md
