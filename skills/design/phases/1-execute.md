# 1. Execute

## 1. [GATE|design.decision-tree]

Read `.beastmode/config.yaml` → resolve mode for `design.decision-tree`.
Default: `human`.

### [GATE-OPTION|human] Walk the Decision Tree

Interview the user about every aspect of this feature. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

Rules:
1. Ask questions one at a time
2. For each question, provide your recommended answer
3. If a question can be answered by exploring the codebase, explore the codebase instead of asking
4. If a question requires research (unfamiliar technology, external APIs, best practices), research inline using Explore agent with `@../../agents/common-researcher.md` — save findings to `.beastmode/state/research/YYYY-MM-DD-<topic>.md`
5. Honor prior decisions from prime — don't re-ask settled questions
6. Scope guardrail: new capabilities get deferred
   "That sounds like its own feature — I'll note it as a deferred idea. Back to the current branch."
7. Track deferred ideas internally
8. Continue until all branches of the decision tree are resolved

### [GATE-OPTION|auto] Derive All Silently

- Derive all decisions from arguments + codebase scan + prior decisions
- Research inline when needed
- Log decisions inline
- No questions asked

## 2. [GATE|design.gray-areas]

Read `.beastmode/config.yaml` → resolve mode for `design.gray-areas`.
Default: `human`.

### [GATE-OPTION|human] Gray Area Sweep

Second pass to catch big-picture blind spots the decision tree may have missed.

1. Step back and analyze the full picture for decisions that would change the outcome
2. Present the 3 most unclear areas + "Other"
   - Use `AskUserQuestion` with `multiSelect: true`
   - Annotate options with codebase context when relevant
3. User multi-selects which to discuss
4. Per selected area: one question at a time, recommendation included
   - "You decide" option on every question (explicit discretion opt-in)
   - "Other" always available
   - Scope guardrail: defer new capabilities
5. After batch resolved: "3 more areas, or satisfied with the level of detail?"
   - "3 more" → loop back with next 3 most unclear
   - "Satisfied" → exit loop

### [GATE-OPTION|auto] Self-Check

- Review decisions for internal consistency
- Flag obvious gaps
- Log: "Gate `design.gray-areas` → auto: {N} areas checked, {N} gaps found"

## 3. Module Sketch

Sketch out the major modules that will need to be built or modified.

1. List each module with a one-sentence description
2. Actively look for opportunities to extract **deep modules** — modules that encapsulate a lot of functionality behind a simple, testable interface that rarely changes
3. For each module, note whether it's new or a modification of existing code
4. Check with user (if gate mode is human) that modules match expectations

A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

## 4. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- PRD is ready when decision tree + gray areas + modules are all resolved
