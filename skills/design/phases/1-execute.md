# 1. Execute

## 1. Walk the Decision Tree

Interview the user about every aspect of this feature. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

Rules:
1. Ask questions one at a time
2. For each question, provide your recommended answer
3. If a question can be answered by exploring the codebase, explore the codebase instead of asking
4. If a question requires research (unfamiliar technology, external APIs, best practices), research inline using Explore agent with `@../../agents/common-researcher.md` — save findings to `.beastmode/artifacts/research/YYYY-MM-DD-<topic>.md`
5. Honor prior decisions from prime — don't re-ask settled questions
6. Scope guardrail: new capabilities get deferred
   "That sounds like its own feature — I'll note it as a deferred idea. Back to the current branch."
7. Track deferred ideas internally
8. Continue until all branches of the decision tree are resolved

## 2. Gray Area Sweep

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

## 3. Iterate Until Ready for Validation

- Go back and clarify as needed
- Keep YAGNI in mind — remove unnecessary features
- PRD is ready when decision tree + gray areas are all resolved
