# cmux-config

**Design:** .beastmode/state/design/2026-03-29-interactive-cmux-workspaces.md
**Architectural Decisions:** see manifest

## User Stories

1. US 7: As an operator, I want to configure cmux behavior in config.yaml so I can disable it, change notification verbosity, or adjust cleanup timing without code changes

## What to Build

Extend the config.yaml parser and type definitions to support a new `cmux:` section alongside the existing `gates:` and `github:` sections.

**Config shape:**
```yaml
cmux:
  enabled: auto          # auto | true | false
  notifications: errors  # errors | phase-complete | full
  cleanup: on-release    # on-release | manual | immediate
```

- `enabled: auto` — use cmux if available (socket exists + ping succeeds), fall back to SDK otherwise
- `enabled: true` — require cmux, fail dispatch if unavailable
- `enabled: false` — never use cmux, always SDK
- `notifications` — controls when `cmux notify` fires
- `cleanup` — controls when workspaces are destroyed

Wire `SessionFactory` to read the `cmux` config and combine it with the `cmuxAvailable()` runtime check to select `SdkSession` or `CmuxSession`:

| enabled | cmux available | Result |
|---------|---------------|--------|
| auto    | yes           | CmuxSession |
| auto    | no            | SdkSession |
| true    | yes           | CmuxSession |
| true    | no            | Error |
| false   | any           | SdkSession |

Tests verify the config parser handles the new section, defaults are applied when missing, and SessionFactory selection logic is correct for all combinations.

## Acceptance Criteria

- [ ] Config types extended with `CmuxConfig` (enabled, notifications, cleanup)
- [ ] Config parser handles `cmux:` section with correct defaults
- [ ] `SessionFactory` wired to config + runtime probe for session selection
- [ ] Selection matrix (enabled x available) produces correct session type
- [ ] `enabled: true` with cmux unavailable produces clear error
- [ ] Missing `cmux:` section defaults to `enabled: auto`
- [ ] Unit tests for config parsing and factory selection logic
