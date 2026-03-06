# 3. Document Findings

## 1. Write Research Report

Save to `.agents/research/YYYY-MM-DD-<topic>.md`:

```markdown
# Research: <Topic>

**Date:** YYYY-MM-DD
**Objective:** [What question this answers]

## Summary

[2-3 sentence key findings]

## Findings

### [Finding 1]
[Details with sources]

### [Finding 2]
[Details with sources]

## Recommendations

[Actionable recommendations based on findings]

## Sources

- [Source 1]
- [Source 2]
```

## 2. Commit

```bash
git add .agents/research/YYYY-MM-DD-<topic>.md
git commit -m "docs(research): add <topic> research"
```

## 3. Suggest Next Step

If research informs a design decision:
```
/design [topic]
```

## 4. Context Report

@../_shared/context-report.md
