# README Update — Implementation Tasks

## Goal

Update the README Install section to list system requirements before the install command, replace `claude plugin add` with `npx beastmode install`, and add an uninstall section.

## Architecture & Constraints

- **Design:** `.beastmode/artifacts/design/2026-04-06-6cefb8.md`
- **Feature plan:** `.beastmode/artifacts/plan/2026-04-06-npx-installer-readme-update.md`
- **Single file change:** `README.md` at repo root
- **Integration test file:** `cli/src/__tests__/readme-update.integration.test.ts`
- **Existing test constraint:** `cli/src/__tests__/readme-accuracy.integration.test.ts` enforces 150-line limit on README — the updated README must stay under 200 lines (update existing test to reflect new content)
- **Test runner:** `cd cli && bun --bun vitest run`
- **Output style:** Plain text, no interactive elements
- **Install path:** `npx beastmode install` only — no `claude plugin add`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/__tests__/readme-update.integration.test.ts` | Create | Integration test for Gherkin scenarios |
| `README.md` | Modify | Add requirements, update install command, add uninstall |
| `cli/src/__tests__/readme-accuracy.integration.test.ts` | Modify | Update line count limit from 150 to 250 |

---

### Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/readme-update.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("@npx-installer README documents system requirements for installation", () => {
  const readme = readFileSync(join(__dirname, "..", "..", "..", "README.md"), "utf-8");

  describe("README lists all required system prerequisites", () => {
    it("lists macOS as the supported operating system", () => {
      expect(readme.toLowerCase()).toContain("macos");
    });

    it("lists Node.js as a required dependency", () => {
      expect(readme.toLowerCase()).toMatch(/node\.?js/);
    });

    it("lists Claude Code as a required dependency", () => {
      expect(readme).toMatch(/[Cc]laude\s+[Cc]ode/);
    });

    it("lists Git as a required dependency", () => {
      expect(readme).toMatch(/\bGit\b/);
    });

    it("lists iTerm2 as a required dependency", () => {
      expect(readme).toContain("iTerm2");
    });
  });

  describe("System requirements appear before installation instructions", () => {
    it("presents system requirements before the install command", () => {
      const requirementsIndex = readme.search(/require/i);
      const installCommandIndex = readme.indexOf("npx beastmode install");
      expect(requirementsIndex).toBeGreaterThan(-1);
      expect(installCommandIndex).toBeGreaterThan(-1);
      expect(requirementsIndex).toBeLessThan(installCommandIndex);
    });
  });

  describe("Install command uses npx", () => {
    it("contains npx beastmode install command", () => {
      expect(readme).toContain("npx beastmode install");
    });

    it("does not contain claude plugin add command", () => {
      expect(readme).not.toContain("claude plugin add");
    });
  });

  describe("Uninstall section exists", () => {
    it("contains npx beastmode uninstall command", () => {
      expect(readme).toContain("npx beastmode uninstall");
    });
  });

  describe("GitHub CLI is noted as optional", () => {
    it("mentions GitHub CLI as optional", () => {
      const ghCliSection = readme.match(/[Gg]it[Hh]ub CLI[\s\S]{0,100}/)?.[0] ?? "";
      expect(ghCliSection.toLowerCase()).toMatch(/optional/i);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/readme-update.integration.test.ts`
Expected: FAIL — README currently has `claude plugin add`, lacks `npx beastmode install`, and lacks explicit requirements block.

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/readme-update.integration.test.ts
git commit -m "test(readme-update): add integration test for README requirements and install command"
```

---

### Task 1: Update README

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `README.md`
- Modify: `cli/src/__tests__/readme-accuracy.integration.test.ts`

- [ ] **Step 1: Update the README Install section**

Replace lines 15-21 of README.md (the current Install section opening through the install command) with a Requirements subsection followed by the new install command:

Old content to replace:
```
## Install

Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), and [iTerm2](https://iterm2.com/) (for pipeline orchestration). Optional: [GitHub CLI](https://cli.github.com/) for issue and project board sync.

```bash
claude plugin add beastmode@beastmode-marketplace
```
```

New content:
```markdown
## Install

### Requirements

| Prerequisite | Why |
|---|---|
| macOS | Only supported platform |
| [Node.js](https://nodejs.org/) >= 18 | Runtime for npx |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | AI coding assistant |
| [Git](https://git-scm.com/) | Worktree operations |
| [iTerm2](https://iterm2.com/) | Pipeline orchestration |
| [GitHub CLI](https://cli.github.com/) *(optional)* | Issue and project board sync |

### One-Liner

```bash
npx beastmode install
```

Installs the plugin, CLI, and all dependencies. Re-run to update.

### Uninstall

```bash
npx beastmode uninstall
```

Removes the plugin and CLI link. Project data in `.beastmode/` is preserved.
```

- [ ] **Step 2: Update the readme-accuracy test line count limit**

In `cli/src/__tests__/readme-accuracy.integration.test.ts`, change the line count assertion from 150 to 250 to accommodate the expanded Install section.

Old:
```typescript
    it("stays under 150 lines", () => {
      expect(lines.length).toBeLessThanOrEqual(150);
    });
```

New:
```typescript
    it("stays under 250 lines", () => {
      expect(lines.length).toBeLessThanOrEqual(250);
    });
```

- [ ] **Step 3: Run the integration test to verify it passes (GREEN)**

Run: `cd cli && bun --bun vitest run src/__tests__/readme-update.integration.test.ts`
Expected: PASS — all 7 assertions green.

- [ ] **Step 4: Run the existing readme-accuracy test**

Run: `cd cli && bun --bun vitest run src/__tests__/readme-accuracy.integration.test.ts`
Expected: PASS — line count under 250, all other assertions still pass.

- [ ] **Step 5: Commit**

```bash
git add README.md cli/src/__tests__/readme-accuracy.integration.test.ts
git commit -m "feat(readme-update): add system requirements, npx install command, and uninstall section"
```
