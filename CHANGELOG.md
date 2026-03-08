# Changelog

All notable changes to beastmode.

---

### v0.14.35 — The Context Bridge (Mar 2026)

- **Statusline context persistence** — New `context-bridge-statusline.sh` writes real context window metrics (used%, remaining%, window size) to `/tmp/beastmode-{session_id}.json` per session
- **PostToolUse context injection** — New `context-bridge-hook.sh` reads persisted metrics and injects raw context data as `additionalContext`, replacing estimation with ground truth
- **Plugin-managed hooks** — New `hooks/hooks.json` declares SessionStart and PostToolUse hooks with `${CLAUDE_PLUGIN_ROOT}` portable paths; migrated from project settings to plugin manifest
- **Settings cleanup** — Removed hook declarations from `.claude/settings.local.json` (now plugin-managed via `plugin.json` hooks field)

### v0.14.34 — The Task-Runner Enforcer (Mar 2026)

- **Tightened HARD-GATE contract** — All 5 skill HARD-GATE blocks now require TodoWrite as the first tool call, making task-runner execution verifiable
- **Anti-freestyle enforcement** — "Do not output anything else first" prevents agents from skipping the framework and running sessions conversationally
- **Anti-rationalization line** — "Do not skip this for simple tasks" preempts the "this is too lightweight" excuse
- **Init skeleton restructured** — Init assets now match evolved reality: BEASTMODE.md, config.yaml, research/, full L3 directory tree with .gitkeep
- **PRODUCT.md → context/design/product.md** — Root-level product file moved to proper hierarchy position
- **State simplified** — No more L1 state files; just 5 phase subdirs with .gitkeep
- **Meta L2 templates** — All 5 phases get process.md + workarounds.md + L3 record directories
- **Reality cleanup** — research/ moved from state/ to root, obsolete DESIGN.md deleted, meta L2 bullets migrated to ALWAYS/NEVER format

### v0.14.33 — The Hierarchy Gates (Mar 2026)

- **Hierarchy-aligned retro gates** — Four gates match the knowledge hierarchy: `retro.records` (L3), `retro.context` (L2), `retro.phase` (L1), `retro.beastmode` (L0)
- **Bottom-up gate ordering** — Gates fire L3 → L0, approving lower levels before higher ones
- **Parallel walker spawning** — Context and meta walkers launch simultaneously, outputs merged by hierarchy level before gating
- **Unified L0 gating** — `release.beastmode-md-approval` absorbed into `retro.beastmode`, available to any phase
- **Explicit L1 gating** — L1 summary recomputation and promotions gated through `retro.phase` instead of being a silent side-effect

### v0.14.32 — The Worktree Enforcer (Mar 2026)

- **HARD-GATE worktree enforcement** — `<HARD-GATE>` blocks before worktree steps in all 5 phase files prevent Claude from rationalizing "lightweight" exceptions
- **L0 worktree rule** — BEASTMODE.md Workflow section includes `NEVER skip worktree creation` as a prime directive
- **Assert Worktree anti-rationalization** — worktree-manager.md documents the known failure mode where Claude skips worktree creation for "documentation-only" tasks

### v0.14.31 — The Docs Refresh (Mar 2026)

- **ROADMAP sync** — Added 8 shipped features to "Now" section; updated Progressive Autonomy Stage 3 to reference native Claude Code team support
- **Stale reference fixes** — Fixed L0 line count in progressive-hierarchy.md (~80 → ~40), removed `--brownfield` flag from retro-loop.md and ROADMAP.md

### v0.14.29 — The Deferred Ideas (Mar 2026)

- **Unified /beastmode command** — Single entry point with `init`, `status`, `ideas` subcommands; flat depth, no flags
- **Phase-grouped status** — `/beastmode status` shows active features grouped by workflow phase with worktree detection
- **Deferred ideas capture** — `/beastmode ideas` walks design docs, reconciles against skill files via semantic matching, marks implemented items with strikethrough
- **Auto-detect init mode** — `init` auto-selects greenfield/brownfield based on project state
- **Auto-install on init** — `init` installs `.beastmode/` skeleton automatically if missing
- **Feature name arguments** — Phase transitions use feature names (`/plan deferred-ideas`) instead of file paths, eliminating cross-session worktree discovery failures
- **Resolve Artifact** — New worktree-manager section for convention-based artifact discovery inside worktrees
- Removed standalone `/status` skill and `install` subcommand

### v0.14.28 — The Conversational Design (Mar 2026)

- **Conversational intent flow** — Design execute phase collapsed from 8 steps to 5, replacing batch-question mechanics with one-question-at-a-time conversational flow
- **On-demand codebase reading** — Scout step merged into intent understanding; code is read as questions arise rather than upfront
- **Gray area batches of 3** — Users multi-select from 3 most unclear areas with "Claude's Discretion" bucket, loop until satisfied
- **Approach-selection gate** — New `design.approach-selection` gate separates approach choice from gray area discussion
- **Scope guardrail** — Out-of-scope suggestions captured as deferred ideas, not lost
- **Gate rename** — `gray-area-selection` + `gray-area-discussion` replaced by `intent-discussion` + `approach-selection`

### v0.14.27 — The One True Next Step (Mar 2026)

- **Next Step spec** — Added "Next Step" visual language element with strict rendering rules (inline code only, single authority)
- **Transition gate standardization** — All 4 checkpoint files (design, plan, implement, validate) use identical format for next-step output
- **Retro guidance ban** — `retro.md` explicitly banned from printing transition guidance
- **Context report separation** — `context-report.md` no longer bleeds transition instructions; only describes context state
- **Auto mode prefix** — Low-context auto transitions use `Start a new session and run:` prefix

### v0.14.26 — The Readable Retro (Mar 2026)

- **Context changes template** — Retro context section uses `~`/`+` prefixes with actual content bullets instead of opaque one-liners
- **Meta review inline** — L2 edits shown with literal before/after content instead of count-heavy summary block
- **Records template** — L3 records use `>>`/`+` prefixes with one-sentence summaries, domain and confidence tags
- **Promotions template** — Shows actual ALWAYS/NEVER rules being promoted with `^` prefix and basis

### v0.14.25 — The Worktree Alignment Lock (Mar 2026)

- **Centralized feature naming** — Single `Derive Feature Name` section in worktree-manager.md ensures worktree directory names and artifact filenames always match 1:1
- **Assert Worktree guard** — pwd-based check in worktree-manager.md prevents `.beastmode/` writes outside a worktree; called by all 5 checkpoint phases, retro, and release pre-merge
- **Retro agent path injection** — Context Walker and Meta Walker receive absolute `worktree_root` path, eliminating relative-path drift
- **Release two-phase split** — Explicit TRANSITION BOUNDARY separates pre-merge (worktree) from post-merge (main) operations
- **Shared worktree operations** — All 0-prime phases reference Discover Feature + Enter Worktree from worktree-manager.md instead of inline logic

### v0.14.24 — The Hierarchy Format v2 (Mar 2026)

- **L0 bullet conversion** — BEASTMODE.md converted to pure bullet format under `##` section headers
- **L1 bullet conversion** — All 10 L1 files (5 Context + 5 Meta) stripped of prose paragraphs, rules converted to dash bullets
- **L2 bullet conversion** — All 27 L2 files converted to bullets with em dash rationale
- **Format parity** — Meta and Context domains now use identical structure at L1 and L2
- **L3 unchanged** — Record format preserved; 2 new observations appended during design retro


### v0.14.23 — The Retro Always Runs (Mar 2026)

- **Quick-exit removal** — Removed subjective quick-exit check from `retro.md`; retro always runs, agents handle empty phases gracefully
- **Release phase normalization** — Moved retro from execute (step 8.5) to checkpoint (step 1), consistent with all other phases
- **Release checkpoint expansion** — Checkpoint now owns: retro, squash merge, commit, tag, marketplace update
- **Release execute truncation** — Execute ends at step 8 (L0 proposal prep); steps 8.5-12 moved to checkpoint


### v0.14.22 — The Visual Language Lockdown (Mar 2026)

- **Strict rendering spec** — Rewrites `visual-language.md` from descriptive guide to prescriptive specification with parameterized rules tables
- **Enforcement warnings** — "DO NOT" directives on every visual element (phase indicator, context bar, handoff text)
- **Bad/good examples** — Common violations catalogued alongside correct output for pattern-matching anchors
- **Literal handoff text** — Three exact strings, no paraphrasing allowed


### v0.14.21 — The Meta Hierarchy Tightening (Mar 2026)

- **Domain rename** — `insights.md` → `process.md`, `upstream.md` → `workarounds.md` across all 5 phases
- **Directory rename** — `insights/` → `process/`, `upstream/` → `workarounds/` for all L3 record directories
- **L1 reformat** — All 5 meta L1 files now use `## Process` / `## Workarounds` sections with inlined rules (mirrors Context L1 format)
- **L2 reformat** — All 10 meta L2 files restructured with `##` sections per L3 topic (mirrors Context L2 format)
- **Retro agent update** — `retro-meta.md` updated to target new domain names and output format
- **Context/skill vocabulary** — Architecture docs and `skills/_shared/retro.md` updated from insights/upstream to process/workarounds


### v0.14.20 — The Docs Consistency Audit (Mar 2026)

- **Domain count fix** — README updated from "four domains" to three (Product merged into Context at v0.14.0)
- **Retro terminology abstraction** — retro-loop.md and README replaced Learnings/SOPs/Overrides taxonomy with confidence-based findings/procedures language
- **Meta path fix** — progressive-hierarchy.md meta domain example updated to valid `meta/DESIGN.md` path
- **Gate coverage** — configurable-gates.md now mentions retro and release gates with config.yaml pointer
- **Roadmap sync** — Moved auto-chaining, confidence promotion, checkpoint restart to Now; removed stale /compact reference


### v0.14.19 — The Meta Retro Rework (Mar 2026)

- **Meta hierarchy rebuild** — Replaced flat sops.md/overrides.md/learnings.md with L1/L2/L3 progressive knowledge hierarchy mirroring the context walker
- **Meta walker rewrite** — 6-step algorithm: Session Extraction, L1 Quick-Check, L2 Deep Check, L3 Record Management, Promotion Check, Emit Changes
- **Confidence-gated promotion** — [LOW] -> [MEDIUM] -> [HIGH] -> L1 Procedure with frequency thresholds
- **Two L2 domains** — insights (process patterns) + upstream (beastmode feedback), both promotable to L1 Procedures
- **Gate consolidation** — retro.learnings/retro.sops/retro.overrides replaced by retro.records + retro.promotions
- **Full migration** — All 5 phases migrated: 17 L3 insight records, 3 L3 upstream records, 4 L1 Procedures


### v0.14.18 — The Agent Extraction Audit (Mar 2026)

- **Agent centralization** — Moved 6 agent prompts from skill-local `references/` dirs into `agents/` with `{phase}-{role}.md` naming
- **Dead code removal** — Deleted `agents/discovery.md`, replaced by 5 specialized init agents
- **Researcher rename** — `agents/researcher.md` → `agents/common-researcher.md` following `common-{role}` convention
- **Missing reference fix** — Plan prime now references `common-researcher.md` (was missing entirely)
- **Import path updates** — All 5 affected skill files updated to new agent locations


### v0.14.17 — The Visual Language v2 (Mar 2026)

- **Handoff guidance restored** — Added missing handoff guidance thresholds to visual-language.md
- **Context report tightened** — Explicit "single code block" and "after the code block" rendering instructions in context-report.md


### v0.14.16 — The Split-Brain Fix (Mar 2026)

- **Context report authority cleanup** — Eliminated duplication between visual-language.md and context-report.md; each file now has clear ownership boundaries
- **Handoff guidance moved** — Thresholds and guidance text now owned exclusively by context-report.md
- **Rendering contradiction fixed** — Removed conflicting "code block" vs "plain text" instructions


### v0.14.15 — The Consistency Fix (Mar 2026)

- **Unified state file naming** — All phases now use `YYYY-MM-DD-<feature>.md` convention
- **Release file renames** — 51 release state files renamed from version-based to feature-based naming
- **Validate date fix** — 5 validate state files fixed from `YYYYMMDD-` to `YYYY-MM-DD-`
- **Skill template updates** — Release, validate, and retro templates updated to use new naming convention


### v0.14.14 — The Declutter, Part III (Mar 2026)

- **State L1 removal** — Deleted 5 dead state index files (`state/DESIGN.md` through `state/RELEASE.md`) that nothing consumed or maintained
- **Release skill cleanup** — Removed state L1 references from L0 proposal generation step


### v0.14.13 — The Visual Progress Language (Mar 2026)

- **Visual language spec** — New `skills/_shared/visual-language.md` defining `█▓░▒` block-element vocabulary for progress displays
- **Phase indicator** — Gradient density phase indicator at session start and phase announce showing completed/current/pending phases
- **Context bar** — Full diagnostic context bar with percentage, bar visualization, and token breakdown at checkpoints
- **Prime Directive update** — BEASTMODE.md now includes phase indicator display at session start
- **Context report update** — Switched from prose instructions to visual format with handoff guidance


### v0.14.12 — The Argument Docs (Mar 2026)

- **Retro loop doc** — Dedicated argumentative essay at `docs/retro-loop.md` covering the self-improving retro mechanism
- **Configurable gates doc** — Dedicated argumentative essay at `docs/configurable-gates.md` covering progressive autonomy through gates
- **README integration** — All three differentiator sections in "What's Different" now link to their full argument docs


### v0.14.11 — The Declutter, Part II (Mar 2026)

- **L0 simplification** — BEASTMODE.md cut from 81 to 42 lines; removed knowledge hierarchy tables, domain definitions, write protection table, sub-phase anatomy, slash commands, and configuration explanation
- **Persona pointer** — persona.md converted from full duplication to pointer referencing L0; unique content (context-awareness detail, skill announces) retained


### v0.14.10 — The Spec Update (Mar 2026)

- **Three Domains section** — `docs/progressive-hierarchy.md` now documents Context, Meta, and State as first-class domains
- **Write Protection section** — Promotion path rules (state-only writes, retro gatekeeper) added to the spec
- **Workflow section** — Five-phase pipeline and sub-phase anatomy documented in the spec
- **Level description fixes** — L0 line count corrected (~80), L1 dual-domain pattern shown


### v0.14.9 — The Banner Fix, For Real This Time (Mar 2026)

- **L0 Prime Directive** — Banner display instruction moved to BEASTMODE.md (autoloaded) with BEFORE-priority wording
- **Task-runner cleanup** — Removed dead Session Banner Check step; @import indirection never auto-expanded
- **Root cause** — Prior fixes targeted wording (v0.14.5) and task-runner (v0.14.6), but the real issue was @import non-expansion in HARD-GATE sections


### v0.14.8 — The Declutter (Mar 2026)

- **Remove CONTEXT.md** — L0 domain entry for Context removed; routing table duplicated by hierarchy conventions, zero consumers
- **Remove STATE.md** — L0 domain entry for State removed; kanban unused, `/beastmode:status` covers status needs


### v0.14.6 — The Banner Fix (Mar 2026)

- **Task-runner banner check** — New Step 1 in task-runner.md checks system context for SessionStart banner and displays it before skill execution
- **Prime Directive cleanup** — Removed redundant banner display directive from BEASTMODE.md; task-runner is sole owner
- **ANSI stripping** — Banner display strips escape codes so code blocks render cleanly


### v0.14.4 — The Format Standard (Mar 2026)

- **L1/L2/L3 format spec** — All context files standardized as rule-lists: dense summaries + numbered NEVER/ALWAYS rules
- **L3 context records** — New record format (Context/Decision/Rationale/Source) at `context/{phase}/{domain}/{record}.md`
- **Hierarchy table update** — L3 = Records, state removed from hierarchy levels in BEASTMODE.md
- **@imports removed** — All L1/L2 context files use convention-based paths
- **Retro format enforcement** — Context walker gains Format Enforcement section with `format_violation` finding type
- **Rule-writing principles** — Anti-bloat rules documented in retro agent: absolute directives, concrete rules, bullets over paragraphs


### v0.14.3 — The Write Guard (Mar 2026)

- **Write protection rule** — Phases write only to L3 state; retro is the sole gatekeeper for L0/L1/L2 promotion
- **Release L0 migration** — BEASTMODE.md updates flow through L3 proposal + retro promotion instead of direct write
- **Retro L0 promotion** — New step 10 applies L0 update proposals during release phase retro
- **Config gate** — `retro.l2-write` controls L2 context file creation during retro

### v0.14.2 — The Gap Detector (Mar 2026)

- **L2 gap detection** — Context walker gains Gap Detection Protocol with structured `context_gap` output type, confidence scoring, and accumulation-based promotion thresholds
- **Gap proposal processing** — Retro phase gains step 9 for processing context gap findings: logs gaps to learnings, gates file creation via `retro.l2-write`, creates approved L2 files with session-seeded content
- **New HITL gate** — `retro.l2-write` gate (default: human) controls L2 file creation approval

### v0.14.1 — The Agent's Handbook (Mar 2026)

- **L0 rework** — BEASTMODE.md rewritten as agent survival guide: prime directives, persona, workflow, knowledge hierarchy, domains, configuration
- **CLAUDE.md simplified** — Reduced to single `@.beastmode/BEASTMODE.md` import
- **Prime directives consolidated** — Moved from CLAUDE.md into BEASTMODE.md where they survive compression
- **Internal mechanisms removed** — Loading tables, compaction flow, writing guidelines, meta domain structure stripped from L0

### v0.14.0 — The Hierarchy Cleanup (Mar 2026)

- **BEASTMODE.md replaces L0 trio** — Single system manual (~108 lines) replaces PRODUCT.md, META.md, and .beastmode/CLAUDE.md as the sole autoload
- **@imports removed** — All L1 files use convention-based paths instead of @imports for L2 navigation
- **Three data domains** — Product domain merged into Context via `context/design/product.md`; four domains simplified to three (State/Context/Meta)
- **Skill primes updated** — All 5 phases load `context/{PHASE}.md` + `meta/{PHASE}.md` during prime (BEASTMODE.md autoloaded separately)
- **Retro agents modernized** — Convention-based L2 discovery replaces @import parsing

### v0.12.2 — The Cleanup (Mar 2026)

- **Unified gate syntax** — `[GATE|id]` / `[GATE-OPTION|mode]` replaces old `Gate:` format across all 20 gates
- **Standardized SKILL.md template** — task runner as first line in HARD-GATE, no trailing @imports
- **Import semantics** — `@file` = mandatory import, `[name](path)` = reference link, documented in conventions.md
- **Worktree detection fix** — state file reads now happen after worktree entry in plan/implement primes
- **Stale steps removed** — `Role Clarity`, `Load Prior Decisions`, prose `@` references cleaned up

### v0.12.1 — The Audit (Mar 2026)

- **ROADMAP accuracy audit** — moved shipped features (auto-chaining, persona) to Now, clarified partial implementations in Next, added designed-but-unshipped features (dynamic retro walkers), reordered Later by implementation proximity
- **Stale references removed** — "Progressive Autonomy Stage 2" with incorrect /compact references replaced by accurate "Phase auto-chaining" entry

### v0.11.1 — The Reflow (Mar 2026)

- **README restructure** — "What Makes It Different" → expanded "How It Works" + new "What Makes It Work" section
- **Mechanics-only prose** — Removed pitch framing, replaced with sharp explanations of how beastmode actually works
- **Session model documented** — Self-contained phase model (checkpoint → clean session → prime) now front and center

### v0.11.0 — The Squash (Mar 2026)

- **Squash-per-release** — `/release` uses `git merge --squash` to collapse feature branches into one commit on main
- **Archive tagging** — Feature branch tips preserved as `archive/feature/<name>` tags before deletion
- **GitHub release style commits** — `Release vX.Y.Z — Title` with categorized Features/Fixes/Artifacts body
- **Retroactive rewrite script** — `scripts/squash-history.sh` rebuilds main as one commit per version tag

### v0.10.1 — The Ungated Retro (Mar 2026)

- **Configurable retro gates** — 4 per-category `Gate:` steps (learnings, sops, overrides, context-changes) replace HTML comment annotations
- **Merge strategy gate** — Release merge/PR/keep/discard decision now configurable via `release.merge-strategy` gate
- **5 new config keys** — Fine-grained autonomous control for retro and merge phases
- **README differentiators section** — New "What Makes It Different" section with four substantial inline arguments: progressive hierarchy, compounding knowledge, session-surviving context, design-before-code

### v0.10.0 — The Visible Gate (Mar 2026)

- **Task-runner gate detection** — Gate steps processed by task runner with config.yaml lookup and mode-based substep pruning
- **Inline gate steps** — 15 `## N. Gate:` steps replace `<!-- HITL-GATE -->` annotations + `@gate-check.md`/`@transition-check.md` imports across all skill phases
- **Two-tier HITL system** — `<HARD-GATE>` for unconditional constraints, `## N. Gate:` for configurable human/auto behavior

### v0.9.0 — The Dynamic Retro (Mar 2026)

- **Dynamic retro walkers** — Replace hardcoded retro agents with structure-walking hierarchy walkers
- **Design approval summary** — Executive summary shown before design approval gate
- **Meta hierarchy** — Fractal L2 hierarchy for meta domain with SOPs, overrides, learnings per phase

### v0.8.1 — The Summary (Mar 2026)

- **Design approval summary** — Executive summary (goal, approach, locked decisions, acceptance criteria) shown before the approval gate so users see the full picture before approving

### v0.7.0 — The Argument (Mar 2026)

- **Progressive hierarchy essay** — New `docs/progressive-hierarchy.md` makes the case for curated hierarchical context over flat embedding retrieval
- **README rework** — "Why This Works" leads with hierarchy differentiator and links to the deep-dive essay
- **Agent-facing differentiators** — PRODUCT.md gains "Key Differentiators" section so agents understand *why* the hierarchy exists
- **docs/ directory** — External-facing documentation home, not imported by agents

### v0.6.1 — No More Rebase (Mar 2026)

- **Merge-only release** — Replaced `git rebase origin/main` with merge-only strategy; conflicts resolve once instead of per-commit replay
- **Fewer version files** — Dropped hardcoded version from README.md badge and PRODUCT.md `Current Version` section; version now lives in 3 files (plugin.json, marketplace.json, session-start.sh)

### v0.6.0 — The Paper Trail (Mar 2026)

- **CHANGELOG.md** — Consolidated 18 releases into 10 scannable entries with subtle personality in version titles
- **README changelog link** — Credits section now links to the full changelog

### v0.5.2 — Living Docs & README Rewrite (Mar 2026)

- **PRODUCT.md release rollup** — PRODUCT.md becomes a living document updated at release time with capabilities inventory and current version
- **README rewrite** — Restructured following high-star GitHub patterns: centered hero, badges, install-first layout, removed credibility killers

### v0.5.0 — Parallel Waves (Mar 2026)

- **Parallel wave dispatch** — /implement spawns agents concurrently within waves when file isolation analysis confirms no overlaps
- **File isolation analysis** — /plan detects file overlap per wave, auto-resequences conflicts, marks safe waves with `Parallel-safe: true`
- **Sequential fallback** — Graceful degradation to sequential dispatch when parallel safety can't be verified

### v0.4.1 — The Big Redesign (Mar 2026)

- **Implement v2** — Subagent-per-task execution model with wave ordering, deviation rules, and spec checks
- **Design v2** — Gray area identification, scope guardrails, role clarity, discussion pacing, and downstream-aware output
- **Plan improvements** — Wave-based task dependencies, design coverage verification, structured skill handoff
- **Lean prime refactor** — 0-prime is now read-only; all side effects moved to 1-execute
- **Lazy task expansion** — Sub-phases expand only when entered, reducing TodoWrite noise by ~60%
- **Git branching strategy** — `feature/<feature>` branches with `.beastmode/worktrees/` isolation
- **Phase retro system** — Parallel agents review context docs and capture meta learnings at every checkpoint
- **Release workflow** — Sync with main before version bump, fix version detection, retro before commit

### v0.4.0 — Fractal Knowledge (Mar 2026)

- **Progressive L1 docs** — Fractal knowledge hierarchy where every level follows the same pattern: summary + section summaries + @imports
- **`.beastmode/CLAUDE.md` manifest** — Pure @imports hub wiring all L0/L1 files into sessions
- **Retro bottom-up bubble** — 3-checkpoint propagates summaries L2 → L1 → L0
- **Fix: meta and state loading** — Meta learnings and state L1 files now actually loaded into sessions

### v0.3.6 — Plan & Release Polish (Mar 2026)

- **Wave-based task dependencies** — Plan task format gains `Wave` and `Depends on` fields for parallel execution
- **Design coverage verification** — Plan validation checks every design component maps to a task
- **Release version sync** — Rebase on main before bumping to eliminate version conflicts on merge
- **Release retro fix** — Retro moved before commit step so meta learnings get included in the release

### v0.3.3 — Lean & Lazy (Mar 2026)

- **Lazy task expansion** — Sub-phases expand only when a phase becomes active, not at parse time
- **Child collapse** — Completed phase children removed from TodoWrite to save tokens
- **Session tracking removal** — Eliminated `.beastmode/sessions/` directory; worktree lookup via path convention instead

### v0.3.1 — Phase Retro (Mar 2026)

- **Shared retro module** — Every workflow phase runs a scoped retro with 2 parallel agents at checkpoint
- **Context review agent** — Compares session artifacts against context docs for accuracy
- **Meta learnings agent** — Captures phase-specific insights with confidence levels
- **Quick-exit heuristic** — Skips agent review for trivial sessions

### v0.3.0 — Branching Out (Mar 2026)

- **Feature branches** — `feature/<feature>` naming replaces `cycle/<topic>`, spanning the entire design-to-release lifecycle
- **Worktree isolation** — Feature work happens in `.beastmode/worktrees/<feature>`, shared worktree-manager handles create/enter/merge/cleanup
- **Natural commits** — Removed "Do NOT commit" constraints; phases commit freely, release owns merge

### v0.2.0 — New Foundation (Mar 2026)

- **`.beastmode/` migration** — Replaced `.agents/` with organized four-domain structure: Product, State, Context, Meta
- **L0/L1/L2 hierarchy** — Efficient context loading: L1 always loaded, L2 on-demand
- **`/validate` skill** — Quality gate before release with tests, lint, type checks
- **Skill anatomy standard** — All workflow skills follow `0-prime → 1-execute → 2-validate → 3-checkpoint`
- **Release skill** — Version detection, commit categorization, changelog generation, interactive merge, git tagging
- **Task runner** — Shared utility enforces step completion via TodoWrite tracking

### v0.1.12 — Genesis (Mar 2026)

- **Session banner** — `hooks/session-start.sh` prints activation banner with version and random self-deprecating quote
- **Plugin hooks** — `plugin.json` gains hooks configuration with `${CLAUDE_PLUGIN_ROOT}` path variable
