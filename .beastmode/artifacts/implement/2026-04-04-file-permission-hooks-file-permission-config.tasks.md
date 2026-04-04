# File Permission Config — Implementation Tasks

## Goal

Add a `file-permissions:` config section to `config.yaml`, parsed by the CLI's config module and exposed as a typed interface on `BeastmodeConfig`. Includes a `FilePermissionsConfig` type with `timeout` and category-keyed prose fields, a `getCategoryProse()` getter, and init seed template updates.

## Architecture

- **Config types** in `cli/src/config.ts` — extends existing `BeastmodeConfig` interface
- **Config parsing** in `cli/src/config.ts` `loadConfig()` — same pattern as `hitl:` section parsing
- **Getter function** in `cli/src/config.ts` — `getCategoryProse()` analogous to `getPhaseHitlProse()` in hitl-settings.ts
- **Init template** in `skills/beastmode/assets/.beastmode/config.yaml` — seed with default category
- **Tests** in `cli/src/__tests__/config.test.ts` — extend existing test file

## Tech Stack

- TypeScript (Bun runtime)
- bun:test for testing
- Custom YAML parser (no external deps)

## File Structure

- **Modify:** `cli/src/config.ts` — Add `FilePermissionsConfig` interface, extend `BeastmodeConfig`, update `DEFAULT_CONFIG`, update `loadConfig()`
- **Modify:** `cli/src/__tests__/config.test.ts` — Add tests for file-permissions parsing, defaults, getCategoryProse
- **Modify:** `skills/beastmode/assets/.beastmode/config.yaml` — Add `file-permissions:` section

---

### Task 1: Add FilePermissionsConfig type and extend BeastmodeConfig

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/config.ts:16-44`
- Test: `cli/src/__tests__/config.test.ts`

- [x] **Step 1: Write the failing test**

Add to `cli/src/__tests__/config.test.ts` — import `FilePermissionsConfig` and test type existence:

```typescript
import { loadConfig, DEFAULT_HITL_PROSE } from "../config";
import type { HitlConfig, FilePermissionsConfig } from "../config";
```

Add a new describe block after the existing one:

```typescript
describe("FilePermissionsConfig", () => {
  test("type is usable as annotation", () => {
    const stub: FilePermissionsConfig = {
      timeout: 30,
      "claude-settings": "always defer to human",
    };
    expect(stub.timeout).toBe(30);
    expect(stub["claude-settings"]).toBe("always defer to human");
  });

  test("default config includes file-permissions with defaults", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    const config = loadConfig(tempDir);
    expect(config["file-permissions"]).toBeDefined();
    expect(config["file-permissions"].timeout).toBe(30);
    expect(config["file-permissions"]["claude-settings"]).toBe("always defer to human");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/config.test.ts`
Expected: FAIL — `FilePermissionsConfig` not exported, `config["file-permissions"]` not defined

- [x] **Step 3: Implement FilePermissionsConfig type and defaults**

In `cli/src/config.ts`, add after line 23 (after `HitlConfig` closing brace):

```typescript
export interface FilePermissionsConfig {
  timeout: number;
  "claude-settings"?: string;
}
```

Update `BeastmodeConfig` to include:

```typescript
export interface BeastmodeConfig {
  github: GitHubConfig;
  cli: CliConfig;
  hitl: HitlConfig;
  "file-permissions": FilePermissionsConfig;
}
```

Update `DEFAULT_CONFIG` to include:

```typescript
const DEFAULT_CONFIG: BeastmodeConfig = {
  github: { enabled: false },
  cli: { interval: 60, "dispatch-strategy": "sdk" },
  hitl: {
    design: DEFAULT_HITL_PROSE,
    plan: DEFAULT_HITL_PROSE,
    implement: DEFAULT_HITL_PROSE,
    validate: DEFAULT_HITL_PROSE,
    release: DEFAULT_HITL_PROSE,
    timeout: 30,
  },
  "file-permissions": {
    timeout: 30,
    "claude-settings": DEFAULT_HITL_PROSE,
  },
};
```

Update `loadConfig()` — add after the `hitl` parsing block (after line 124):

```typescript
  const rawFilePerms = (raw["file-permissions"] ?? {}) as Record<string, unknown>;
  const filePermissions: FilePermissionsConfig = {
    timeout: (rawFilePerms.timeout as number) ?? DEFAULT_CONFIG["file-permissions"].timeout,
    "claude-settings": (rawFilePerms["claude-settings"] as string) ?? DEFAULT_CONFIG["file-permissions"]["claude-settings"],
  };
```

Update the return statement to include `"file-permissions": filePermissions`:

```typescript
  return { github, cli, hitl, "file-permissions": filePermissions };
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/config.test.ts`
Expected: PASS — all tests including new ones

- [x] **Step 5: Commit**

```bash
git add cli/src/config.ts cli/src/__tests__/config.test.ts
git commit -m "feat(file-permission-config): add FilePermissionsConfig type and extend BeastmodeConfig"
```

---

### Task 2: Add config parsing tests for file-permissions section

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/config.test.ts`

- [x] **Step 1: Write parsing tests**

Add to the `FilePermissionsConfig` describe block in `cli/src/__tests__/config.test.ts`:

```typescript
  test("parses file-permissions section from config.yaml", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `file-permissions:
  timeout: 60
  claude-settings: "auto-allow all .claude file writes"
`,
    );

    const config = loadConfig(tempDir);
    expect(config["file-permissions"].timeout).toBe(60);
    expect(config["file-permissions"]["claude-settings"]).toBe("auto-allow all .claude file writes");
  });

  test("partial file-permissions fills defaults for missing fields", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `file-permissions:
  claude-settings: "deny all"
`,
    );

    const config = loadConfig(tempDir);
    expect(config["file-permissions"].timeout).toBe(30);
    expect(config["file-permissions"]["claude-settings"]).toBe("deny all");
  });

  test("missing file-permissions section returns defaults", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
    mkdirSync(join(tempDir, ".beastmode"), { recursive: true });
    writeFileSync(
      join(tempDir, ".beastmode", "config.yaml"),
      `github:
  enabled: true
`,
    );

    const config = loadConfig(tempDir);
    expect(config["file-permissions"].timeout).toBe(30);
    expect(config["file-permissions"]["claude-settings"]).toBe("always defer to human");
  });
```

- [x] **Step 2: Run tests to verify they pass**

Run: `cd cli && bun test src/__tests__/config.test.ts`
Expected: PASS — all parsing tests pass (implementation from Task 1 supports this)

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/config.test.ts
git commit -m "test(file-permission-config): add config parsing tests for file-permissions section"
```

---

### Task 3: Add getCategoryProse getter function

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/config.ts`
- Test: `cli/src/__tests__/config.test.ts`

- [x] **Step 1: Write the failing test**

Add a new describe block to `cli/src/__tests__/config.test.ts`:

```typescript
import { loadConfig, DEFAULT_HITL_PROSE, getCategoryProse } from "../config";
```

```typescript
describe("getCategoryProse", () => {
  test("returns configured prose for known category", () => {
    const config: FilePermissionsConfig = {
      timeout: 30,
      "claude-settings": "auto-allow all .claude file writes",
    };
    expect(getCategoryProse(config, "claude-settings")).toBe("auto-allow all .claude file writes");
  });

  test("returns default prose for undefined category", () => {
    const config: FilePermissionsConfig = {
      timeout: 30,
    };
    expect(getCategoryProse(config, "claude-settings")).toBe("always defer to human");
  });

  test("returns default prose for empty string category value", () => {
    const config: FilePermissionsConfig = {
      timeout: 30,
      "claude-settings": "",
    };
    expect(getCategoryProse(config, "claude-settings")).toBe("always defer to human");
  });

  test("returns default prose for unknown category", () => {
    const config: FilePermissionsConfig = {
      timeout: 30,
      "claude-settings": "some prose",
    };
    expect(getCategoryProse(config, "nonexistent")).toBe("always defer to human");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/config.test.ts`
Expected: FAIL — `getCategoryProse` not exported from config.ts

- [x] **Step 3: Implement getCategoryProse**

Add to `cli/src/config.ts` after the `loadConfig` function:

```typescript
/**
 * Extract the file-permissions prose for a given category.
 * Falls back to "always defer to human" if no prose is configured.
 */
export function getCategoryProse(
  filePermissionsConfig: FilePermissionsConfig,
  category: string,
): string {
  const prose = filePermissionsConfig[category as keyof Omit<FilePermissionsConfig, "timeout">];
  return (typeof prose === "string" && prose.length > 0) ? prose : DEFAULT_HITL_PROSE;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/config.test.ts`
Expected: PASS — all getCategoryProse tests pass

- [x] **Step 5: Commit**

```bash
git add cli/src/config.ts cli/src/__tests__/config.test.ts
git commit -m "feat(file-permission-config): add getCategoryProse getter function"
```

---

### Task 4: Update init asset config template

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `skills/beastmode/assets/.beastmode/config.yaml`

- [x] **Step 1: Update the init template**

Modify `skills/beastmode/assets/.beastmode/config.yaml` to add a `file-permissions:` section after the `hitl:` section:

```yaml
# .beastmode/config.yaml

github:
  project-name: "Beastmode Pipeline"  # Projects V2 board name

hitl:
  model: haiku
  timeout: 30
  design: "always defer to human"
  plan: "always defer to human"
  implement: "always defer to human"
  validate: "always defer to human"
  release: "always defer to human"

file-permissions:
  claude-settings: "always defer to human"
```

- [x] **Step 2: Verify the YAML is well-formed**

Run: `cat skills/beastmode/assets/.beastmode/config.yaml`
Expected: Valid YAML with `file-permissions:` section containing `claude-settings` key

- [x] **Step 3: Commit**

```bash
git add skills/beastmode/assets/.beastmode/config.yaml
git commit -m "feat(file-permission-config): seed file-permissions section in init template"
```

---

### Task 5: Run full test suite and verify

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3, Task 4

**Files:**
- Read: `cli/src/config.ts`
- Read: `cli/src/__tests__/config.test.ts`
- Read: `skills/beastmode/assets/.beastmode/config.yaml`

- [x] **Step 1: Run full config test suite**

Run: `cd cli && bun test src/__tests__/config.test.ts`
Expected: PASS — all tests pass

- [x] **Step 2: Run full project test suite**

Run: `cd cli && bun test`
Expected: PASS — no regressions in other tests

- [x] **Step 3: Verify type exports are consumable**

Run: `cd cli && bun run -e "import { getCategoryProse } from './src/config'; import type { FilePermissionsConfig } from './src/config'; console.log('OK')"`
Expected: Prints "OK" — exports are accessible
