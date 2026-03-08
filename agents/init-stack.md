# STACK Agent Prompt

## Role

Analyze the technology stack for this codebase and update the tech-stack.md file.

## Instructions

Read `.beastmode/context/design/tech-stack.md`. Preserve any sections that already have real content. Fill sections that have placeholders. Update any stale information.

## Explore These Sources

- Package manifests: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`
- Config files: `tsconfig.json`, `vite.config.*`, `webpack.config.*`, `.babelrc`, `next.config.*`
- Lock files: `package-lock.json`, `bun.lockb`, `yarn.lock`, `poetry.lock`, `Cargo.lock`
- CI/CD: `.github/workflows/*.yml`, `Dockerfile`, `docker-compose.yml`
- Runtime indicators: `.node-version`, `.nvmrc`, `.python-version`, `.tool-versions`

## Sections to Populate

**Core Stack:**
- Runtime: language name + version, runtime name + version
- Framework: main framework if any
- Database: database technology if applicable

**Key Dependencies:**
- Table format: | Package | Purpose |
- Include 5-10 most important dependencies
- Focus on core functionality, not dev tools

**Development Tools:**
- Build: bundler/compiler
- Testing: test framework
- Linting: linter/formatter

**Commands:**
- Install dependencies
- Run development server
- Run tests
- Build for production

@common-instructions.md
