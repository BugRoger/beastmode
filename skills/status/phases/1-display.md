# 1. Display Status

## 1. Parse Arguments

- No args → Show most recent status file
- `list` → List all status files
- `<feature>` → Show specific feature status

## 2. Execute Command

### Default (no args)

```bash
ls -t .agents/status/*.md 2>/dev/null | head -1 | xargs cat
```

### List

```bash
ls -lt .agents/status/*.md 2>/dev/null
```

### Feature

```bash
cat .agents/status/*-<feature>.md 2>/dev/null
```

## 3. Display Output

Show:
- Feature name and date
- Executed phases with timestamps
- Current phase (last in list)
- Links to Claude sessions for each phase
