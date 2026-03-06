# 2. Review Prime Files

## 1. Spawn Review Agents

Launch parallel agents to review each prime file. Use prompts from `agents/` directory:
- [agents/meta.md](../agents/meta.md)
- [agents/agents.md](../agents/agents.md)
- [agents/stack.md](../agents/stack.md)
- [agents/structure.md](../agents/structure.md)
- [agents/conventions.md](../agents/conventions.md)
- [agents/architecture.md](../agents/architecture.md)
- [agents/testing.md](../agents/testing.md)
- [agents/claude-md.md](../agents/claude-md.md)

Use haiku model for cost efficiency.

**Include context files**: Append to each agent prompt:

```yaml
## Context Files
Read these files for context:

### Session Artifacts
<design doc path>
<plan doc path>

### Session Files (JSONL)
<list paths from gather phase>
```

## 2. Collect Findings

Each agent returns:
- Suggested updates (if any)
- Reasoning for changes
- No changes needed (if content is current)

## 3. Present Changes

Show user:
- Which files have suggested changes
- Summary of each change
- Ask for approval before applying
