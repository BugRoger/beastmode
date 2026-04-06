# README Accuracy Fixes — Implementation Tasks

## Goal

Fix two inaccuracies in README.md:
1. Replace fictional `gates:` config example with real `hitl:` structure
2. Correct domain list from "Meta" to "Research"

## Architecture / Constraints

- Single file: `README.md`
- README must stay under 150 lines (currently 144)
- No other README sections modified
- Real config uses `hitl:` with phase-level prose strings in `.beastmode/config.yaml`
- Actual `.beastmode/` directories: `artifacts/`, `context/`, `research/` (no `meta/`)

## File Structure

- **Modify:** `README.md` — config example block (lines 88-99), domain list (lines 54-56)

---

### Task 0: Integration Test — README Content Accuracy

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `tests/readme-accuracy.integration.test.ts`

- [x] **Step 1: Write the integration test**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("@readme-refresh README content accuracy", () => {
  const readme = readFileSync(join(__dirname, "..", "README.md"), "utf-8");
  const lines = readme.split("\n");

  describe("Config example uses real HITL gate names", () => {
    it("shows an hitl section with phase-level prose fields", () => {
      expect(readme).toContain("hitl:");
      // Should show at least one phase with a prose string
      expect(readme).toMatch(/hitl:[\s\S]*?(design|plan|implement|validate|release):\s*"/);
    });

    it("does not contain a gates subsection with named gate IDs", () => {
      expect(readme).not.toContain("gates:");
      expect(readme).not.toContain("existing-design-choice");
      expect(readme).not.toContain("decision-tree");
      expect(readme).not.toContain("prd-approval");
      expect(readme).not.toContain("architectural-deviation");
      expect(readme).not.toContain("blocked-task-decision");
      expect(readme).not.toContain("validation-failure");
    });
  });

  describe("Domain description matches actual directory structure", () => {
    // Find the domain list section (between "Three domains" and the next ##)
    const domainSection = readme.match(
      /Three domains[\s\S]*?(?=\n##|\n$)/
    )?.[0] ?? "";

    it("includes research as the directory name", () => {
      expect(domainSection).toMatch(/\*\*Research\*\*/);
    });

    it("does not reference Meta as a domain directory", () => {
      expect(domainSection).not.toMatch(/\*\*Meta\*\*/);
    });
  });

  describe("README is consistent with current codebase", () => {
    it("documented config keys correspond to real config keys", () => {
      // The config example should use hitl, not gates
      const configBlock = readme.match(/```yaml[\s\S]*?```/)?.[0] ?? "";
      expect(configBlock).toContain("hitl:");
      expect(configBlock).not.toContain("gates:");
    });

    it("documented directory names correspond to actual directories", () => {
      // The domain list should mention Artifacts, Context, Research
      expect(readme).toMatch(/\*\*Artifacts\*\*/);
      expect(readme).toMatch(/\*\*Context\*\*/);
      expect(readme).toMatch(/\*\*Research\*\*/);
      expect(readme).not.toMatch(/\*\*Meta\*\*/);
    });
  });

  describe("README line count", () => {
    it("stays under 150 lines", () => {
      expect(lines.length).toBeLessThanOrEqual(150);
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails (RED)**

Run: `npx vitest run tests/readme-accuracy.integration.test.ts`
Expected: FAIL — README currently has `gates:` and `Meta` instead of `hitl:` and `Research`

- [x] **Step 3: Commit**

```bash
git add tests/readme-accuracy.integration.test.ts
git commit -m "test(readme-refresh): add integration test for README accuracy"
```

---

### Task 1: Replace Config Example with Real HITL Structure

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:86-103`

- [x] **Step 1: Replace the config example block**

Replace lines 86-103 of README.md. The current text:

```
Beastmode places human-in-the-loop gates at every decision point: design approval, plan review, version confirmation, merge strategy. Gates default to human. As trust builds, flip individual gates to `auto` in `.beastmode/config.yaml`:

\`\`\`yaml
# .beastmode/config.yaml
gates:
  design:
    existing-design-choice: human     # start supervised
    decision-tree: human
    prd-approval: human
  implement:
    architectural-deviation: auto     # claude handles deviations
    blocked-task-decision: auto
    validation-failure: auto
\`\`\`
```

Replace with:

```
Beastmode places human-in-the-loop gates at every phase: design approval, plan review, implementation decisions, validation, release. Gates default to human. As trust builds, flip individual phases to autonomous in `.beastmode/config.yaml`:

\`\`\`yaml
# .beastmode/config.yaml
hitl:
  design: "always defer to human"                            # start supervised
  plan: "auto-answer all questions, never defer to human"    # trust the process
  implement: "auto-answer all questions, never defer to human"
  validate: "auto-answer all questions, never defer to human"
  release: "always defer to human"                           # human approves releases
\`\`\`
```

- [x] **Step 2: Verify the change**

Run: `grep -n "gates:" README.md`
Expected: No output (no `gates:` in README)

Run: `grep -n "hitl:" README.md`
Expected: One match in the config example block

Run: `wc -l < README.md`
Expected: Under 150 lines

- [x] **Step 3: Commit**

```bash
git add README.md
git commit -m "fix(readme-refresh): replace fictional gates config with real hitl structure"
```

---

### Task 2: Correct Domain List from Meta to Research

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:54-56`

- [x] **Step 1: Replace the domain list**

Replace lines 54-56 of README.md. The current text:

```
- **Artifacts** — skill outputs (design specs, plans, validation records, release notes)
- **Context** — project knowledge (architecture, conventions, product vision)
- **Meta** — process insights (procedures, learnings, project-specific rules)
```

Replace with:

```
- **Artifacts** — skill outputs (design specs, plans, validation records, release notes)
- **Context** — project knowledge (architecture, conventions, product vision)
- **Research** — research artifacts (competitive analyses, technology research, reference material)
```

- [x] **Step 2: Verify the change**

Run: `grep -n "Meta" README.md`
Expected: No output (no "Meta" in domain list)

Run: `grep -n "Research" README.md`
Expected: One match in the domain list

- [x] **Step 3: Commit**

```bash
git add README.md
git commit -m "fix(readme-refresh): correct domain list from Meta to Research"
```
