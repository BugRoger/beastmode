# Design Context

Architecture, technology decisions, and product definition for beastmode. Plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation, and a knowledge hierarchy organized across Context, Meta, and State domains. Five-phase workflow (design → plan → implement → validate → release) with four sub-phases each. Two-tier HITL gate system. Retro-driven knowledge promotion.

## Product
Product vision, capabilities, and differentiators. Beastmode turns Claude Code into a disciplined engineering partner with five-phase workflow, context persistence, self-improving retro loop, and progressive knowledge hierarchy.

1. ALWAYS design before code — structured phases prevent wasted implementation
2. NEVER skip the retro sub-phase — it's how the system learns and improves
3. Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation, brownfield discovery, fractal knowledge hierarchy, self-improving retro, squash-per-release commits, release automation, deadpan persona

design/product.md

## Architecture
System design with L0/L1/L2/L3 knowledge hierarchy, tiered L2 domain taxonomy (universal/high-frequency/specialized), three data domains (Context/State/Meta), worktree isolation, squash-per-release commits, two-tier HITL gate system, retro-driven promotion, and artifact-based context persistence.

1. ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
2. NEVER use @imports between hierarchy levels — convention-based paths only
3. Three data domains: State (feature workflow), Context (published knowledge), Meta (learnings/SOPs/overrides)
4. Sub-phase anatomy is invariant: prime → execute → validate → checkpoint

design/architecture.md

## Tech Stack
Claude Code plugin platform with markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code.

1. NEVER add runtime dependencies — beastmode is markdown interpreted by Claude Code
2. ALWAYS use markdown + YAML frontmatter for skill definitions
3. Distribution via Claude Code marketplace

design/tech-stack.md
