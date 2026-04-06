# Remove Static Hooks — Implementation Tasks

## Goal

Remove the static Stop hook declarations from `hooks/hooks.json` (plugin hooks manifest) and `.claude/settings.json` (project-level Claude settings). Both files must remain valid JSON. Non-beastmode projects with the plugin installed should see no hook execution errors.

## Architecture

- **hooks/hooks.json**: Plugin hooks manifest. Currently declares a Stop hook that runs `generate-output.ts` via shell-expanded `git rev-parse --show-toplevel`. Remove the Stop hook entry; leave an empty hooks object.
- **.claude/settings.json**: Project-level Claude settings. Currently declares the same Stop hook plus `enabledPlugins`. Remove the Stop hook entry; preserve `enabledPlugins` and all other settings.

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `hooks/hooks.json` | Modify | Remove Stop hook, keep valid JSON with empty hooks |
| `.claude/settings.json` | Modify | Remove Stop hook, preserve enabledPlugins |
| `cli/src/__tests__/remove-static-hooks.integration.test.ts` | Create | Integration test verifying no Stop hook in plugin declarations |

---

### Task 0: Write Integration Test

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/remove-static-hooks.integration.test.ts`

- [x] **Step 1: Write the integration test**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Plugin Stop hook removal for non-beastmode projects", () => {
  const repoRoot = resolve(import.meta.dir, "../../..");

  it("Plugin has no Stop hook declaration", () => {
    const hooksPath = resolve(repoRoot, "hooks/hooks.json");
    const hooks = JSON.parse(readFileSync(hooksPath, "utf-8"));
    expect(hooks.hooks.Stop).toBeUndefined();
  });

  it("Plugin has no static PreToolUse hook declaration for HITL", () => {
    const hooksPath = resolve(repoRoot, "hooks/hooks.json");
    const hooks = JSON.parse(readFileSync(hooksPath, "utf-8"));
    if (hooks.hooks.PreToolUse) {
      const askUserHooks = hooks.hooks.PreToolUse.filter(
        (entry: any) =>
          entry.matcher === "AskUserQuestion" ||
          (entry.hooks &&
            entry.hooks.some((h: any) =>
              h.command?.includes("AskUserQuestion")
            ))
      );
      expect(askUserHooks).toHaveLength(0);
    }
  });

  it("Project settings has no Stop hook declaration", () => {
    const settingsPath = resolve(repoRoot, ".claude/settings.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.hooks?.Stop).toBeUndefined();
  });

  it("hooks/hooks.json is valid JSON", () => {
    const hooksPath = resolve(repoRoot, "hooks/hooks.json");
    expect(() => JSON.parse(readFileSync(hooksPath, "utf-8"))).not.toThrow();
  });

  it(".claude/settings.json is valid JSON", () => {
    const settingsPath = resolve(repoRoot, ".claude/settings.json");
    expect(() =>
      JSON.parse(readFileSync(settingsPath, "utf-8"))
    ).not.toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/remove-static-hooks.integration.test.ts`
Expected: FAIL — Stop hook still exists in both files

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/remove-static-hooks.integration.test.ts
git commit -m "test(remove-static-hooks): add integration test for static hook removal"
```

---

### Task 1: Remove Stop Hook from hooks/hooks.json

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `hooks/hooks.json`

- [x] **Step 1: Replace hooks/hooks.json content**

Replace the entire file with:

```json
{
  "hooks": {}
}
```

- [x] **Step 2: Verify the file is valid JSON**

Run: `cat hooks/hooks.json | python3 -m json.tool`
Expected: valid JSON output with empty hooks object

- [x] **Step 3: Commit**

```bash
git add hooks/hooks.json
git commit -m "fix(remove-static-hooks): remove Stop hook from plugin hooks manifest"
```

---

### Task 2: Remove Stop Hook from .claude/settings.json

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.claude/settings.json`

- [x] **Step 1: Replace .claude/settings.json content**

Replace the entire file with (preserving enabledPlugins):

```json
{
  "enabledPlugins": {}
}
```

- [x] **Step 2: Verify the file is valid JSON**

Run: `cat .claude/settings.json | python3 -m json.tool`
Expected: valid JSON output with enabledPlugins only

- [x] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "fix(remove-static-hooks): remove Stop hook from project settings"
```
