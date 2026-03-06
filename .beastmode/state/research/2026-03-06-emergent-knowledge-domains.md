# Research: Emergent Knowledge Domains in 5-Phase Workflow Context Layers

**Date:** 2026-03-06
**Phase:** design
**Objective:** What L2 context topics consistently emerge within each phase (design, plan, implement, validate, release) across diverse project types, and what should beastmode's universal context hierarchy look like?

## Summary

Across nine project archetypes (web frontend, backend API, CLI, mobile, IaC, data pipeline, library/SDK, ML system, monorepo), the same 15-20 knowledge domains recur with remarkable consistency. The current beastmode L2 set (architecture, tech-stack, conventions, structure, agents, testing) covers the plan and implement phases reasonably well but has significant gaps in design (missing domain model, API contracts, security), validate (no L2 files at all), and release (no L2 files at all). The most striking finding: the domains that projects "discover they need" mid-project almost always cluster around boundaries -- API contracts, environment configurations, error handling strategies, and data models -- rather than around technologies.

## Method

Evidence gathered from:
- Twelve-Factor App methodology (12factor.net) [HIGH]
- DORA capabilities framework (dora.dev) [HIGH]
- Google SRE Book table of contents (sre.google) [HIGH]
- Google MLOps architecture guide (cloud.google.com) [HIGH]
- Architecture Decision Records patterns (adr.github.io, cognitect.com) [HIGH]
- CLI design guidelines (clig.dev) [HIGH]
- Keep a Changelog (keepachangelog.com) [HIGH]
- awesome-cursorrules repository patterns (github.com/PatrickJS/awesome-cursorrules) [MEDIUM]
- Claude Code best practices -- CLAUDE.md guidance (code.claude.com) [HIGH]
- Terraform module structure (developer.hashicorp.com) [HIGH]
- Android app fundamentals (developer.android.com) [HIGH]
- Monorepo tools patterns (monorepo.tools) [MEDIUM]
- SWEBOK knowledge areas (training knowledge, cross-verified) [MEDIUM]
- C4 Model architecture levels (c4model.com) [HIGH]
- Beastmode's own discovery agent output schema [HIGH -- direct codebase evidence]
- Beastmode's existing L2 files [HIGH -- direct codebase evidence]

## Phase 1: Design -- What an Agent Needs to Know to Design Well

The design phase answers: "What are we building, what are the constraints, and what are the key decisions?"

| Domain | Description | Especially Relevant For | Universal? |
|--------|-------------|------------------------|------------|
| **architecture** | System boundaries, component relationships, data flow, C4-level decomposition | All | YES |
| **tech-stack** | Languages, frameworks, key dependencies, version constraints | All | YES |
| **domain-model** | Core entities, relationships, business rules, ubiquitous language | Backend API, web app, mobile, data pipeline, ML | YES -- even CLIs have a domain model (commands, flags, config) |
| **api-contracts** | External and internal API surfaces, protocols, schemas, versioning strategy | Backend API, web frontend, mobile, library/SDK, ML (serving) | YES for multi-component systems; NO for single-module tools |
| **security** | Auth patterns, secrets management, permission models, threat boundaries | Web app, API, mobile, IaC, ML (data access) | YES -- every project has a security posture even if minimal |
| **constraints** | Performance budgets, compliance requirements, platform limitations, SLAs | All, but especially IaC, mobile, data pipeline, ML | MEDIUM -- many projects discover these late |

**Evidence:** The Twelve-Factor App's factors 1-4 (codebase, dependencies, config, backing services) all produce design-phase knowledge. DORA's "code maintainability" and "loosely coupled teams" capabilities both require documented architecture. The C4 model's four levels (system, container, component, code) map directly to design-phase documentation needs. Claude Code's CLAUDE.md guidance explicitly recommends documenting "architectural decisions specific to your project." [HIGH]

**What's currently in beastmode:** architecture.md, tech-stack.md
**Gap:** domain-model, api-contracts, security, constraints

### Where domain-model emerges by project type:

| Project Type | Domain Model Looks Like |
|-------------|------------------------|
| Web frontend | Component hierarchy, state shape, route structure, user flows |
| Backend API | Entities, aggregates, database schema, service boundaries |
| CLI tool | Command tree, configuration model, input/output contracts |
| Mobile app | Screens, navigation graph, data entities, offline state shape |
| IaC | Resource graph, environment topology, provider model |
| Data pipeline | Data entities, transformation graph, schema evolution |
| Library/SDK | Public types, extension points, configuration surface |
| ML system | Feature schema, model inputs/outputs, experiment taxonomy |
| Monorepo | Package dependency graph, shared type definitions |

## Phase 2: Plan -- What an Agent Needs to Know to Plan Well

The plan phase answers: "How do we structure the work, and what patterns should the code follow?"

| Domain | Description | Especially Relevant For | Universal? |
|--------|-------------|------------------------|------------|
| **conventions** | Naming patterns, code style, import conventions, file naming | All | YES |
| **structure** | Directory layout, where new code goes, module boundaries | All | YES |
| **error-handling** | Error types, recovery strategies, user-facing error patterns, logging conventions | All | YES -- every project discovers an error handling gap mid-implementation |
| **state-management** | How application state is organized, persisted, synchronized | Web frontend, mobile, CLI (config), data pipeline (checkpointing) | HIGH for stateful apps; LOW for pure libraries |
| **dependencies** | Dependency management rules, approved/banned packages, upgrade strategy | All, especially monorepo, library/SDK | MEDIUM -- critical for large projects, less so for small |
| **environments** | Environment configuration, feature flags, config precedence, secrets injection | All except pure libraries | YES for deployed software; NO for libraries |

**Evidence:** Twelve-Factor's factor 3 (config) and 10 (dev/prod parity) produce plan-phase knowledge about environments. The awesome-cursorrules repository's categories consistently include code standards, project structure, and state management as top-level categories. The DORA "documentation quality" capability explicitly requires knowing "how things should be done." Every CONTRIBUTING.md reviewed includes conventions and structure. [HIGH]

**What's currently in beastmode:** conventions.md, structure.md
**Gap:** error-handling, state-management, dependencies, environments

### Why error-handling emerges universally:

Error handling is the single most frequently "discovered" knowledge domain. Projects start without documenting it, then accumulate ad-hoc patterns that diverge across modules. Evidence:
- SRE Book dedicates chapters to error budgets, cascading failures, overload handling
- Twelve-Factor factor 11 (logs) is fundamentally about error observability
- CLI guidelines (clig.dev) emphasize "crafting understandable error messages"
- DORA's "monitoring and observability" capability requires consistent error semantics
- Every real-world .cursorrules file eventually adds error handling patterns

## Phase 3: Implement -- What an Agent Needs to Know to Implement Well

The implement phase answers: "What are the safety rules, how do we test, and what operational patterns exist?"

| Domain | Description | Especially Relevant For | Universal? |
|--------|-------------|------------------------|------------|
| **testing** | Test framework, commands, structure, naming, coverage targets | All | YES |
| **agents** | Multi-agent safety rules, git workflow, worktree context | Beastmode-specific (agent-driven workflows) | NO -- beastmode-specific |
| **build** | Build pipeline, compilation, bundling, asset processing, dev server | Web frontend, mobile, library/SDK, ML (training pipeline) | YES for compiled/bundled projects; LOW for scripting |
| **observability** | Logging patterns, metrics conventions, tracing, health checks | Backend API, IaC, data pipeline, ML, web app | HIGH for deployed services; LOW for libraries/CLIs |
| **data-access** | Database patterns, ORM conventions, migration strategy, caching | Backend API, web app, mobile, data pipeline, ML | HIGH for data-backed projects; LOW for pure compute |
| **integration** | Third-party service integration patterns, SDK usage, API client conventions | All multi-service projects | MEDIUM -- projects with external dependencies discover this |

**Evidence:** SWEBOK's "Software Construction" knowledge area includes coding, integration, and construction technologies. The SRE Book's "Practical Alerting from Time-Series Data" and "Monitoring Distributed Systems" chapters define implementation-phase observability knowledge. Twelve-Factor factors 5 (build/release/run) and 6 (processes) produce build and runtime knowledge. The Android fundamentals guide documents build configuration (Gradle), testing (JUnit/Espresso), and data layer patterns as implementation concerns. [HIGH]

**What's currently in beastmode:** agents.md, testing.md
**Gap:** build, observability, data-access, integration

### The "agents" domain is beastmode-specific:

The agents.md file (multi-agent safety rules) is unique to beastmode's nature as an agent workflow system. For generic projects, this slot would be better named **workflow** or **development-workflow** and would cover: branching strategy, PR conventions, code review process, CI integration. This is effectively what CONTRIBUTING.md covers in open source projects.

## Phase 4: Validate -- What an Agent Needs to Know to Validate Well

The validate phase answers: "How do we know this is ready to ship?"

| Domain | Description | Especially Relevant For | Universal? |
|--------|-------------|------------------------|------------|
| **quality-gates** | What checks must pass before release (tests, lint, type check, coverage thresholds) | All | YES |
| **review-criteria** | Code review checklist, architecture review triggers, security review requirements | All team projects | YES for team projects; LOW for solo projects |
| **performance** | Performance benchmarks, load test configuration, acceptable latency/throughput | Backend API, web frontend, mobile, data pipeline, ML | HIGH for user-facing services; LOW for internal tools |
| **compatibility** | Browser/OS/API version compatibility matrix, backward compatibility rules | Web frontend, mobile, library/SDK, API | HIGH for public-facing software; LOW for internal |
| **compliance** | Regulatory requirements, accessibility standards (WCAG), license compliance | Web app, mobile, API, IaC | MEDIUM -- projects in regulated domains discover this |

**Evidence:** DORA capabilities explicitly include "test automation," "continuous integration," and "streamlining change approval" -- all validate-phase knowledge. The SRE Book's "Release Engineering" and "Launch Coordination Checklist" chapters define pre-release quality gates. Android fundamentals document API level compliance and permission justifications as validation concerns. The keepachangelog format includes "Security" as a change category requiring validation. [HIGH]

**What's currently in beastmode:** (none)
**Gap:** quality-gates, review-criteria, performance, compatibility, compliance

### Why quality-gates is the first file every project needs:

Every project eventually defines "what must pass" before code ships. Initially this is informal ("run the tests"), but it hardens into a documented checklist. Evidence:
- Every CI/CD pipeline is a codified quality gate
- DORA's top predictor of delivery performance is deployment automation, which requires documented gates
- Even beastmode's own /validate skill already runs "tests, lint, type checks" -- it just lacks a persisted L2 file documenting the specific gates

## Phase 5: Release -- What an Agent Needs to Know to Release Well

The release phase answers: "How do we package, version, and ship this?"

| Domain | Description | Especially Relevant For | Universal? |
|--------|-------------|------------------------|------------|
| **versioning** | Version scheme (semver, calver), bump rules, pre-release conventions | All | YES |
| **changelog** | Change categorization, changelog format, audience (users vs developers) | All public-facing projects, library/SDK | YES for published software; LOW for internal |
| **deployment** | Deployment target, deployment process, rollback strategy, blue/green/canary | Backend API, web app, IaC, data pipeline, ML | YES for deployed software; NO for libraries |
| **distribution** | Package registry, app store, marketplace publishing, artifact hosting | Library/SDK, CLI, mobile, plugins (like beastmode) | HIGH for distributed software; LOW for internal services |
| **migration** | Database migration strategy, breaking change communication, upgrade guides | Backend API, library/SDK, data pipeline | MEDIUM -- emerges when breaking changes happen |

**Evidence:** Twelve-Factor factor 5 (build, release, run) directly produces release-phase knowledge. The keepachangelog format defines changelog structure. DORA's "deployment automation" and "working in small batches" capabilities require documented release processes. The SRE Book's "Release Engineering" chapter covers versioning, deployment, and rollback. Beastmode's own RELEASE.md L1 already mentions "versioning strategy, commit message format, archive tagging" as planned L2 topics. [HIGH]

**What's currently in beastmode:** (none)
**Gap:** versioning, changelog, deployment, distribution, migration

## Cross-Phase Analysis: What's Universal vs. Project-Type-Specific

### Tier 1: Universal (every non-trivial project benefits)

These 12 domains appear across all nine project archetypes:

| Phase | Universal Domains |
|-------|------------------|
| Design | architecture, tech-stack, domain-model |
| Plan | conventions, structure, error-handling |
| Implement | testing, build |
| Validate | quality-gates |
| Release | versioning, changelog, deployment |

### Tier 2: High-frequency (5+ of 9 project types)

| Domain | Phase | Project Types |
|--------|-------|--------------|
| api-contracts | Design | API, web, mobile, library, ML |
| security | Design | Web, API, mobile, IaC, ML |
| environments | Plan | Web, API, mobile, IaC, pipeline, ML |
| state-management | Plan | Web, mobile, CLI, pipeline |
| observability | Implement | API, web, IaC, pipeline, ML |
| data-access | Implement | API, web, mobile, pipeline, ML |
| performance | Validate | API, web, mobile, pipeline, ML |
| distribution | Release | Library, CLI, mobile, plugin |

### Tier 3: Specialized (1-4 project types, but critical when relevant)

| Domain | Phase | Project Types |
|--------|-------|--------------|
| constraints | Design | IaC, mobile, pipeline, ML |
| dependencies | Plan | Monorepo, library/SDK |
| integration | Implement | Multi-service projects |
| compatibility | Validate | Library, web frontend, mobile |
| compliance | Validate | Regulated domains |
| migration | Release | API, library, pipeline |

## SOTA vs Training: What Has Changed

**What's current (2025-2026):**
- Documentation-as-code is standard practice -- markdown in repo, not wikis [HIGH]
- Claude Code CLAUDE.md pattern has created a new "AI context" documentation category [HIGH]
- .cursorrules / .claude/settings patterns have standardized "agent instruction" docs [HIGH]
- DORA added "AI-accessible internal data" as a capability in 2024 [MEDIUM]
- ADRs are mainstream, not experimental [HIGH]

**What Claude might assume incorrectly:**
- That documentation means external docs (README, wikis) rather than machine-readable project context
- That testing.md only needs test commands, not testing strategy and patterns
- That "architecture" means just a diagram, not a living decision record
- That deployment knowledge belongs in CI/CD config, not in project context docs

## Don't Hand-Roll

1. **Changelog format** -- Use Keep a Changelog conventions, don't invent a format
2. **Versioning scheme** -- Use semver unless there's a strong reason not to
3. **Quality gate definitions** -- Derive from existing CI pipeline configuration
4. **Error handling taxonomy** -- Use established patterns (Result types, error boundaries, HTTP status conventions)
5. **API contract format** -- Use OpenAPI/Swagger, Protocol Buffers, or GraphQL schema rather than prose

## Codebase Context

Beastmode currently has this L2 structure:

```
context/
  design/
    architecture.md  -- System design, components, data flow, key decisions
    tech-stack.md    -- Platform, dependencies, dev tools, commands
  plan/
    conventions.md   -- Naming, code style, patterns, anti-patterns
    structure.md     -- Directory layout, key locations, naming conventions
  implement/
    agents.md        -- Multi-agent safety, git workflow, worktree rules
    testing.md       -- Test commands, structure, conventions, coverage
  validate/
    (empty -- L1 says "no L2 detail files yet")
  release/
    (empty -- L1 says "no L2 detail files yet")
```

The discovery agent (`agents/discovery.md`) detects 5 knowledge domains: STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING. These map to the existing L2 files. The agent does not currently detect domain-model, api-contracts, security, error-handling, environments, build, observability, quality-gates, versioning, changelog, or deployment.

## Recommendations

### 1. Add Tier 1 universal domains as default L2 files

These should be created (even if initially sparse) by `/beastmode init` for all projects:

| Phase | Add | Rationale |
|-------|-----|-----------|
| Design | `domain-model.md` | Entities/types are the most frequently needed missing context for agents |
| Plan | `error-handling.md` | Every project discovers inconsistent error handling mid-build |
| Implement | `build.md` | Build commands, dev server, compilation -- agents need this for /implement |
| Validate | `quality-gates.md` | Defines "what must pass" -- needed by /validate skill |
| Release | `versioning.md` | Version scheme and bump rules -- needed by /release skill |
| Release | `changelog.md` | Change categorization format -- needed by /release skill |
| Release | `deployment.md` | How and where to deploy -- needed for deployed software |

### 2. Add Tier 2 domains as opt-in templates

These should be available but only created when the project type warrants:

| Phase | Opt-in | Trigger |
|-------|--------|---------|
| Design | `api-contracts.md` | Project has API routes, gRPC, GraphQL |
| Design | `security.md` | Project has auth, user data, secrets |
| Plan | `environments.md` | Project deploys to multiple environments |
| Plan | `state-management.md` | Frontend or stateful app detected |
| Implement | `observability.md` | Service/API detected (not library/CLI) |
| Implement | `data-access.md` | Database or ORM detected |
| Validate | `performance.md` | User-facing service detected |
| Release | `distribution.md` | Package registry or app store detected |

### 3. Rename agents.md to be more generic

`agents.md` is beastmode-specific. For generic projects, consider `workflow.md` covering: branching strategy, PR conventions, CI integration, and agent safety rules (when applicable).

### 4. Expand the discovery agent

Update `agents/discovery.md` to detect the new domains by analyzing:
- Route files, API schemas, proto files -> api-contracts
- Auth middleware, .env patterns -> security
- Error classes, try/catch patterns -> error-handling
- Docker, CI config, env files -> environments
- Build scripts, webpack/vite config -> build
- Logging imports, metrics clients -> observability
- ORM models, migration files -> data-access
- package.json version, CHANGELOG -> versioning + changelog

### 5. Validate and Release L1 files should hint at expected L2s

The current L1 files for validate and release say "no L2 detail files yet." They should instead list the expected L2 files (even if not yet created) so agents know what to look for and propose creating.

## The "Emergent" Pattern

The most important finding: projects don't start with 20 documented knowledge domains. They start with 3-5 (stack, structure, conventions, architecture, testing) and then **discover** the rest through friction:

1. An agent generates inconsistent error messages -> error-handling.md needed
2. A deploy fails because env config wasn't documented -> environments.md needed
3. A new contributor breaks the API contract -> api-contracts.md needed
4. A release ships without a changelog -> changelog.md needed
5. A security review reveals undocumented auth patterns -> security.md needed

This is exactly how beastmode's retro loop should work: learnings that recur across 3+ sessions get promoted to SOPs, and missing context domains that cause friction get promoted to new L2 files.

## Sources

- [Twelve-Factor App](https://12factor.net/) -- [HIGH]
- [DORA Capabilities](https://dora.dev/capabilities/) -- [HIGH]
- [Google SRE Book TOC](https://sre.google/sre-book/table-of-contents/) -- [HIGH]
- [Google MLOps Guide](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning) -- [HIGH]
- [ADR Patterns](https://adr.github.io/) -- [HIGH]
- [Nygard ADR Template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) -- [HIGH]
- [CLI Design Guidelines](https://clig.dev/) -- [HIGH]
- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) -- [HIGH]
- [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) -- [MEDIUM]
- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) -- [HIGH]
- [Terraform Module Structure](https://developer.hashicorp.com/terraform/language/modules/develop/structure) -- [HIGH]
- [Android Fundamentals](https://developer.android.com/guide/components/fundamentals) -- [HIGH]
- [Monorepo Tools](https://monorepo.tools/) -- [MEDIUM]
- [C4 Model](https://c4model.com/) -- [HIGH]
- [Open Source Guide](https://opensource.guide/how-to-contribute/) -- [HIGH]
- SWEBOK v3 Knowledge Areas -- [MEDIUM, training knowledge cross-verified]
