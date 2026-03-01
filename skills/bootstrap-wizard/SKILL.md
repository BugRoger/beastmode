---
name: bootstrap-wizard
description: Interactive conversational prefill of .agents/prime/*.md templates. Use after /bootstrap to configure project context through GSD-style dialogue. Covers stack, structure, conventions, architecture, testing.
---

# /bootstrap-wizard

Interactive conversational prefill of `.agents/prime/*.md` templates.

## Prerequisite Check

**FIRST:** Verify `.agents/prime/` exists.
- If missing: "Run `/bootstrap` first to create the .agents/ structure."
- If exists: Proceed with wizard

## Conversation Style

- **One question at a time** — don't overwhelm
- **Follow threads** — if answer reveals complexity, dig deeper before moving on
- **Prescriptive output** — "Use camelCase" not "Code uses camelCase"
- **Skip-friendly** — user can say "skip" or "later" for any section
- **Revisable** — user can say "go back" to revise previous section

## Flow

### 1. ORIENTATION

Start with:
> "Let's configure your project documentation. First, **what does this project do in one sentence?**"

Then:
> "Is this **greenfield** (starting fresh) or **brownfield** (existing code)?"

Follow threads based on answers before proceeding.

### 2. STACK → STACK.md

Discover via conversation:
- Language and runtime version
- Framework and why chosen
- Key dependencies and their purpose
- Build/test/lint tooling
- Common commands

**Present draft:**
> "Here's the proposed STACK.md based on our conversation:
> [show full content]
>
> Approve, edit, or regenerate?"

Write to `.agents/prime/STACK.md` on approval.

### 3. STRUCTURE → STRUCTURE.md

Discover via conversation:
- Where does source code live?
- Entry points
- Config file locations
- Where to add new features?

**Present draft** → Write on approval to `.agents/prime/STRUCTURE.md`

### 4. CONVENTIONS → CONVENTIONS.md

Discover via conversation:
- File naming (kebab-case, PascalCase?)
- Function/method naming (camelCase, snake_case?)
- Type/class naming
- Import organization
- Error handling patterns

**Present draft** → Write on approval to `.agents/prime/CONVENTIONS.md`

### 5. ARCHITECTURE → ARCHITECTURE.md

Discover via conversation:
- Major components/modules
- How they relate to each other
- Data flow
- Key architectural decisions and why

**Present draft** → Write on approval to `.agents/prime/ARCHITECTURE.md`

### 6. TESTING → TESTING.md

Discover via conversation:
- Test framework
- Test file location and naming
- How to run tests
- Coverage expectations

**Present draft** → Write on approval to `.agents/prime/TESTING.md`

### 7. WRAP-UP

After all sections:

1. Update `.agents/CLAUDE.md` Rules Summary section with one-liners for each completed file
2. Show summary of what was created
3. Offer to commit:
   > "Want me to commit these changes? (y/n)"

## Question Bank

For deeper discovery questions, see [references/question-bank.md](references/question-bank.md).
