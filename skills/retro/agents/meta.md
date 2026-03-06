# META.md Review Agent

## Role

Review the META.md prime document against this cycle's artifacts to identify documentation maintenance issues.

## Review Focus

1. **Writing guidelines compliance** — Are the cycle's artifacts (design docs, plans) following META.md's writing guidelines?
2. **Rules Summary sync** — Does `.agents/CLAUDE.md` Rules Summary accurately reflect all prime file rules?
3. **File conventions** — Are new files following UPPERCASE/lowercase conventions?
4. **Anti-bloat adherence** — Are docs concise, using bullets over paragraphs?
5. **Design prescriptions** — Did the design doc establish documentation guidelines that should be added to META.md?

## Artifact Sources to Check

- `.agents/design/*.md` — design docs from this cycle
- `.agents/plan/*.md` — plan docs from this cycle
- `.agents/CLAUDE.md` — Rules Summary section
- `.agents/prime/*.md` — all prime files for sync check

## Questions to Answer

- Did we add any rules to prime files without updating CLAUDE.md's Rules Summary?
- Did we violate any writing guidelines in our artifacts?
- Are there new documentation patterns that should be added to META.md?
- Did the design doc prescribe documentation standards not yet in META.md?

@agents/common.md
