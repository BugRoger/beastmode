---
description: Prime agent with codebase understanding
---

# Prime: Load Project Context

## Objective

Build comprehensive understanding of the codebase by analyzing structure, documentation, and key files.

## Process

### 1. Analyze Project Structure

List all tracked files:
```bash
git ls-files
```

Show directory structure:
```bash
tree -L 3 -I 'node_modules|__pycache__|.git|dist|build'
```

**Note:** If tree command fails or is unavailable, skip silently and continue without tree output.

### 2. Read Core Documentation

Read the following files if they exist. If a file is missing, note it in the report and try alternatives:

**Primary targets:**
- PRD.md or similar spec file
- CLAUDE.md or similar global rules file
- README files at project root and major directories
- Any architecture documentation
- Drizzle config (for database schema understanding)

**Fallback alternatives when files don't exist:**
- No package.json → try pyproject.toml, requirements.txt, Cargo.toml, go.mod
- No PRD.md → try SPEC.md, docs/requirements.md, docs/prd.md
- No architecture docs → try docs/architecture.md, ARCHITECTURE.md, docs/design.md

**Tools to use:**
- Use Read tool for reading known files
- Use Glob tool for finding alternatives (e.g., `**/README*.md`, `**/*config*`)
- Use Grep tool for searching specific patterns

### 3. Identify Key Files

Based on the project structure, identify and read key files in these categories. Use your judgment to determine which files are most important:

**Target categories:**
- Main entry points (main.py, index.ts, app.py, server.js, etc.)
- Core configuration files (pyproject.toml, package.json, tsconfig.json, Cargo.toml)
- Key model/schema definitions
- Important service or controller files

**Approach:**
- Don't hardcode specific filenames
- Look for common patterns but adapt to what you find
- Use Glob to find candidates: `**/*.config.{js,ts}`, `**/main.*`, `**/models/**`, `**/schema/**`
- Prioritize files that appear to be central to the application

### 4. Understand Current State

Check recent activity and current branch:

```bash
git log -10 --oneline
```

```bash
git status
```

**Error handling:**
- If not a git repository, skip git commands and note in report
- If git commands fail, skip that step and continue

## Output Report

Provide a concise summary covering:

### Project Overview
- Purpose and type of application
- Primary technologies and frameworks
- Current version/state

### Architecture
- Overall structure and organization
- Key architectural patterns identified
- Important directories and their purposes

### Tech Stack
- Languages and versions
- Frameworks and major libraries
- Build tools and package managers
- Testing frameworks

### Core Principles
- Code style and conventions observed
- Documentation standards
- Testing approach

### Current State
- Active branch
- Recent changes or development focus
- Any immediate observations or concerns

**Formatting requirements:**
- Make this summary easy to scan
- Use bullet points and clear headers
- Note any missing files explicitly
- Keep it concise but comprehensive
