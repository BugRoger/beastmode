---
name: bootstrap-wizard
description: Interactive project configuration — wizard, configure, prefill. Use after bootstrap. Asks questions to fill prime doc templates.
---

# /bootstrap-wizard

Interactive conversational prefill of `.agents/prime/*.md` templates.

## Phases

1. [Orient](phases/1-orient.md) — Check prereqs, initial questions
2. [Discover](phases/2-discover.md) — One-at-a-time Q&A for each prime file
3. [Complete](phases/3-complete.md) — Update CLAUDE.md, offer commit
