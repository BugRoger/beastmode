# Gate Check — Reference Only

> **Note:** This file is documentation only. Gate logic is now executed inline via `## N. Gate:` steps in each phase file, processed by the task runner. This file is NOT @imported by any phase file.

Gate behavior by mode, for reference:

## Behavior by Mode

### human
Execute the gate's original behavior:
- For APPROVAL gates: use AskUserQuestion with approval options
- For INTERACTIVE gates: use AskUserQuestion with discussion options
- For CONDITIONAL gates: present the decision to the user

### auto
Claude makes the decision and continues without asking:
- For APPROVAL gates: self-approve and proceed
- For INTERACTIVE gates: make reasonable choices (pick areas, answer own design questions, approve sections)
- For CONDITIONAL gates: make the judgment call based on context (e.g., fix the issue, pick the version, handle the deviation)

Log auto decisions inline: "Gate `<gate-id>` → auto: <decision made>"
