# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

## 2. Problem-First Question

Before loading any project context or exploring the codebase, ask the user:

> What are you trying to solve?

If the skill arguments contain topic text (e.g., `beastmode design improve error handling`), present it back as context:

> You mentioned: "<topic text>". What problem are you trying to solve?

Wait for the user's response. Their framing drives the entire design — do not proceed until they answer.

**Do NOT:**
- Explore the codebase yet
- Load project context yet
- Infer a feature name or slug from the arguments
- Treat arguments as a slug — they are optional topic context only

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/DESIGN.md`

Follow L2 convention paths (`context/design/{domain}.md`) when relevant to the current topic.

## 4. Express Path Check

If the user's response points to an existing PRD, spec, or requirements document (not a `.beastmode/artifacts/design/` file):
1. Read the document
2. Skip decision tree walk in execute
3. Jump directly to "Gray Areas" (Execute step 2) with the doc as input

## 5. [GATE|design.existing-design-choice]

Read `.beastmode/config.yaml` → resolve mode for `design.existing-design-choice`.
Default: `human`.

### [GATE-OPTION|human] Ask User

If a prior PRD exists for the same topic (matching feature name):
- Ask: "Found existing PRD for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

### [GATE-OPTION|auto] Claude Decides

Read the existing PRD and decide whether to update or start fresh based on how different the new requirements are.
Log: "Gate `design.existing-design-choice` → auto: <decision>"
