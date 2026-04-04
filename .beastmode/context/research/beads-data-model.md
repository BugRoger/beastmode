# Beads Data Model — Comprehensive Summary
*Research Date: 2026-04-04*
*Source: gastownhall/beads @ f58bd1d (v0.60.0+)*

## Overview

Beads is a **graph-based issue tracker** backed by **Dolt** (a version-controlled SQL database). The data model centers on a single core entity (`Issue`) that is massively overloaded — the same struct serves as tasks, bugs, epics, agents, messages, molecules, wisps, gates, events, and more. Relationships between issues are modeled as typed directed edges (`Dependency`). The chemistry metaphor (proto/mol/wisp) adds a template-instantiation layer on top.

## Storage Architecture

| Layer | Technology | Path |
|-------|-----------|------|
| Persistent data | Embedded Dolt (SQL) or Dolt server | `.beads/` |
| Ephemeral data | Separate Dolt instance | `.beads-wisp/` (gitignored) |
| Sync | Dolt remotes (DoltHub, S3, GCS, SSH) | Push/pull via `bd dolt push` |
| Version control | Dolt branching + commits (cell-level 3-way merge) | Internal to `.beads/` |

Direct SQL access via `bd sql` or `bd query`. Every CLI command supports `--json` for structured output.

## Core Entity: Issue

The `Issue` struct is the universal data carrier. 40+ fields, used for everything.

### Identity & Content

| Field | Type | Purpose |
|-------|------|---------|
| `ID` | string | Hash-based collision-free ID (e.g., `bd-a3f8`) |
| `ContentHash` | string | Deterministic hash of content fields for dedup |
| `Title` | string | Short summary |
| `Description` | string | Problem statement, context |
| `Design` | string | Implementation approach, architecture decisions |
| `AcceptanceCriteria` | string | Outcome-based success criteria |
| `Notes` | string | Evolving implementation log (COMPLETED/IN PROGRESS/NEXT pattern) |
| `SpecID` | string | Cross-reference to spec/plan document |
| `IDPrefix` | string | Default prefix for IDs (e.g., "bd") |
| `PrefixOverride` | string | Per-issue prefix override |

### Status & Lifecycle

| Field | Type | Values |
|-------|------|--------|
| `Status` | Status | `open`, `in_progress`, `blocked`, `deferred`, `closed`, `pinned`, `hooked` |
| `Priority` | int | 0 (critical) through N (lower priority) |
| `IssueType` | IssueType | `bug`, `feature`, `task`, `epic`, `chore`, `decision`, `message`, `molecule`, `spike`, `story`, `milestone`, `event` |
| `CreatedAt` | time.Time | |
| `UpdatedAt` | time.Time | |
| `ClosedAt` | *time.Time | Nullable |
| `CloseReason` | string | |
| `ClosedBySession` | string | Which session closed it |
| `DueAt` | *time.Time | Deadline |
| `DeferUntil` | *time.Time | Snooze until date |

Custom statuses are also supported (max 50), each mapped to a `StatusCategory`:
- `active` — available work
- `wip` — in-flight
- `done` — completed
- `frozen` — deferred/blocked

### Ownership & Attribution

| Field | Type | Purpose |
|-------|------|---------|
| `Assignee` | string | Current worker |
| `Owner` | string | Accountable party |
| `CreatedBy` | string | Creator |
| `Sender` | string | For message-type issues |
| `Actor` | string | For event-type issues |
| `Target` | string | For event-type issues |

### Molecule / Chemistry Fields

| Field | Type | Purpose |
|-------|------|---------|
| `MolType` | MolType | `swarm`, `patrol`, `work` |
| `WorkType` | WorkType | `mutex` (one worker), `open_competition` |
| `IsTemplate` | bool | Proto (template) flag |
| `SourceFormula` | string | Which proto this was spawned from |
| `SourceLocation` | string | Where the formula lives |
| `BondedFrom` | []BondRef | Bond references (sequential/parallel/conditional/root) |

### Wisp / Ephemeral Fields

| Field | Type | Purpose |
|-------|------|---------|
| `Ephemeral` | bool | Wisp flag (stored in `.beads-wisp/`) |
| `NoHistory` | bool | Skip audit trail |
| `WispType` | WispType | `heartbeat`, `ping`, `patrol`, `gc_report`, `recovery`, `error`, `escalation` |

### Gate / Async Coordination Fields

| Field | Type | Purpose |
|-------|------|---------|
| `AwaitType` | string | Gate condition type (`human`, `gh:run`, `gh:pr`, `timer`, `mail`) |
| `AwaitID` | string | Specific condition ID |
| `Timeout` | time.Duration | Max wait |
| `Waiters` | []string | Who's waiting on this gate |

### Event Fields (when IssueType = "event")

| Field | Type | Purpose |
|-------|------|---------|
| `EventKind` | string | What happened |
| `Actor` | string | Who did it |
| `Target` | string | What it happened to |
| `Payload` | string | Event data |

### External Integration

| Field | Type | Purpose |
|-------|------|---------|
| `ExternalRef` | *string | Link to external system (GitHub issue, Jira, etc.) |
| `SourceSystem` | string | Origin system |
| `SourceRepo` | string | Cross-repo reference |
| `Metadata` | json.RawMessage | Arbitrary JSON blob for extensions |
| `Pinned` | bool | Pinned for session recovery |

### Compaction

| Field | Type | Purpose |
|-------|------|---------|
| `CompactionLevel` | int | How many times compacted |
| `CompactedAt` | *time.Time | When last compacted |
| `CompactedAtCommit` | *string | Dolt commit hash at compaction |
| `OriginalSize` | int | Pre-compaction size |
| `EstimatedMinutes` | *int | Time estimate |

### Embedded Collections

| Field | Type | Purpose |
|-------|------|---------|
| `Labels` | []string | Tag system |
| `Dependencies` | []*Dependency | Outgoing edges |
| `Comments` | []*Comment | Discussion thread |

## Dependency (Edge) Model

Typed directed edges between issues. This is where the "graph" in "graph-based issue tracker" lives.

```go
type Dependency struct {
    IssueID     string         // "from" node
    DependsOnID string         // "to" node
    Type        DependencyType // edge type
    CreatedAt   time.Time
    CreatedBy   string
    Metadata    string         // JSON, type-specific
    ThreadID    string         // for message threading
}
```

### 19 Dependency Types

| Type | Semantics | Affects `bd ready`? |
|------|-----------|---------------------|
| `blocks` | Hard prerequisite — B cannot start until A closes | **Yes** |
| `conditional-blocks` | B runs only if A fails | **Yes** (conditional) |
| `waits-for` | Async wait (gate) | **Yes** |
| `parent-child` | Epic/subtask hierarchy | No (structural) |
| `related` | Soft informational link (symmetric) | No |
| `discovered-from` | Provenance — B found while working A | No |
| `replies-to` | Message threading | No |
| `relates-to` | Alternate spelling of related | No |
| `duplicates` | Issue dedup | No |
| `supersedes` | Issue replacement | No |
| `authored-by` | Content attribution | No |
| `assigned-to` | Work assignment edge | No |
| `approved-by` | Approval tracking | No |
| `attests` | Skill/competency attestation | No |
| `tracks` | Progress tracking | No |
| `until` | Time-bound relationship | No |
| `caused-by` | Root cause link | No |
| `validates` | Test/validation link | No |
| `delegated-from` | Work delegation chain | No |

Key insight: Only 3 types (`blocks`, `conditional-blocks`, `waits-for`) affect the `bd ready` computation. The other 16 provide rich context without constraining execution.

## Supporting Entities

### Comment
```
ID, IssueID, Author, Text, CreatedAt
```

### Event (audit trail)
```
ID, IssueID, EventType, Actor, OldValue, NewValue, Comment, CreatedAt
```

Event types: `created`, `updated`, `status_changed`, `commented`, `closed`, `reopened`, `dependency_added`, `dependency_removed`, `label_added`, `label_removed`, `compacted`

### Label
```
IssueID, Label
```
Labels serve double duty: tagging AND system flags. Special labels:
- `template` — marks an epic as a proto (reusable template)
- `provides:<capability>` — cross-project capability shipping
- `export:<capability>` — marks issue as capability source

### BondRef (molecule bonding)
```
SourceID, BondType, BondPoint
```
Bond types: `sequential`, `parallel`, `conditional`, `root`

## Chemistry Metaphor — Template System

Three "phases of matter" for work:

| Phase | Name | Storage | Git-synced | Use Case |
|-------|------|---------|------------|----------|
| Solid | Proto | `.beads/` | Yes | Reusable template (epic with `template` label) |
| Liquid | Mol | `.beads/` | Yes | Persistent instance (real issues from template) |
| Vapor | Wisp | `.beads-wisp/` | No | Ephemeral instance (operational work, no audit trail) |

### Phase Transitions

```
Proto --[pour/spawn]--> Mol (persistent)
Proto --[wisp create]--> Wisp (ephemeral)
Wisp --[squash]--> Digest (permanent summary, children deleted)
Wisp --[burn]--> Nothing (deleted, no trace)
Ad-hoc epic --[distill]--> Proto (extract reusable template)
```

### Variable Substitution

Protos support `{{variable}}` placeholders, filled at spawn time:
```bash
bd mol spawn mol-release --var version=2.0
```

## Agent Model (v0.40+)

When `IssueType = "agent"`:

### State Machine
```
idle -> spawning -> running/working -> done -> idle
                        |
                     stuck -> (needs intervention)
```
States: `idle`, `spawning`, `running`, `working`, `stuck`, `done`, `stopped`, `dead`

`dead` is set by the Witness monitoring system via heartbeat timeout — agents never set this themselves.

### Slot Architecture

Named references from agent beads to other beads:

| Slot | Cardinality | Purpose |
|------|-------------|---------|
| `hook` | 0..1 | Current work item attached to agent |
| `role` | 1 | Role definition bead (required) |

Enforces one-work-item-at-a-time constraint.

## Async Gates

Gates are wisps that block until a condition is met:

| Gate Type | Await Syntax | Use Case |
|-----------|--------------|----------|
| Human | `human:<prompt>` | Cross-session approval |
| CI | `gh:run:<id>` | GitHub Actions wait |
| PR | `gh:pr:<id>` | PR merge/close wait |
| Timer | `timer:<duration>` | Deployment propagation |
| Mail | `mail:<pattern>` | Email wait |

Gates auto-close via `bd gate eval` (checks external conditions). Human gates require explicit `bd gate approve`.

## Query & Filter System

Two primary filter types for different access patterns:

### IssueFilter (list/search — 40+ filter fields)
Supports: status, priority, type, assignee, labels (AND/OR/pattern/regex), title/description/notes search, date ranges (created/updated/closed/deferred/due), overdue, empty-field checks, parent filtering, mol/wisp type, metadata fields, ephemeral/pinned/template flags.

### WorkFilter (ready-work detection)
Subset focused on finding actionable work: status, type, priority, assignee, labels, sort policy, molecule/wisp scoping, include/exclude toggles.

### Sort Policies
- `hybrid` — priority-weighted with recency
- `priority` — strict priority ordering
- `oldest` — FIFO

## Cross-Project Dependencies

Projects can depend on capabilities shipped by other projects:

```bash
# Project A ships
bd ship auth-api  # Adds provides:auth-api label to closed issue

# Project B depends
bd dep add bd-123 external:project-a:auth-api
```

`bd ready` respects external deps — blocked until the external project ships the capability.

## Key Design Decisions

1. **Single overloaded entity**: Everything is an Issue. This simplifies the storage layer (one table) but makes the struct enormous. The alternative would be separate tables for tasks, agents, gates, messages — but Dolt's cell-level merge makes the single-table approach workable.

2. **Dependency graph as first-class primitive**: Not an afterthought. The graph is the core data structure. `bd ready` is a graph traversal, not a list filter.

3. **Hash-based IDs**: 4-character base36 from UUID, prefixed (e.g., `bd-a3f8`). Eliminates merge collisions when multiple agents create issues on different branches.

4. **Ephemeral vs persistent split**: Wisps in `.beads-wisp/` (gitignored) prevent database bloat from operational work while maintaining structure during execution.

5. **Chemistry metaphor for templates**: Proto/mol/wisp maps to solid/liquid/vapor. Spawn creates instances, distill extracts patterns. Bonds compose molecules. It's a type system for work patterns.

6. **19 dependency types**: Far more than the 4 (blocks/related/parent-child/discovered-from) documented in the skill. The full set includes social edges (authored-by, assigned-to, approved-by, attests) and workflow edges (delegates-from, validates, caused-by, supersedes). This is moving toward a knowledge graph, not just a task tracker.
