# Design Context

Architecture, technology decisions, and product definition for beastmode. Plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation, and a knowledge hierarchy organized across Context, Meta, and State domains. Five-phase workflow (design -> plan -> implement -> validate -> release) with four sub-phases each. Two-tier HITL gate system with task-runner enforcement. Artifact-scoped retro reconciliation. Write-protected knowledge promotion.

## Product
Product vision, four key differentiators, and capabilities. Beastmode turns Claude Code into a disciplined engineering partner with five-phase workflow, progressive knowledge hierarchy, self-improving retro loop, context persistence, and design-before-code discipline.

1. ALWAYS design before code — structured phases prevent wasted implementation
2. NEVER skip the retro sub-phase — it's how the system learns and improves
3. Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation, brownfield discovery, progressive knowledge hierarchy, self-improving retro, squash-per-release commits, session-start hook, /beastmode command, deadpan persona

## Architecture
System design with L0/L1/L2/L3 knowledge hierarchy, standardized format per level, three data domains (Context/State/Meta), worktree isolation, squash-per-release commits, two-tier HITL gate system with task-runner enforcement, artifact-scoped retro reconciliation, and write-protected knowledge promotion. L0 is minimal: persona spec and workflow map only; operational details live in skills.

1. ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
2. NEVER use @imports between hierarchy levels — convention-based paths only
3. Three data domains: State (feature workflow), Context (published knowledge), Meta (learnings/SOPs/overrides)
4. Sub-phase anatomy is invariant: prime -> execute -> validate -> checkpoint
5. NEVER write to context/ or meta/ directly from phases — retro is the sole gatekeeper
6. Retro reconciliation is artifact-scoped — quick-check L1 first, deep-check L2 only when stale

## Task Runner
Shared utility that parses markdown skill files into hierarchical tasks and enforces step completion through a depth-first execution loop. Lazy expansion, structural gate enforcement, validation auto-reset.

1. ALWAYS track tasks via TodoWrite — one in_progress at a time
2. NEVER expand linked files eagerly — lazy expansion on first visit only
3. Gate steps (`## N. [GATE|...]`) are structural — cannot be bypassed

## Release Workflow
Version detection, commit sequencing, changelog generation, and merge strategy. Retro runs inside execute before commit to ensure meta changes are included.

1. ALWAYS run retro before the release commit
2. NEVER make interim commits during feature work — single commit at release
3. ALWAYS archive branch tip before squash merge

## Phase Transitions
Self-chaining mechanism between phases. Auto-transitions use fully-qualified Skill tool calls with context threshold checks.

1. ALWAYS check context threshold before auto-advancing
2. NEVER auto-advance below threshold — print restart instructions and STOP

## Tech Stack
Claude Code plugin platform with markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code.

1. NEVER add runtime dependencies — beastmode is markdown interpreted by Claude Code
2. ALWAYS use markdown + YAML frontmatter for skill definitions
3. Distribution via Claude Code marketplace
