# Research: obra/superpowers Competitive Analysis

**Date:** 2026-03-05
**Phase:** design
**Objective:** Comprehensive analysis of the Superpowers project — architecture, workflow, features, strengths, weaknesses — as competitive intelligence for beastmode.

## Summary

Superpowers is the dominant player in the "agentic coding workflow" space with 71,568 stars, 5,521 forks, and multi-platform support (Claude Code, Cursor, Codex, OpenCode). It takes a fundamentally different architectural approach than beastmode: skills are composable behavioral overlays that trigger automatically based on context, rather than explicit phase commands. Its strength is battle-tested prompt engineering for LLM compliance, particularly around TDD enforcement and anti-rationalization patterns. Its weakness is the absence of cross-session context persistence, self-improving meta layers, and structured knowledge hierarchy.

## 1. What It Is

**Value proposition:** "An agentic skills framework & software development methodology that works." Turns coding agents into disciplined engineering partners through composable skills that activate automatically.

**Target audience:** Developers using AI coding assistants (Claude Code primarily, but also Cursor, Codex, OpenCode). The writing tone assumes an intermediate-to-senior developer who wants structure without overhead.

**Author:** Jesse Vincent (obra) — well-known open source developer (RT, Perl community). Version 4.3.1 as of Feb 2026. Created Oct 2025.

**License:** MIT

**Traction:** [HIGH]
- 71,568 stars, 5,521 forks
- 196 open issues
- Active development: 30+ commits in last 3 months
- Multi-contributor: obra (primary), arittr (Drew Ritter, significant contributor), community PRs
- Rapid version iteration: v1.0 to v4.3.1 in ~5 months
- Multi-platform: Claude Code (plugin marketplace), Cursor (plugin), Codex (native skill discovery), OpenCode (JS plugin)

## 2. Architecture

### Skill-Based, Not Phase-Based

Superpowers uses **composable behavioral skills** that trigger automatically based on conversational context. This is fundamentally different from beastmode's explicit phase commands (/design, /plan, /implement).

**Directory structure:**
```
superpowers/
├── .claude-plugin/     # Plugin marketplace config
├── .cursor-plugin/     # Cursor plugin manifest
├── .codex/             # Codex install instructions
├── .opencode/          # OpenCode plugin + install
├── agents/             # 1 agent: code-reviewer.md
├── commands/           # 3 slash commands (brainstorm, write-plan, execute-plan)
├── docs/               # Testing docs, platform READMEs, plan storage
├── hooks/              # SessionStart hook (context injection)
├── lib/                # skills-core.js (skill discovery, frontmatter parsing)
├── skills/             # 14 skill directories, each with SKILL.md
│   ├── brainstorming/
│   ├── dispatching-parallel-agents/
│   ├── executing-plans/
│   ├── finishing-a-development-branch/
│   ├── receiving-code-review/
│   ├── requesting-code-review/
│   ├── subagent-driven-development/
│   ├── systematic-debugging/
│   ├── test-driven-development/
│   ├── using-git-worktrees/
│   ├── using-superpowers/
│   ├── verification-before-completion/
│   ├── writing-plans/
│   └── writing-skills/
└── tests/              # Integration tests (bash scripts, headless Claude sessions)
```

### Skill Anatomy

Each skill is a directory with a `SKILL.md` file containing:
1. **YAML frontmatter** — `name` and `description` (trigger conditions only, max 1024 chars)
2. **Markdown body** — Overview, when to use, process (often with DOT/Graphviz flowcharts), red flags, integration references

Skills reference each other with `superpowers:skill-name` namespace syntax and explicit requirement markers (`REQUIRED SUB-SKILL`, `REQUIRED BACKGROUND`).

### Context Injection Model

The `using-superpowers` skill is injected into every session via the SessionStart hook. It contains the master rule: "If even 1% chance a skill applies, you MUST invoke it." This acts as the bootstrap — the agent loads other skills on-demand via the Skill tool.

Key design: skills are NOT preloaded. The `using-superpowers` content is the only thing injected at session start. Other skills are loaded lazily when the agent determines they're relevant.

### Multi-Platform Support

- **Claude Code:** Native plugin marketplace
- **Cursor:** .cursor-plugin manifest with hook compatibility
- **Codex:** Clone + symlink to ~/.agents/skills/ (native skill discovery)
- **OpenCode:** JS plugin with custom tools via ~/.config/opencode/plugins/

### Infrastructure Code

`lib/skills-core.js` handles:
- YAML frontmatter extraction
- Recursive skill directory scanning
- Skill name resolution with shadowing (personal overrides superpowers)
- Git update checking
- Frontmatter stripping

## 3. Workflow Model

### The Happy Path

```
brainstorming → using-git-worktrees → writing-plans → subagent-driven-development → finishing-a-development-branch
```

This is NOT enforced as a strict phase pipeline. Skills trigger based on context. But the brainstorming skill has a `<HARD-GATE>` preventing any implementation before design approval.

### Detailed Flow

1. **brainstorming** — Explore project context, ask questions one at a time, propose 2-3 approaches, present design in sections, get user approval, save design doc to `docs/plans/YYYY-MM-DD-<topic>-design.md`. Terminal state: invoke writing-plans.

2. **using-git-worktrees** — Create isolated workspace. Priority: check .worktrees/ > worktrees/ > CLAUDE.md > ask user. Verify gitignore, run project setup, verify clean test baseline.

3. **writing-plans** — Break work into bite-sized tasks (2-5 min each). Every task has exact file paths, complete code, TDD steps, verification commands. Saved to `docs/plans/`. Offers choice: subagent-driven (same session) or parallel session (executing-plans).

4. **subagent-driven-development** OR **executing-plans** — SDD dispatches fresh subagent per task with two-stage review (spec compliance, then code quality). Executing-plans does batch execution with human checkpoints.

5. **finishing-a-development-branch** — Verify tests, present 4 options (merge locally, create PR, keep branch, discard), execute choice, cleanup worktree.

### Cross-Cutting Skills

- **test-driven-development** — Enforced during implementation. RED-GREEN-REFACTOR with extreme anti-rationalization defenses.
- **systematic-debugging** — 4-phase root cause process. Includes supporting docs (root-cause-tracing, defense-in-depth, condition-based-waiting).
- **verification-before-completion** — "No completion claims without fresh verification evidence."
- **requesting-code-review** / **receiving-code-review** — Code review dispatch and reception patterns.
- **dispatching-parallel-agents** — For independent multi-problem investigation.
- **writing-skills** — Meta-skill for creating new skills, applies TDD to documentation.

## 4. Key Features & Standout Capabilities

### Two-Stage Code Review (Unique) [HIGH]
The subagent-driven-development skill uses spec compliance review THEN code quality review. The spec reviewer is explicitly told "Do NOT trust the report" and must read actual code independently. This is well-thought-out and addresses real failure modes.

### Anti-Rationalization Engineering (Unique) [HIGH]
Every discipline-enforcing skill (TDD, verification, debugging) includes:
- Exhaustive rationalization tables (10-15 excuses with reality checks)
- Red flag lists for self-checking
- "Spirit vs letter" blockers ("Violating the letter IS violating the spirit")
- Specific "delete and start over" instructions
This is the most sophisticated anti-rationalization prompting I've seen in any agentic framework. Born from real testing with subagents.

### TDD as Non-Negotiable [HIGH]
The TDD skill is extraordinarily thorough (~10k chars). Not just "write tests first" but complete reasoning for WHY each excuse fails, with Good/Bad code examples, verification checklists, and integration with debugging/verification skills.

### DOT Flowcharts as Executable Specs [MEDIUM]
Skills use Graphviz DOT diagrams as authoritative process definitions. Discovered that Claude follows flowcharts more reliably than prose. Prose becomes supporting content for the flowcharts.

### Subagent Prompt Templates [HIGH]
`implementer-prompt.md`, `spec-reviewer-prompt.md`, `code-quality-reviewer-prompt.md` — complete templates for dispatching subagents. Controller provides full task text (subagents never read files). Self-review checklist before reporting.

### Skill Testing Infrastructure [MEDIUM]
Real integration tests using headless Claude sessions (`claude -p`). Parses JSONL session transcripts to verify behavior. Token usage analysis tool. Pressure scenario testing for skill compliance.

### Multi-Platform Support [HIGH]
Works on Claude Code, Cursor, Codex, and OpenCode. Each platform has tailored install instructions and compatibility layers. The SessionStart hook outputs both Cursor and Claude response shapes.

### "The Description Trap" Discovery [HIGH]
Documented finding: when a skill description summarizes the workflow, Claude follows the description instead of reading the full skill. Fix: descriptions must be trigger-conditions-only ("Use when X"), never workflow summaries. This is a genuinely novel insight about LLM prompt engineering.

## 5. Documentation Quality

**Excellent.** [HIGH]

- README is concise and well-structured (installation, workflow, what's inside, philosophy)
- Each SKILL.md is thorough with consistent structure (Overview, When to Use, Process, Red Flags, Integration)
- RELEASE-NOTES.md is comprehensive and well-maintained (37k chars covering v2.0 through v4.3.1)
- Testing documentation explains how to write and run integration tests
- Platform-specific docs for Codex, OpenCode, Windows
- writing-skills SKILL.md (22k chars) is an entire guide to skill authoring with CSO, testing methodology, anti-patterns

**Weak areas:**
- No architecture documentation (how skills interact at system level)
- No contributor guide beyond "follow writing-skills"
- No explicit roadmap

## 6. Community & Traction

| Metric | Value |
|--------|-------|
| Stars | 71,568 |
| Forks | 5,521 |
| Open Issues | 196 |
| Contributors | ~10 visible in commit history |
| Primary Author | Jesse Vincent (obra) — ~80% of commits |
| Secondary | Drew Ritter (arittr) — significant Codex/Windows work |
| Community PRs | Active (writing-plans nested fence fix, DS_Store fix, verbose flag fix) |
| Release Cadence | ~monthly, from v1.0 (Oct 2025) to v4.3.1 (Feb 2026) |
| Last Commit | 2026-02-21 |

**Activity pattern:** Burst development with extended quiet periods. Most recent commits are Windows/platform fixes, not new features. Core skill development appears to have stabilized around v4.0 (Dec 2025).

## 7. Unique Differentiators vs. Beastmode

| Capability | Superpowers | Beastmode |
|-----------|-------------|-----------|
| **Trigger model** | Automatic (context-based) | Explicit (/commands) |
| **Workflow** | Composable skills, flexible ordering | Linear 5-phase pipeline |
| **TDD enforcement** | Hardcore, anti-rationalization | Not enforced |
| **Cross-session memory** | None (stateless per session) | Full (.beastmode/ artifacts) |
| **Self-improvement** | None | Meta layer (SOPs, overrides, learnings) |
| **Knowledge hierarchy** | Flat (each skill independent) | Fractal L0/L1/L2/L3 |
| **Subagent templates** | Detailed (implementer, spec-reviewer, quality-reviewer) | Discovery agent only |
| **Code review** | Two-stage (spec compliance + quality) | None |
| **Debugging skill** | 4-phase systematic process | None |
| **Platform support** | Claude Code, Cursor, Codex, OpenCode | Claude Code only |
| **Git strategy** | Worktree-based, user-choice merge | Squash-per-release |
| **Design persistence** | docs/plans/ (design docs) | .beastmode/state/ (kanban) |
| **Skill testing** | Headless integration tests | Manual verification |
| **Stars** | 71,568 | N/A |
| **HITL gates** | HARD-GATE + informal checkpoints | Two-tier (HARD-GATE + configurable) |
| **Persona** | None | Deadpan minimalist |
| **Brownfield init** | None | Parallel discovery agents |
| **Release automation** | None | Version, changelog, marketplace publish |

## 8. Weaknesses & Gaps

### No Cross-Session Context Persistence
The biggest gap. Superpowers is stateless across sessions. There is no `.beastmode/`-equivalent for persisting project context, learnings, or feature state. Each session starts fresh with only skill definitions. This means:
- No project-specific overrides accumulate
- No learnings from past sessions inform future ones
- No feature tracking across design/plan/implement/validate/release
- The agent can't remember what was decided yesterday

### No Self-Improvement Loop
No retro mechanism, no learnings capture, no SOP promotion. Skills are static documents maintained by the author, not evolving based on session outcomes.

### No Knowledge Hierarchy
All skills are flat files at the same level. No progressive loading, no L0/L1/L2 summarization. Every skill is either fully loaded or not loaded at all. This limits scalability as skill count grows.

### No Release Automation
Finishing-a-development-branch offers merge/PR/keep/discard options, but there's no changelog generation, version bumping, marketplace publishing, or commit message standardization.

### No Validate Phase
There's `verification-before-completion` as a behavioral skill, but no structured validation phase that runs project-specific checks (tests, lint, type checks) as a gate before release. The user must manually verify.

### No Brownfield Discovery
No equivalent to `/beastmode init --brownfield` for auto-populating project context from an existing codebase. The agent starts with only skill knowledge, not project knowledge.

### Skill Triggering is Fragile
The entire system depends on the agent correctly identifying when to invoke skills. Despite aggressive anti-rationalization in `using-superpowers`, the release notes document multiple iterations of strengthening this (v3.2.2, v4.0.3, v4.3.0). The fundamental tension: automatic triggering based on LLM judgment is inherently unreliable. Beastmode sidesteps this by using explicit commands.

### Design Documents Are Ephemeral
Designs are saved to `docs/plans/` but there's no structured state machine tracking features through phases. A design document exists, but whether it's been planned, implemented, validated, or released requires the human to track.

### No Configurable Gates
HITL checkpoints are informal (user approval during brainstorming, batch checkpoints in executing-plans) but there's no config.yaml equivalent for switching between human/auto modes. You can't chain phases autonomously.

### Testing Is Shell-Script Based
Integration tests are bash scripts parsing JSONL transcripts. Functional but brittle. No test framework, no assertion library, no CI integration visible.

### Writing-Skills is Overwhelming
At 22k chars, the writing-skills SKILL.md is a comprehensive guide but also a wall of text. It covers TDD-for-docs, CSO optimization, token efficiency, flowchart conventions, testing methodology, and rationalization tables — all in one file. This seems to violate the framework's own principles of progressive loading and minimal context.

### Single Monorepo, No Separate Skills Repo (Anymore)
v2.0 moved skills to a separate repo (obra/superpowers-skills) but this was apparently reversed. Skills are now back in the main repo. This limits community contribution patterns vs. a fork-the-skills-repo model.

## 9. Lessons for Beastmode

### What Beastmode Should Learn From

1. **Anti-rationalization engineering.** The rationalization tables, red flag lists, and "spirit vs letter" blockers are proven effective. Beastmode's HARD-GATE mechanism is conceptually similar but lacks the depth of excuse-specific counters.

2. **Two-stage code review.** Spec compliance before code quality is a smart separation. Beastmode has no code review mechanism.

3. **The Description Trap.** YAML descriptions that summarize workflow cause Claude to skip reading the full skill. Beastmode's SKILL.md descriptions should follow trigger-only format.

4. **DOT flowcharts as executable specs.** Claude follows graphviz more reliably than prose for process definitions. Worth considering for beastmode phase files.

5. **Subagent prompt templates.** Complete, tested templates for implementer/reviewer subagents are more reliable than ad-hoc prompts. Beastmode's discovery agent is good but there's no implementer template.

6. **TDD enforcement depth.** If beastmode ever adds TDD as a workflow concern, the exhaustiveness of superpowers' approach is the bar.

7. **Multi-platform thinking.** Cursor and Codex support dramatically expands the addressable audience.

### Where Beastmode is Already Ahead

1. **Cross-session persistence.** .beastmode/ artifact storage is a structural advantage that superpowers has no answer for.

2. **Self-improving meta layer.** SOPs, overrides, learnings with auto-promotion is a genuine differentiator.

3. **Progressive knowledge hierarchy.** L0/L1/L2/L3 with summarization at each level beats flat skill files.

4. **Explicit workflow commands.** /design, /plan, /implement are more reliable than context-based triggering.

5. **Feature state tracking.** The state/ kanban with date-prefixed artifacts tracks features across phases.

6. **Release automation.** Squash-per-release, version detection, changelog generation, marketplace publishing.

7. **Configurable HITL gates.** config.yaml with human/auto modes enables autonomous phase chaining.

8. **Brownfield discovery.** Auto-populating project context from existing codebases.

## Sources

All findings from direct reading of https://github.com/obra/superpowers at commit e4a2375 (2026-02-21).

Files read (25+):
- README.md, RELEASE-NOTES.md, LICENSE
- All 14 skills/*/SKILL.md files
- skills/subagent-driven-development/{implementer,spec-reviewer,code-quality-reviewer}-prompt.md
- skills/systematic-debugging/{root-cause-tracing,defense-in-depth,condition-based-waiting}.md (directory listing)
- skills/test-driven-development/testing-anti-patterns.md (directory listing)
- skills/writing-skills/{anthropic-best-practices,persuasion-principles,testing-skills-with-subagents}.md (directory listing)
- agents/code-reviewer.md
- commands/{brainstorm,write-plan,execute-plan}.md
- lib/skills-core.js
- hooks/{hooks.json,session-start}
- .claude-plugin/{plugin.json,marketplace.json}
- .codex/INSTALL.md, .opencode/INSTALL.md
- docs/testing.md
- tests/claude-code/ (directory listing)
- 30 most recent commits via list_commits API
- Repository metadata via search_repositories API
