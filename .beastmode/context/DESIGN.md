# Design Context

Architecture and technology decisions for how we build beastmode. The system follows a plugin architecture on Claude Code with markdown-first skill definitions, git worktree isolation for implementation, and a four-domain knowledge organization (Product, Context, State, Meta).

## Architecture
System design with fractal L0/L1/L2/L3 knowledge hierarchy, four data domains (Product/Context/State/Meta), worktree isolation for implementation, unified cycle commits, and artifact-based context persistence across sessions.
@design/architecture.md

## Tech Stack
Claude Code plugin platform with markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code.
@design/tech-stack.md
