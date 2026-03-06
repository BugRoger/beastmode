# 1. Prime

## 1. Check for Beastmode Bootstrap

Check if `.agents/prime/` directory exists.

**If missing:**
```
Print: "⚠ No .agents/prime/ found. Run `/bootstrap` to initialize."
```
Stop execution.

**If exists:** Continue.

## 2. Load Beastmode Core Context

Read all prime files (abort if any fail):
- `.agents/CLAUDE.md`
- `.agents/prime/META.md`
- `.agents/prime/AGENTS.md`
- `.agents/prime/STACK.md`
- `.agents/prime/STRUCTURE.md`
- `.agents/prime/CONVENTIONS.md`
- `.agents/prime/ARCHITECTURE.md`
- `.agents/prime/TESTING.md`

**If prime files exist but contain only placeholders:**
```
Print: "⚠ Prime files need content. Run `/bootstrap-discovery` to populate."
```
Continue (still load context).

## 3. Load Situational Context

Read if they exist (skip silently if missing):
- `.agents/status/STATUS.md` — Current state
- Most recent `.agents/design/*.md` — Active design
- Most recent `.agents/plan/*.md` — Active plan

## 4. Light Git Exploration

Run (skip silently if git unavailable):

```bash
git log -5 --oneline
```

```bash
git status
```

## 5. Output Confirmation

Print only:
```
✓ Primed
```
