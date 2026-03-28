# Beastmode orchestrator — run workflow phases via claude CLI
# Each recipe launches an interactive claude session in a named worktree.
# No recipe auto-chains to the next phase.

# Design phase: interview and produce a PRD
# Slugifies the topic (lowercase, spaces to hyphens, strip non-alphanumeric)
design topic:
    #!/usr/bin/env bash
    slug=$(echo "{{topic}}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')
    claude --dangerously-skip-permissions -w "$slug" "/beastmode:design {{topic}}"

# Plan phase: decompose a PRD into features
plan slug:
    claude --dangerously-skip-permissions -w {{slug}} "/beastmode:plan {{slug}}"

# Implement phase: execute a single feature from a design
# Takes two args to avoid ambiguous compound-slug splitting
implement design feature:
    claude --dangerously-skip-permissions -w {{design}} "/beastmode:implement {{design}}-{{feature}}"

# Validate phase: run quality gates
validate slug:
    claude --dangerously-skip-permissions -w {{slug}} "/beastmode:validate {{slug}}"

# Release phase: changelog, version, merge
release slug:
    claude --dangerously-skip-permissions -w {{slug}} "/beastmode:release {{slug}}"
