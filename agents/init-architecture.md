# ARCHITECTURE Agent Prompt

## Role

Analyze system architecture and component relationships for this codebase and update the architecture.md file.

## Instructions

Read `.beastmode/context/design/architecture.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- `README.md` for project description
- `docs/` folder for architecture docs
- Entry points and their immediate dependencies
- Directory structure for layering hints (controllers/, services/, models/)
- Key imports between modules

## Sections to Populate

**Overview:**
- 2-3 sentences describing what this system does
- High-level structure (monolith, microservices, CLI, library, etc.)

**Components:**
- List major components/modules
- For each: name, purpose, location, dependencies

**Data Flow:**
- Simple diagram showing how data moves
- Format: `[input] → [component] → [component] → [output]`

**Key Decisions:**
- Architectural decisions if documented
- Why certain patterns were chosen (if evident)

**Boundaries:**
- External APIs consumed
- Internal module boundaries
- Public interfaces exposed

@common-instructions.md
