# 2. Analyze

## 1. Spawn Agents

Launch ALL 5 agents in a SINGLE message for parallel execution:

```yaml
Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STACK"
  prompt: [assembled STACK prompt]

Agent:
  subagent_type: Explore
  model: haiku
  description: "Analyze STRUCTURE"
  prompt: [assembled STRUCTURE prompt]

# ... etc for all 5
```

## 2. Collect Outputs

Each agent returns a complete markdown file — the updated prime document.

## 3. Handle Errors

- Agent timeout → preserve existing, log warning
- Empty response → preserve existing, log warning
- Agent error → preserve existing, log warning

## Safety Rules

- **Never read:** `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- **Always cite:** Include source files in analysis
- **Mark uncertainty:** Use `[inferred]` for low-confidence findings
