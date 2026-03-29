# Meta Retro Workers Rework

## Goal

Rebuild the meta retro walker to mirror the context walker's progressive L1/L2/L3 hierarchy, replacing flat files with structured, promotable records that graduate process knowledge through confidence levels.

## Approach

Full mirror of the context walker algorithm — L1 quick-check → L2 deep-check → L3 record management → promotion check — with meta-specific classification into insights (process patterns) and upstream (beastmode feedback). Two L2 domains per phase. Topic-clustered L3 records that accumulate observations. Confidence-gated promotion with fast-track for explicit instructions.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Meta structure | Deepen per-phase (mirror context L1/L2/L3) | Keeps per-phase retro working, avoids session state orchestration problems |
| L2 domains | `insights/` + `upstream/` | Insights = process patterns. Upstream = beastmode feedback. Both can promote to L1 |
| L3 naming | Topic-clustered, no date prefixes | Enables observation accumulation and frequency-based promotion |
| L3 format | Structured (Context/Observation/Rationale/Source/Confidence) | Mirrors context L3 for consistency |
| Walker architecture | Single unified meta walker mirroring context walker | One agent, full responsibility — simpler than extraction + walker split |
| Classification timing | Walker classifies insight vs upstream at L3 creation | Avoids deferred classification complexity |
| Promotion timing | Inline during phase retro | No batch delays — knowledge graduates immediately when evidence is sufficient |
| Promotion paths | Both insights and upstream promote to L1 Procedures | Upstream workarounds are valid operational knowledge |
| Confidence model | Structural (level = baseline) + explicit tags ([LOW]/[MEDIUM]/[HIGH]) | Level gives coarse signal, tags give fine granularity |
| Gate consolidation | 3 gates → 2 gates: `retro.records` + `retro.promotions` | Organized by action type (what user approves) not output category |
| SOPs scope | Phase-scoped only | No cross-phase aggregation — revisit if fragmentation becomes a problem |
| Orchestrator shape | Update existing retro.md | No split — single orchestrator handles both context and meta |

### Claude's Discretion

- L3 record topic naming (kebab-case, descriptive of the cluster)
- Cluster matching heuristics (when to append vs create new)
- L2 summary wording and structure
- L1 recompute paragraph style

## Component Breakdown

### 1. File Structure

```
meta/
  {PHASE}.md                          # L1: phase process summary + Procedures
  {phase}/
    insights.md                       # L2: emerging process patterns summary
    insights/
      {topic-cluster}.md              # L3: structured record (accumulating)
    upstream.md                       # L2: beastmode feedback summary
    upstream/
      {topic-cluster}.md              # L3: structured record (accumulating)
```

### 2. L3 Record Format

```markdown
# {Title}

## Observation 1
### Context
{When/where this was observed}
### Observation
{What was noticed}
### Rationale
{Why this matters}
### Source
{state artifact path}
### Confidence
[LOW|MEDIUM|HIGH] — {basis}
```

Additional observations are appended as `## Observation N` sections within the same file when they match the topic cluster.

### 3. L1 Format

```markdown
# {Phase} Meta

{Summary paragraph reflecting all L2 content}

## Procedures
{Promoted entries from insights and upstream}

1. ALWAYS/NEVER {rule} — {rationale}
2. ...

## Domains
Summary of insights and upstream L2 content with key themes.
```

### 4. Meta Walker Algorithm (agents/retro-meta.md)

1. **Session Extraction** — Read session artifacts, extract process friction, decisions about how work was done, workarounds, effective patterns, beastmode issues
2. **L1 Quick-Check** — Read `meta/{PHASE}.md`, check if Procedures and summaries account for session findings. All pass → early exit
3. **L2 Deep Check** — For flagged L2 files, check accuracy and completeness against session findings. Propose edits
4. **L3 Record Management** — For each new finding: classify (insight/upstream), cluster match (append or create), tag confidence ([LOW]/[MEDIUM]/[HIGH])
5. **Promotion Check** — Scan L3 records for promotion candidates:
   - [HIGH] → immediate L1 Procedure
   - [MEDIUM] + 3 observations → promote to L2 summary + flag for L1
   - [LOW] + 3 observations → promote to [MEDIUM]
   - Explicit user instruction → override frequency rules
6. **Emit Changes** — Return: L2 edits, new L3 records, L3 appends, promotion proposals

### 5. Orchestrator Changes (skills/_shared/retro.md)

Steps 6-10 revised:

- **Step 6**: Spawn Meta Walker (updated prompt, structured output)
- **Step 7**: Present Meta Findings (new format: records count, L2 edits, promotions)
- **Step 8**: [GATE] `retro.records` — approve/reject L3 record creation and appends
- **Step 9**: [GATE] `retro.promotions` — approve/reject promotions to L1/L2
- **Step 10**: Apply Changes and Recompute L1 (write L3s, apply L2 edits, apply promotions, rewrite L1)

### 6. Config Changes (.beastmode/config.yaml)

Replace:
```yaml
retro:
  learnings: human
  sops: human
  overrides: human
```

With:
```yaml
retro:
  context-write: human
  records: human
  promotions: human
```

## Migration Strategy

For each of the 5 phases:

1. **`meta/{phase}/learnings.md`** → Walk each date-headed section, extract individual learnings into L3 records under `meta/{phase}/insights/`. Topic-cluster by content. Tag confidence: multiple sessions = [MEDIUM], single = [LOW]
2. **`meta/{phase}/sops.md`** → Each SOP becomes an L1 Procedure in `meta/{PHASE}.md` + a [HIGH] L3 record in `meta/{phase}/insights/` with "promoted from SOP" annotation
3. **`meta/{phase}/overrides.md`** → Each override becomes an L1 Procedure + L3 record in `upstream/` (if about beastmode behavior) or `insights/` (if project-specific)
4. **`meta/{PHASE}.md`** → Rewrite to new format: summary + Procedures + domain references
5. **Remove old files** — `sops.md`, `overrides.md`, `learnings.md` replaced
6. **Create empty `upstream/`** — directories ready for new observations

## Files Affected

| File | Action | Description |
|------|--------|-------------|
| `agents/retro-meta.md` | Rewrite | New algorithm mirroring context walker |
| `skills/_shared/retro.md` | Edit | Steps 6-10 revised, gate consolidation |
| `.beastmode/config.yaml` | Edit | New gate names: records, promotions |
| `.beastmode/meta/{PHASE}.md` (x5) | Edit | L1 format: add Procedures section |
| `.beastmode/meta/{phase}/insights.md` (x5) | Create | L2 domain file |
| `.beastmode/meta/{phase}/upstream.md` (x5) | Create | L2 domain file |
| `.beastmode/meta/{phase}/insights/` (x5) | Create | L3 record directory |
| `.beastmode/meta/{phase}/upstream/` (x5) | Create | L3 record directory |
| `.beastmode/meta/{phase}/sops.md` (x5) | Remove | Replaced by L1 Procedures |
| `.beastmode/meta/{phase}/overrides.md` (x5) | Remove | Replaced by L1 Procedures |
| `.beastmode/meta/{phase}/learnings.md` (x5) | Migrate | Entries → L3 insight records |

## Acceptance Criteria

- [ ] Meta walker uses L1-first quick-check with early exit
- [ ] L3 records use topic-clustered naming with accumulated observations
- [ ] L3 records follow structured format (Context/Observation/Rationale/Source/Confidence)
- [ ] Classification into insights vs upstream happens at L3 creation
- [ ] Confidence tags: [HIGH] promotes immediately to L1, [MEDIUM] 3+ → L1, [LOW] 3+ → [MEDIUM]
- [ ] Two gates: `retro.records` and `retro.promotions` replace old 3-gate system
- [ ] L1 recompute runs after all changes applied
- [ ] Existing learnings.md entries migrated to topic-clustered L3 insight records
- [ ] Existing SOPs migrated to L1 Procedures + L3 records with provenance
- [ ] Existing overrides classified and migrated to appropriate domain
- [ ] Old flat files (sops.md, overrides.md, learnings.md) removed
- [ ] Upstream entries aggregated in release notes
- [ ] L1 summaries recomputed from migrated content

## Testing Strategy

- **Smoke test**: Run a design phase, verify meta walker produces L3 records in correct format
- **Promotion test**: Add 3 observations to an L3 cluster, verify walker proposes [MEDIUM] upgrade
- **Gate test**: Verify 2 gates fire (records + promotions) with correct content
- **Migration test**: Verify existing learnings.md entries land correctly as L3 insight records
- **L1 recompute test**: Verify L1 summary reflects L2 content after changes applied

## Deferred Ideas

- Cross-phase SOP aggregation (currently phase-scoped; revisit if SOPs fragment badly)
- Upstream auto-reporting to beastmode GitHub issues
- Confidence decay over time (entries that haven't been reinforced lose confidence)
