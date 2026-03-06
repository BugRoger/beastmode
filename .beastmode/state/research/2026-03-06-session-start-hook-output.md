# Research: SessionStart Hook Output Display

**Date:** 2026-03-06
**Phase:** design
**Objective:** How does Claude Code display SessionStart hook stdout? Is it visible to the user in the terminal, or only injected as system context for Claude?

## Summary

SessionStart hook stdout is **not displayed to the user** in the terminal or UI. It is captured and injected into Claude's system context as `SessionStart:startup hook success: <output>`. This is by design per the official documentation. The user never sees the ASCII banner printed by `hooks/session-start.sh` -- only Claude sees it. There is an open feature request (GitHub issue #11120) asking for terminal-visible SessionStart output, but it remains unresolved.

## Finding 1: Official Documentation Confirms Context-Only Injection

**Confidence: [HIGH] -- Direct from official docs at code.claude.com/docs/en/hooks**

The official Claude Code hooks reference states explicitly:

> "For most events, stdout is only shown in verbose mode (Ctrl+O). The exceptions are UserPromptSubmit and SessionStart, where stdout is added as context that Claude can see and act on."

Key details from the docs:

- **Exit 0 (success)**: stdout is parsed for JSON or treated as plain text. For SessionStart, this text becomes context for Claude. It is NOT printed to the user's terminal.
- **Exit 2 (blocking error)**: stderr is "shown to user only" -- but SessionStart cannot block (it's a non-blocking event), so exit 2 just shows stderr.
- **Any other exit code**: stderr shown in verbose mode only. Execution continues.

The SessionStart decision control section documents one specific output field:

| Field | Description |
|-------|-------------|
| `additionalContext` | String added to Claude's context. Multiple hooks' values are concatenated |

There is no field for "display to user" or "terminal output." The entire design is oriented around context injection for the AI, not user-visible output.

## Finding 2: Behavior Change History

**Confidence: [MEDIUM] -- Multiple sources agree but exact version unclear**

Multiple sources indicate that SessionStart hooks previously displayed output to users, but this changed:

- Pre-2.1.0: SessionStart hook stdout was visible to the user in the terminal
- Post-2.1.0: Output is suppressed from user view and only injected as Claude context

The rationale cited is "reducing chat clutter during initialization." This aligns with the design philosophy that hooks are for programmatic control, not user-facing output.

## Finding 3: Open Feature Requests

**Confidence: [HIGH] -- Direct GitHub issues confirmed**

Relevant GitHub issues in `anthropics/claude-code`:

| Issue | Topic | Status |
|-------|-------|--------|
| #11120 | Feature request to display SessionStart stdout in terminal | Open |
| #12653 | stderr from SessionStart not visible to user | Open |
| #25543 | Log messages from startup hooks explicitly hidden | Open |
| #9591 | additionalContext from SessionStart no longer shows in chat | Open |
| #15174 | stdout not injected into context post-compaction | Open |
| #25499 | stdout dropped (shows "no content") when source=clear | Open |

Issue #11120 is the most directly relevant -- it's a feature request for exactly what beastmode wants: showing SessionStart hook stdout to the user in the terminal.

## Finding 4: CLI vs VSCode Differences

**Confidence: [MEDIUM] -- Sources agree on shared config, less clarity on display**

- Both CLI and VSCode extension use the same hook configuration from settings files
- Hook execution is identical across both interfaces
- The display difference is minor: CLI has verbose mode (Ctrl+O), VSCode has panel output
- Neither interface shows SessionStart stdout to the user by default
- Notification hooks may not fire reliably in the VSCode extension (GitHub #26925)

## Finding 5: Current Beastmode Architecture Assessment

**Confidence: [HIGH] -- Direct codebase analysis**

Beastmode's current setup in `/Users/D038720/Code/github.com/bugroger/beastmode`:

**Hook configuration** (`.claude/settings.local.json`):
```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "hooks/session-start.sh"
      }]
    }]
  }
}
```

**Hook script** (`hooks/session-start.sh`):
- Outputs a colored ASCII banner with truecolor support
- Picks a random tagline from 38 deadpan one-liners
- Prints banner + tagline to stdout

**CLAUDE.md Prime Directive**:
```
- When you see SessionStart hook output in your system context,
  greet in persona voice with context-awareness (time of day, project state)
```

**Design doc** (`2026-03-05-dynamic-persona-greetings.md`):
- Key decision: "Static hook + Claude-side intelligence is the right split"
- Hook provides raw material (banner, tagline) before Claude loads
- Claude provides interpretation (context-awareness, persona voice) after loading
- Learning: "Don't try to make bash smart"

**What actually happens at session start**:
1. `session-start.sh` runs, outputs colored ASCII banner + tagline to stdout
2. Claude Code captures stdout, does NOT show it to user
3. stdout appears in Claude's system context as `SessionStart:startup hook success: <banner text>`
4. Claude reads the context, sees the banner/tagline, and greets in persona voice
5. The user sees Claude's greeting text but never the actual ASCII banner

The ASCII banner with its truecolor gradients and block characters is completely invisible to the user. The ANSI color escape codes are captured as raw text in the system context. Claude sees something like `\033[1;38;2;100;190;255m` which is meaningless to it.

## Implications for Beastmode

### The Banner Is Wasted Effort
The truecolor Python rendering, the 6 color themes, the rainbow mode -- none of it reaches the user. Claude gets the raw escape codes as text in its context, strips the visual intent entirely.

### What The User Actually Sees
1. Claude Code's own startup UI (version, model info)
2. Claude's first response, which includes a persona-voiced greeting referencing the tagline

### What Claude Actually Receives
The escaped banner text with ANSI codes, plus the tagline. Claude can extract the tagline text but the visual formatting is lost.

## Alternatives for User-Visible Banners

| Approach | Visibility | Feasibility |
|----------|-----------|-------------|
| Shell alias wrapping `claude` command | User sees banner before session | Works but brittle, not portable |
| CLAUDE.md static banner text | Claude sees it, reads it back | No visual formatting, relies on Claude |
| Verbose mode (Ctrl+O) | Shows hook output in sidebar | User must opt-in, not default |
| Wait for GitHub #11120 resolution | Native terminal display | Unknown timeline |
| Remove banner, keep tagline only | Tagline in Claude's greeting | Simplest, matches actual capability |

## Recommendations

1. **Accept the constraint**: SessionStart stdout is context for Claude, not display for the user. This is documented, intentional, and unlikely to change soon.

2. **Simplify the hook**: The truecolor rendering is dead code from the user's perspective. The hook could be reduced to just outputting the tagline (plain text), which is the only part Claude actually uses in its greeting.

3. **Keep the tagline pool**: The 38 deadpan taglines are the part that works. Claude picks up the tagline from context and weaves it into the persona greeting. This mechanism functions correctly.

4. **Consider the `additionalContext` JSON format**: Instead of plain stdout, the hook could return structured JSON with `hookSpecificOutput.additionalContext` for cleaner context injection. But plain text works fine for a single tagline.

5. **Monitor GitHub #11120**: If Anthropic adds terminal-visible SessionStart output, the full banner could be restored. Until then, the visual rendering is wasted computation.

## Sources

- [Official Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- [HIGH] Direct documentation, verified
- [GitHub #11120](https://github.com/anthropics/claude-code/issues/11120) -- [HIGH] Feature request for terminal display
- [GitHub #12653](https://github.com/anthropics/claude-code/issues/12653) -- [HIGH] stderr visibility issue
- [GitHub #25543](https://github.com/anthropics/claude-code/issues/25543) -- [HIGH] Startup hook logs hidden
- [GitHub #9591](https://github.com/anthropics/claude-code/issues/9591) -- [MEDIUM] additionalContext regression
- [Perplexity research on Claude Code 2.1.0 changes](https://help.apiyi.com/en/claude-code-2-1-release-features-en.html) -- [MEDIUM] Behavior change history
- Beastmode design doc `2026-03-05-dynamic-persona-greetings.md` -- [HIGH] Project context
