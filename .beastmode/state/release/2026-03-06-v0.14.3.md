# Release v0.14.3

**Date:** 2026-03-06

## Highlights

Enforces write protection on the knowledge hierarchy — phases write only to L3 state, retro handles all upward promotion.

## Features

- Write protection rule added to BEASTMODE.md (L0) under Knowledge Hierarchy
- Release L0 write migrated from direct BEASTMODE.md edit to L3 proposal + retro promotion
- Retro gains L0 promotion step (release phase only) with existing `release.beastmode-md-approval` gate

## Full Changelog

- feat: Add write protection rule to Knowledge Hierarchy in BEASTMODE.md
- feat: Migrate release L0 write to proposal-based flow via retro
- feat: Add L0 promotion step to retro framework
