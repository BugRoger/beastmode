# 1. Create Structure

## 1. Create Directory Tree

```bash
mkdir -p .agents/{prime,research,design,plan,status,release}
```

## 2. Copy Invariant Files

From templates, copy pre-filled files:
- `templates/META.md` → `.agents/prime/META.md`
- `templates/AGENTS.md` → `.agents/prime/AGENTS.md`

## 3. Copy Template Files

From templates, copy section-header files:
- `templates/STACK.md` → `.agents/prime/STACK.md`
- `templates/STRUCTURE.md` → `.agents/prime/STRUCTURE.md`
- `templates/CONVENTIONS.md` → `.agents/prime/CONVENTIONS.md`
- `templates/ARCHITECTURE.md` → `.agents/prime/ARCHITECTURE.md`
- `templates/TESTING.md` → `.agents/prime/TESTING.md`

## 4. Create CLAUDE.md Files

Copy `templates/CLAUDE.md` → `.agents/CLAUDE.md`

Replace `{project-name}` with actual project name from:
- git remote name, or
- parent directory name

## 5. Handle Root CLAUDE.md

- If `./CLAUDE.md` does not exist: create with `@.agents/CLAUDE.md`
- If exists: ask user before replacing
