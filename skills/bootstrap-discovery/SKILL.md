---
name: bootstrap-discovery
description: Autonomous parallel codebase analysis to generate .agents/prime/*.md docs. Spawns 5 Explore agents simultaneously for STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING. Merges findings with existing content. Use after /bootstrap on existing projects.
---

# /bootstrap-discovery

Autonomous codebase analysis with parallel agents. Analyzes project and populates `.agents/prime/*.md` files.

## Prerequisite

Verify `.agents/prime/` exists. If missing: "Run `/bootstrap` first to create the .agents/ structure."

## Execution Flow

1. **Check prerequisite** — verify `.agents/prime/` directory exists
2. **Read current state** — read all 5 prime files
3. **Assemble prompts** — for each prime, concatenate: agent prompt + common instructions + current content
4. **Spawn agents** — launch 5 Explore agents in parallel (haiku model)
5. **Collect outputs** — wait for all agents, collect markdown responses
6. **Write files** — write each output to corresponding prime file
7. **Update CLAUDE.md** — follow META.md conventions for Rules Summary
8. **Complete** — list updated files, offer to commit

## Prompt Assembly

For each prime file, assemble the prompt by reading and concatenating:

```
Read: references/{prime}-agent.md
Read: references/common-instructions.md
Append: "\n\n## Current Content\n\n"
Append: .agents/prime/{PRIME}.md content
```

## Agent Invocation

Spawn all 5 agents in a SINGLE message for parallel execution:

```yaml
Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STACK"
  prompt: |
    [assembled prompt for STACK]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STRUCTURE"
  prompt: |
    [assembled prompt for STRUCTURE]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze CONVENTIONS"
  prompt: |
    [assembled prompt for CONVENTIONS]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze ARCHITECTURE"
  prompt: |
    [assembled prompt for ARCHITECTURE]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze TESTING"
  prompt: |
    [assembled prompt for TESTING]
```

## Agent Output

Each agent returns a complete markdown file — the updated prime document. No JSON, no code blocks. The coordinator writes this output directly to the prime file.

## Error Handling

- Agent timeout → skip prime, preserve existing, log warning
- Empty response → preserve existing, log warning
- Agent error → preserve existing, log warning

## Safety Rules

- **Never read:** `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- **Always cite:** Include source files in analysis
- **Mark uncertainty:** Use `[inferred]` for low-confidence findings

## References

- [references/common-instructions.md](references/common-instructions.md) - Output format and merge rules
- [references/stack-agent.md](references/stack-agent.md) - STACK agent prompt
- [references/structure-agent.md](references/structure-agent.md) - STRUCTURE agent prompt
- [references/conventions-agent.md](references/conventions-agent.md) - CONVENTIONS agent prompt
- [references/architecture-agent.md](references/architecture-agent.md) - ARCHITECTURE agent prompt
- [references/testing-agent.md](references/testing-agent.md) - TESTING agent prompt
