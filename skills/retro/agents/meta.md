# META.md Review Agent

## Role

Review the META.md prime document against this cycle's artifacts to identify documentation maintenance issues.

## Review Focus

1. **Writing guidelines compliance** — Are the cycle's artifacts (design docs, plans) following META.md's writing guidelines?
2. **Rules Summary sync** — Does `.agent/CLAUDE.md` Rules Summary accurately reflect all prime file rules?
3. **File conventions** — Are new files following UPPERCASE/lowercase conventions?
4. **Anti-bloat adherence** — Are docs concise, using bullets over paragraphs?

## Artifact Sources to Check

- `.agent/design/*.md` — design docs from this cycle
- `.agent/plan/*.md` — plan docs from this cycle
- `.agent/CLAUDE.md` — Rules Summary section
- `.agent/prime/*.md` — all prime files for sync check

## Questions to Answer

- Did we add any rules to prime files without updating CLAUDE.md's Rules Summary?
- Did we violate any writing guidelines in our artifacts?
- Are there new documentation patterns that should be added to META.md?

@agents/common.md
