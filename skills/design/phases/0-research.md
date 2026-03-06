# 0. Research (Optional)

## 1. Check Research Trigger

Research triggers if ANY of these conditions are met:

**Keyword Detection** — user arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"
- "common approach", "standard way"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty ("not sure", "what's the right way")
- Time-sensitive patterns (frameworks, libraries)

If NO trigger detected, skip to Phase 1.

## 2. Spawn Research Agent

```bash
# Extract topic from arguments
topic="<topic-from-arguments>"
date=$(date +%Y-%m-%d)
output_path=".agents/research/${date}-${topic}.md"
```

Spawn an Explore agent with:
- Prompt: Contents of `@../../agents/researcher.md`
- Additional context: "Topic: <user's feature description>"
- Additional context: "Output path: $output_path"
- Additional context: "Phase: design"

## 3. Confirm and Continue

After agent completes:
- Read the research report
- Summarize key findings to user
- Continue to Phase 1 with research context loaded
