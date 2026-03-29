# Design: /beastmode Skill

> Consolidate bootstrap skills into single `/beastmode` with atomic subcommands.

## Goal

Replace three separate skills (`/bootstrap`, `/bootstrap-discovery`, `/bootstrap-wizard`) with one unified `/beastmode` skill that has clear, atomic subcommands.

## Approach

- **Not a phase** — No rigid 0-prime → 1-execute → 2-validate → 3-checkpoint structure
- **Subcommand router** — SKILL.md parses args, dispatches to subcommand handler
- **templates → assets** — Clean `.beastmode/` skeleton with generic placeholders
- **Atomic operations** — Each subcommand does one thing

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Skill vs Command | Skill | Consistent with existing system |
| Wizard integration | Fold into `--greenfield` | Greenfield has nothing to scan, so ask human |
| Skeleton structure | Current `.beastmode/` layout | Proven, matches architecture.md |
| Old skills | Delete entirely | Clean break, no deprecation cruft |
| Install vs Init | Separate atomic ops | `install` copies skeleton, `init` populates |
| Update command | Skip for now | Adds complexity, can add later |

## Subcommands

| Subcommand | Prereq | Action |
|------------|--------|--------|
| `/beastmode install` | None | Copy `assets/.beastmode/` to project root |
| `/beastmode init --greenfield` | `.beastmode/` exists | Interactive wizard fills context files |
| `/beastmode init --brownfield` | `.beastmode/` exists | 5 parallel discovery agents fill context files |

### Error Handling

- `init` without `.beastmode/` → "Run `/beastmode install` first"
- `install` with `.beastmode/` existing → "Already installed"

## Component Breakdown

```
skills/beastmode/
├── SKILL.md                        # Subcommand router
├── assets/
│   └── .beastmode/                 # Generic skeleton
│       ├── PRODUCT.md
│       ├── context/
│       │   ├── DESIGN.md
│       │   ├── design/{architecture,tech-stack}.md
│       │   ├── PLAN.md
│       │   ├── plan/{conventions,structure}.md
│       │   ├── IMPLEMENT.md
│       │   ├── implement/{agents,testing}.md
│       │   ├── VALIDATE.md
│       │   └── RELEASE.md
│       ├── meta/{DESIGN,PLAN,IMPLEMENT,VALIDATE,RELEASE}.md
│       └── state/{DESIGN,PLAN,IMPLEMENT,VALIDATE,RELEASE}.md
├── subcommands/
│   ├── install.md
│   └── init.md
└── references/
    ├── discovery-agents/
    │   ├── architecture-agent.md
    │   ├── conventions-agent.md
    │   ├── stack-agent.md
    │   ├── structure-agent.md
    │   └── testing-agent.md
    └── wizard/
        └── question-bank.md
```

## Files Affected

### Create
- `skills/beastmode/SKILL.md`
- `skills/beastmode/subcommands/install.md`
- `skills/beastmode/subcommands/init.md`
- `skills/beastmode/assets/.beastmode/` (entire sanitized skeleton)
- `skills/beastmode/references/discovery-agents/*.md` (move from bootstrap-discovery)
- `skills/beastmode/references/wizard/question-bank.md` (move from bootstrap-wizard)

### Delete
- `skills/bootstrap/` (entire directory)
- `skills/bootstrap-discovery/` (entire directory)
- `skills/bootstrap-wizard/` (entire directory)

### Update
- `VISION.md` — Change Context Structure section to match `.beastmode/` layout
- `README.md` — Update skill list and installation instructions

## Testing Strategy

1. Run `/beastmode install` on empty directory → verify skeleton copied
2. Run `/beastmode init --greenfield` → verify wizard prompts appear
3. Run `/beastmode init --brownfield` on existing codebase → verify agents spawn and populate
4. Verify old `/bootstrap*` commands no longer exist
