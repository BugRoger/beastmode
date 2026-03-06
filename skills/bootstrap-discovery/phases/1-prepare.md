# 1. Prepare

## 1. Check Prerequisite

Verify `.agents/prime/` exists.
- If missing: "Run `/bootstrap` first to create the .agents/ structure."
- If exists: Proceed

## 2. Read Current State

Read all 5 prime files to understand current content:
- `.agents/prime/STACK.md`
- `.agents/prime/STRUCTURE.md`
- `.agents/prime/CONVENTIONS.md`
- `.agents/prime/ARCHITECTURE.md`
- `.agents/prime/TESTING.md`

## 3. Assemble Prompts

For each prime file, concatenate:
1. Agent prompt from `references/{prime}-agent.md`
2. Common instructions from `references/common-instructions.md`
3. Current content: `"\n\n## Current Content\n\n" + file content`
