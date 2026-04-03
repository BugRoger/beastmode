# Research: Structured Logging TUI Formats

Date: 2026-04-03

## Popular TUI Log Format Patterns

### pino-pretty (Node.js — most popular structured log formatter)
```
[14:30:25.123] INFO (1234/hostname): hello world
    key: "value"
```
- Timestamp: `HH:MM:ss.l` in brackets, dim/gray
- Level: color-coded (INFO=green, WARN=yellow, ERROR=red), uppercase
- PID/hostname in parentheses
- Message followed by indented key-value pairs

### stern (Kubernetes log tailing)
```
[pod/nginx-1] 2026-04-03T08:00:00 INFO controller Starting sync
```
- Source prefix in brackets, color-coded per pod
- Timestamp + level + component + message inline

### logfmt CLI (structured key=value logs)
```
2024-09-20T08:21:54  INFO  [api.server]  User logged in  user=JohnDoe
```
- Fixed-width columns: timestamp | level | source | message | extra kv-pairs
- Level color-coded, source in brackets (cyan), extras in yellow

### Go slog pretty handler
```
14:30:25.123 INFO [api/server.go:45] User logged in {"user":"JohnDoe"}
```
- Compact timestamp, colored level, dim source, message, JSON block

### rich (Python) — table mode
```
╭────────────┬──────┬──────────────┬──────────────╮
│ 2026-04-03 │ INFO │ rich.app     │ App started  │
╰────────────┴──────┴──────────────┴──────────────╯
```

## Common Design Patterns

1. **Fixed-width columns** — prevents visual shifting as content changes
2. **Color hierarchy** — dim for metadata (timestamp, source), bold for level, normal for message
3. **Level coloring** — universal: green=info, yellow=warn, red=error, blue/cyan=debug
4. **Brackets for context** — `[source]` or `(metadata)` to visually separate structural fields
5. **Dim separators** — dots, pipes, or arrows between fields
6. **Indented continuation** — extra kv-pairs or JSON on next line, indented

## Recommended Format for Beastmode

Inspired by pino-pretty + stern + logfmt:
```
14:30:25 design  [my-epic]          Starting phase
14:30:25 plan    [my-epic]          Dispatching features
14:30:25 impl    [my-epic/feat-1]   Worker started
14:30:26 watch   [my-epic]          Session completed ($0.42, 35s)
```

Fields:
- **Timestamp**: `HH:MM:SS` (compact, dim)
- **Phase**: 7-char fixed-width, color-coded per phase
- **Scope**: `[epic]` or `[epic/feature]` in brackets, cyan
- **Message**: remainder

Color scheme:
- Timestamp: dim/gray
- Phase: design=magenta, plan=blue, implement=cyan, validate=yellow, release=green
- Scope brackets: dim, slug=cyan
- Message: white/default
- Warn: yellow message
- Error: red message

## CLI Tool Output Patterns (Pipeline Orchestrators)

### Turborepo
```
● web    build
  > next build
  [22:15:30] Building...
  [22:15:32] Compiled successfully.

● ui     build  # cached
```
- Bullet prefix: ● running, ○ queued/cached
- `[pkg] [task]` as fixed-width columns
- Indented task output underneath
- `# cached` suffix for cache hits

### Nx
```
> apps/web@0.0.0 build
> next build
✔ apps/web (1m 2s)
  ├─ nx/data 10/10 (1m 2s)
  └─ apps/docs (1s)
```
- `> project@version task` prefix
- Checkmark + duration on completion
- Tree notation for dependencies

## Logger API Best Practices (Research Summary)

### Child Logger vs Flat Fields
- **Child logger (pino .child())**: Best for deep, long-lived scopes. Creates new instance per scope. Context auto-included on every line. Overkill for simple CLIs.
- **Flat structured fields**: Best for shallow scopes, ad-hoc context. Lower overhead. Risk of omission.
- **Consensus for CLI tools**: Child pattern wins when hierarchy maps to workflow (component > epic > feature). Our case exactly.

### Recommendation for Beastmode
- Child logger pattern matches our hierarchy: base → component → epic → feature
- But we don't need pino/winston — our logger is 60 lines. Keep it lightweight.
- Implement child pattern as a simple context-merging wrapper, not a full library dependency.
- Format line from merged context fields, not from a slug string.
