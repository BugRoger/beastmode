# Research: LLM Execution Adherence

**Date:** 2026-03-04
**Phase:** design
**Objective:** Discover best practices for ensuring LLM agents complete all phases/steps in workflows

---

## Summary

LLM agents fail to complete multi-step workflows due to specification ambiguity (41.77%), coordination breakdowns (36.94%), and lost context at handoffs. Modern best practices combat this through: (1) **explicit numbered/ordered instructions with clear exit criteria** (improves adherence measurably via IFEval benchmarks), (2) **native task tracking systems like TodoWrite** that enforce sequential execution and prevent "lost in the middle" skipped steps, (3) **state persistence and structured handoffs** with JSON schemas instead of natural language, and (4) **parallel agent spawning** for independent subtasks rather than sequential single-agent chains. Beastmode already implements most of these patterns effectively through its phase-based architecture, explicit exit criteria, numbered steps, and task JSON persistence—the main opportunities are around enhancing phase clarity and preventing handoff-induced context loss.

---

## Architecture Patterns

**Multi-step workflow adherence is fundamentally a specification + state management problem.** [HIGH]

Research shows the root causes aren't random LLM failures but predictable specification problems:
- **41.77% fail due to specification ambiguity**: Vague task definitions, unclear role boundaries, missing constraints
- **36.94% fail due to coordination breakdowns**: State desync across agents, missing handoff protocols
- **~22% fail due to verification gaps**: No intermediate validation, schemas, or checkpoints
- **~16% fail due to infrastructure issues**: Rate limits, timeouts, context overflows

**Best practices fall into four categories:**

1. **Clear Instruction Design** [HIGH]
   - Explicit, unambiguous sequence markers: "First identify, then rank, then explain"
   - Role-based framing (e.g., "Act as X") combined with chain-of-thought prompting
   - Numbered/ordered instructions measurably improve adherence in benchmarks like IFEval
   - Detailed, sequential instructions progressively raise task completion to 94.3% acceptability (from 90.4%)

2. **State and Context Management** [HIGH]
   - Explicit state tracking at each step prevents "lost in the middle" failures
   - Numbered phases with clear entry/exit criteria function as rule-based checks LLMs can verify
   - Phase markers (e.g., "Phase 1: Extract; Phase 2: Verify") align with LLM in-context learning
   - State persistence across sessions via JSON (not natural language) prevents context loss

3. **Modular Architecture with Explicit Handoffs** [HIGH]
   - Break workflows into reusable, independently testable components
   - Clear intermediate reasoning stages where output feeds into next input
   - Parallel execution of independent subtasks (not sequential) reduces context overload
   - Explicit handoff protocols with predefined expectations reduce coordination failures

4. **Observability and Fallback Logic** [HIGH]
   - TodoWrite-style task trackers transform implicit planning into observable lists
   - Enforce one task in_progress at a time (sequential constraint prevents scattered attempts)
   - Intermediate validation checks catch errors before propagation
   - Correlation IDs or session tracking enable debugging of where agents diverge

---

## Standard Stack

**LangGraph** (State machine orchestration) [HIGH]
- Uses node-based DAGs for precise, non-linear workflows with branching/loops
- Built-in human-in-the-loop and human-on-the-loop for user feedback at checkpoints
- Stateful memory + LangSmith visualization for debugging state changes
- Durable execution with self-correction via re-planning on failures

**CrewAI** (Multi-agent collaboration) [HIGH]
- Role-based agents with defined roles, goals, backstories
- Process management with delegation and peer review cycles
- Autonomous self-correction loops when agents observe unsatisfactory results

**Claude Agent SDK / Agent Teams** [HIGH]
- Parallel agent spawning for independent subtasks (e.g., researcher, reviewer)
- Clear handoff expectations enabling autonomous coordination
- Reviewer agents flag issues; lead agent re-delegates based on feedback
- Context compaction (beta) for long-running workflows; adaptive thinking for selective reasoning

**TodoWrite** (Native task tracking) [HIGH]
- Enforces single task in_progress at a time (sequential constraint)
- Real-time progress tracking prevents "lost steps" and enables resume-on-interrupt
- Used for tasks with 3+ steps; significantly improves reliability for complex workflows
- Evidence: Vulnerability patching outperformed rigid workflows; reduces reasoning drift at higher cost

**IFEval Benchmark** (Instruction adherence evaluation) [HIGH]
- Extracts explicit instructions (line counts, sentence counts, specific constraints)
- Scores strict vs. loose accuracy of LLM adherence to numeric/verifiable constraints
- Shows numbered/ordered instructions measurably outperform vague prompts

---

## Common Pitfalls

**Specification Problems (41.77% of failures)** [HIGH]
- Role ambiguity causes agents to disobey briefs or decompose tasks poorly
- Vague task definitions lead to different interpretations across agents
- Missing constraints allow agents to take "shortcuts" that break the workflow
- Anti-pattern: Relying on implied intent; agents misfollow natural language intent

**Coordination Failures (36.94% of failures)** [HIGH]
- Communication breakdowns without explicit handoff protocols
- State desynchronization when agents assume outdated prior outputs
- Race conditions in parallel execution without clear dependencies
- Anti-pattern: Sequential chaining of everything; wastes context by forcing single agent to manage all state

**Lost Context at Handoffs** [MEDIUM]
- Context exceeds token windows; no persistent session storage
- Next agent reasons from partial snapshots instead of full prior work
- Ambiguity compounds across agents without explicit summaries
- Anti-pattern: Relying on agents to infer context; always pass explicit state

**Error Propagation & Amplification** [HIGH]
- Agents assume prior outputs are correct without validation
- One misreading cascades downstream; correlated failures worsen with steps
- Anti-pattern: No intermediate validation; verification gaps lead to invalid messages passing unchecked

**Endless Loops** [MEDIUM]
- Missing termination criteria; agents cycle on clarifications infinitely
- Difficult to define system-dependent stop conditions
- Anti-pattern: Unclear exit criteria; agents drift while re-asking for clarification

**Single-Agent Sequential Chains** [HIGH]
- Hit context limits faster than multi-agent parallel execution
- Long chains compound errors; state management issues cascade
- Anti-pattern: Forcing one agent to manage entire workflow instead of parallel independent agents

---

## SOTA vs Training

**Training Cutoff Risk:** Claude's training is 6-18 months stale (cutoff ~Aug 2024, current ~Mar 2026)

**What's Current (2026):**
- **Claude Opus 4.6** (Feb 2026) emphasizes agent teams with parallel spawning, context compaction, and adaptive thinking for long-horizon workflows
- **TodoWrite patterns** gaining traction in Spring AI (Jan 2026 Spring AI blog post on agentic patterns)
- **IFEval research** shows instruction adherence is measurable and improvable via numbered/explicit constraints
- **Multi-agent failure analysis** is well-documented (41.77%, 36.94% breakdowns published in 2025-2026)
- **LangGraph/CrewAI/Claude Agent SDK** are production standards; no major new frameworks emerged since 2024

**What Claude Might Assume (possibly stale):**
- Waterfall sequential workflows as standard (actually, parallel agent teams now preferred)
- Natural language state passing sufficient (actually, JSON + explicit schemas now standard)
- Single-agent long chains reliable (actually, fails beyond ~10 steps without structure)

---

## Don't Hand-Roll

These should use existing solutions, not custom implementations:

1. **State Machine Logic** → Use LangGraph, not custom decision trees
2. **Task Tracking** → Use TodoWrite or native task runners, not custom JSON files
3. **Multi-agent Coordination** → Use Claude Agent SDK / CrewAI patterns, not manual agent spawning
4. **State Persistence** → Use JSON schemas + version control, not ad-hoc markdown summaries
5. **Handoff Protocols** → Use structured formats (YAML/JSON), not natural language descriptions
6. **Verification Checks** → Use automated validators/schemas, not manual review steps

---

## Codebase Context: How Beastmode Currently Handles Execution Adherence

**Beastmode has implemented MANY best practices effectively:**

**Numbered, Ordered Phases** [Positive]
- `/design`: 4 phases (0-research, 1-explore, 2-design, 3-document)
- `/plan`: 4 phases (0-research, 1-prepare, 2-write, 3-handoff)
- `/implement`: 4 phases (1-setup, 2-prepare, 3-execute, 4-complete)
- Each phase is numbered, enforcing strict order + clear entry/exit criteria

**Explicit Exit Criteria** [Positive]
- Every phase ends with "Exit Criteria" section listing objective checkmarks (✓)
- Clear success path: "On success: Proceed to Phase X"
- Clear failure path: "On failure: Stop and ask for help"
- Example: `/implement` Phase 3 has red flags "Never: Commit during Execute phase"

**State Persistence via JSON** [Positive]
- `.tasks.json` persists task state with id, subject, status, blockedBy metadata
- `.agents/status/YYYY-MM-DD-<topic>.md` tracks worktree location across phases
- Design creates worktree; all phases inherit it; /release merges and cleans
- Enables resume-on-interrupt (not lost work on session timeout)

**TodoWrite Native Task Tracking** [Positive]
- Phase 2: Prepare bootstraps tasks via TodoWrite with status: pending
- Phase 3: Execute updates TodoWrite after each batch (completed/blocked)
- Each task has activeForm for real-time UI feedback
- Enforces "one task in_progress at a time" sequential constraint

**Batch Execution of Independent Tasks** [Positive]
- Phase 3: Execute batches up to 3 independent tasks in parallel
- Filter algorithm removes blocker-dependent tasks until dependencies complete
- Prevents sequential waste; uses parallelism for independent subtasks
- Spawns parallel agents for each task with explicit prompt

**Explicit Handoff Expectations** [Positive]
- Each phase ends with clear "Recommend next step: /X" handoff
- Phase transitions pass explicit context (plan path, worktree, task file)
- Status file acts as "shared state store" for coordination across phases

**Red Flags / Common Mistakes Sections** [Positive]
- Every phase documents anti-patterns (e.g., "Never: Commit during Execute")
- Common Mistakes section explains why (e.g., "Multiple commits instead of single feature commit")
- Red Flags are explicit, unambiguous constraints agents can check

**Unified Cycle Commit** [Positive]
- Design creates worktree on `cycle/<topic>` branch
- All phases (plan, implement, retro) write artifacts WITHOUT committing
- Release owns single commit + merge + cleanup
- Reduces commit noise; clear endpoint for rollback; eliminates partial-feature commits

**Constraints/HARD-GATE Blocks** [Positive]
- Each skill has `<HARD-GATE>` section with constraint one-liner
- Examples: "No EnterPlanMode" (Plan), "No implementation until design approved" (Design)
- Links to `references/constraints.md` for reasoning
- Forces explicit decision points agents must verify

---

## Opportunities for Enhancement

1. **Phase Research Dependency Markers** [Suggestion]
   - Phases 0-research exist but are optional; current code doesn't explicitly trigger them
   - Could add keyword/complexity detection that automatically runs Phase 0 if:
     - "Third-party integration" keyword detected
     - Complexity rating > 3
     - Missing context fields identified
   - Would prevent "unknown unknowns" causing failures mid-phase

2. **Explicit Dependency Graphs in Plans** [Suggestion]
   - Current approach: `blockedBy: [0]` in .tasks.json is implicit
   - Enhancement: Visual ASCII task graph in plan showing task DAG
   - Would prevent dependency misunderstandings (agent executing Task 2 before Task 1 completes)

3. **Mid-Phase Verification Checkpoints** [Suggestion]
   - Current: Exit criteria checked only at phase end
   - Enhancement: "Checkpoint" steps within long phases that verify state mid-way
   - Would catch execution drift early rather than discovering failures at phase exit

4. **Handoff Context Compaction** [Suggestion]
   - Current: Pass full plan file and status file between phases
   - Enhancement: Store compact "phase summary" in status file
   - Would reduce context window pressure on long workflows, matching Claude Opus 4.6 feature

5. **Session JSONL Tracking for Retro** [Already Implemented]
   - Architecture doc mentions this but haven't seen implementation
   - Current approach stores session JSONL paths in status markdown
   - Retro agents read files directly for conversation-informed recommendations
   - This is cutting-edge; keeps session history queryable

6. **Explicit Coordination Protocol for Parallel Agents** [In execute.md, could be enhanced]
   - Current: Parallel agents spawn with plan + task + worktree in prompt
   - Enhancement: Add explicit "handoff expectation" in parallel agent prompts
   - Examples: "Report success or failure only (no implementation details)" to prevent context overflow

---

## Recommendations

**For Beastmode Execution Adherence (in priority order):**

1. **Add Phase-Level Verification Checkpoints** (Medium effort, High impact)
   - Within /implement Phase 3: Execute, add checkpoint after each batch
   - Verify: "Are worktree changes aligned with plan? Are no stale branches present?"
   - Would catch divergence early, enabling course-correction before Phase 4

2. **Explicit Dependency Visualization in Plans** (Low effort, Medium impact)
   - /plan skill Phase 2: Write should generate ASCII DAG showing task dependencies
   - Example:
     ```
     Task 0 (Setup)
       ↓
     Task 1, 2, 3 (Parallel implementation)
       ↓
     Task 4 (Testing)
     ```
   - Prevents agent confusion about which tasks can run in parallel

3. **Auto-Trigger Phase 0: Research** (Low effort, High impact)
   - /design and /plan skills should detect keywords triggering Phase 0
   - Keywords: "third-party", "integration", "API", "unknown", "investigate"
   - Complexity thresholds: If > 3 subtasks or > 3 dependencies → auto-trigger
   - Would prevent "unknown unknowns" failures mid-workflow

4. **Enhance Parallel Agent Prompts with Explicit Coordination Signals** (Low effort, Medium impact)
   - /implement Phase 3: Parallel agent spawning should include:
     - "Minimal output" instruction to prevent context overflow
     - "Report only: Success/Failure + blocker reason (if any)"
     - "Do NOT attempt to resolve blockers; raise them for main agent"
   - Would prevent parallel agents from drifting into autonomous problem-solving

5. **Add Context Compaction Summary to Status** (Medium effort, Medium impact)
   - After /implement Phase 3: Create compact summary of "what was built"
   - Format: 3-5 bullet points per task (not full implementation details)
   - /retro and /release can reference this summary instead of re-parsing full artifacts
   - Would reduce token pressure on long workflows (matches Claude Opus 4.6 practice)

6. **Document Handoff Contract Explicitly** (Low effort, Low impact)
   - Create `skills/_shared/handoff-protocol.md`
   - Define: "What state is guaranteed to exist before Phase X? What artifacts are immutable?"
   - Example: "Before /implement, plan file must be frozen; can only add tasks, not modify"
   - Would clarify agent responsibilities at phase boundaries

---

## Sources

**Best Practices & Architecture Patterns:**
- [Deepchecks: Orchestrating Multi-Step LLM Chains](https://www.deepchecks.com/orchestrating-multi-step-llm-chains-best-practices/) — State management, fallback logic, optimization [HIGH]
- [GitHub: Multi-Agent Workflows Often Fail](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/) — Specification + coordination root causes, 41.77%/36.94% breakdown [HIGH]
- [AugmentCode: Why Multi-Agent LLM Systems Fail](https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them) — Production failure analysis [HIGH]
- [Galileo.ai: Multi-Agent LLM Systems Fail](https://galileo.ai/blog/multi-agent-llm-systems-fail) — Specification, coordination, verification gaps [HIGH]

**State of the Art (2026):**
- [Anthropic: Claude Opus 4.6](https://www.anthropic.com/news/claude-opus-4-6) — Agent teams, context compaction, adaptive thinking [HIGH]
- [Turing College: Claude Agent Teams Explained](https://www.turingcollege.com/blog/claude-agent-teams-explained) — Parallel spawning, reviewer agents, autonomous coordination [HIGH]
- [Spring AI Blog: Agentic Patterns (Jan 2026)](https://spring.io/blog/2026/01/20/spring-ai-agentic-patterns-3-todowrite) — TodoWrite for complex tasks [HIGH]
- [TopAI: AI Agent Frameworks in 2026](https://www.capsolver.com/blog/AI/top-9-ai-agent-frameworks-in-2026) — LangGraph, CrewAI, Claude Agent SDK comparison [MEDIUM]

**Instruction Adherence & IFEval:**
- [AIMon: Instruction Adherence Evaluation](https://www.aimon.ai/announcements/instruction-adherence-for-large-language-models/) — Benchmarks, explicit instructions improve adherence [HIGH]
- [PMC: Prompt Engineering for Task Compliance](https://pmc.ncbi.nlm.nih.gov/articles/PMC11638470/) — Sequential instructions raise adequacy to 94.3% [MEDIUM]
- [arXiv: Representation Engineering for Instruction-Following](https://arxiv.org/abs/2601.15495) — Early token representation of instruction-following [MEDIUM]

**Task Management & TodoWrite:**
- [Dev.to: Taming Opus 4.5 with TodoWrite](https://dev.to/shinpr/taming-opus-45s-using-todowrite-to-keep-claude-code-on-track-1ee5) — TodoWrite prevents skipped steps, enforces sequential constraint [HIGH]
- [arXiv: Long-Horizon Agentic Planning (2603.01257)](https://arxiv.org/html/2603.01257v1) — TodoWrite outperforms rigid workflows; reduces reasoning drift [MEDIUM]
