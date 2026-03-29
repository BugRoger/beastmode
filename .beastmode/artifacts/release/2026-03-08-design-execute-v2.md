# Release: design-execute-v2

**Version:** v0.14.28
**Date:** 2026-03-08

## Highlights

Redesigns the design execute phase from 8 steps to 5, replacing batch-question mechanics with a conversational one-question-at-a-time flow inspired by superpowers brainstorming principles.

## Features

- Conversational intent understanding with on-demand codebase reading (replaces separate scout step)
- Gray area loop with batches of 3 + "You decide" explicit delegation on every question
- Dedicated approach-selection gate separating approach choice from design discussion
- Scope guardrail with deferred ideas tracking

## Docs

- Updated gate diagram and examples in configurable-gates.md
- Updated README.md gate example

## Full Changelog

- Rewrote `skills/design/phases/1-execute.md` (8 steps to 5)
- Renamed config gates: `gray-area-selection` + `gray-area-discussion` -> `intent-discussion` + `approach-selection`
- Updated `docs/configurable-gates.md` ASCII diagram, descriptions, and YAML examples
- Updated `README.md` gate example
