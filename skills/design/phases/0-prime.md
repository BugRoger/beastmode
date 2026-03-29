# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

Follow L2 convention paths (`context/design/{domain}.md`) when relevant to the current topic.

## 3. Express Path Check

If arguments point to an existing PRD, spec, or requirements document (not a `.beastmode/artifacts/design/` file):
1. Read the document
2. Skip decision tree walk in execute
3. Jump directly to "Gray Areas" (Execute step 2) with the doc as input

## 4. [GATE|design.existing-design-choice]

Read `.beastmode/config.yaml` → resolve mode for `design.existing-design-choice`.
Default: `human`.

### [GATE-OPTION|human] Ask User

If a prior PRD exists for the same topic (matching feature name):
- Ask: "Found existing PRD for this topic. What do you want to do?"
- Options: Update existing / View first / Start fresh

### [GATE-OPTION|auto] Claude Decides

Read the existing PRD and decide whether to update or start fresh based on how different the new requirements are.
Log: "Gate `design.existing-design-choice` → auto: <decision>"
