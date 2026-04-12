# types-and-session-stop

**Goal:** Rename type interfaces and session-stop functions to use the unified field naming convention (`epic-id`, `epic-slug`, `feature-id`, `feature-slug`, `failed-features`) per the frontmatter contract alignment design.

**Architecture:** Session-stop is a dumb translator — it reads frontmatter and writes output.json. Field names must match the metadata-in convention. Downstream consumers (reconcile) read output.json via dynamic `Record<string, unknown>` access, so field renames in types.ts flow through naturally. The `parseFrontmatter` function returns `Record<string, string>` cast to the interface, so hyphenated keys work with bracket access.

**Tech Stack:** TypeScript, vitest, Bun

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/types.ts` | Phase artifact type definitions — rename fields |
| `src/hooks/session-stop.ts` | Frontmatter interface, buildOutput, scanPlanFeatures — use new field names |
| `src/__tests__/session-stop.test.ts` | Test fixtures — update to use new field names |

---

### Task 1: Rename PhaseOutput type interfaces in types.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `src/types.ts:19-52`
- Test: `src/__tests__/session-stop.test.ts` (verified via compile)

- [ ] **Step 1: Update DesignArtifacts interface**

Replace:
```typescript
export interface DesignArtifacts {
  design: string; // path to PRD
  slug?: string;  // entity identifier from frontmatter (fm.epic ?? fm.id)
  epic?: string;  // human-readable epic name from standardized frontmatter
  summary?: { problem: string; solution: string };
}
```

With:
```typescript
export interface DesignArtifacts {
  design: string; // path to PRD
  "epic-slug"?: string; // skill-proposed epic name from frontmatter
}
```

Remove `slug` (replaced by `epic-slug`), `epic` (redundant), `summary` (content extracted from artifact body by reconcile).

- [ ] **Step 2: Update PlanArtifacts interface**

Replace:
```typescript
export interface PlanArtifacts {
  features: Array<{ slug: string; plan: string; description?: string; wave?: number }>;
}
```

With:
```typescript
export interface PlanArtifacts {
  features: Array<{ "feature-slug": string; plan: string; wave?: number }>;
}
```

Remove `slug` (replaced by `feature-slug`), `description` (content extracted by reconcile from artifact body).

- [ ] **Step 3: Update ImplementArtifacts interface**

Replace:
```typescript
export interface ImplementArtifacts {
  features: Array<{ slug: string; status: "completed" | "blocked" }>;
  deviations?: string; // path to deviations log
}
```

With:
```typescript
export interface ImplementArtifacts {
  features: Array<{ "feature-slug": string; status: "completed" | "blocked" }>;
  deviations?: string; // path to deviations log
}
```

- [ ] **Step 4: Update ValidateArtifacts interface**

Replace:
```typescript
export interface ValidateArtifacts {
  report: string; // path to validation report
  passed: boolean;
  failedFeatures?: string[];
}
```

With:
```typescript
export interface ValidateArtifacts {
  report: string; // path to validation report
  passed: boolean;
  "failed-features"?: string[];
}
```

- [ ] **Step 5: Run typecheck to verify types compile**

Run: `bunx tsc --noEmit 2>&1 | head -50`
Expected: Type errors in session-stop.ts (expected — those files still use old names, fixed in Task 2)

- [ ] **Step 6: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): rename artifact type fields to unified naming convention (#517)"
```

---

### Task 2: Update ArtifactFrontmatter and buildOutput/scanPlanFeatures in session-stop.ts

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `src/hooks/session-stop.ts:23-182`

- [ ] **Step 1: Replace ArtifactFrontmatter interface**

Replace the current interface (lines 23-35):
```typescript
export interface ArtifactFrontmatter {
  phase?: string;
  id?: string;
  epic?: string;
  feature?: string;
  status?: string;
  bump?: string;
  description?: string;
  problem?: string;
  solution?: string;
  wave?: string;
  failedFeatures?: string;
}
```

With (hyphenated keys require bracket access, but parseFrontmatter returns Record<string,string> cast, so this works):
```typescript
export interface ArtifactFrontmatter {
  phase?: string;
  "epic-id"?: string;
  "epic-slug"?: string;
  "feature-id"?: string;
  "feature-slug"?: string;
  status?: string;
  bump?: string;
  wave?: string;
  "failed-features"?: string;
}
```

Removed: `id`, `epic`, `feature`, `description`, `problem`, `solution`, `failedFeatures`.
Added: `epic-id`, `epic-slug`, `feature-id`, `feature-slug`, `failed-features`.

- [ ] **Step 2: Update buildOutput design case**

Replace (lines 77-84):
```typescript
    case "design": {
      const summary = fm.problem && fm.solution
        ? { problem: fm.problem, solution: fm.solution }
        : undefined;
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { design: basename(artifactPath), slug: fm.epic ?? fm.id, epic: fm.epic, summary },
      };
    }
```

With:
```typescript
    case "design": {
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { design: basename(artifactPath), "epic-slug": fm["epic-slug"] },
      };
    }
```

- [ ] **Step 3: Update buildOutput plan case**

Replace (lines 87-94):
```typescript
    case "plan": {
      const epic = fm.epic ?? fm.id;
      const features = scanPlanFeatures(artifactsDir, epic);
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { features },
      };
    }
```

With:
```typescript
    case "plan": {
      const features = scanPlanFeatures(artifactsDir, fm["epic-slug"]);
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: { features },
      };
    }
```

- [ ] **Step 4: Update buildOutput implement case**

Replace (lines 96-105):
```typescript
    case "implement":
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: {
          features: [{
            slug: featureOverride ?? fm.feature ?? "unknown",
            status: (fm.status ?? "completed") as "completed" | "blocked",
          }],
        },
      };
```

With:
```typescript
    case "implement":
      return {
        status: (fm.status as PhaseOutput["status"]) ?? "completed",
        artifacts: {
          features: [{
            "feature-slug": featureOverride ?? fm["feature-slug"] ?? "unknown",
            status: (fm.status ?? "completed") as "completed" | "blocked",
          }],
        },
      };
```

- [ ] **Step 5: Update buildOutput validate case**

Replace (lines 107-119):
```typescript
    case "validate": {
      const passed = fm.status !== "failed";
      const failedFeatures = fm.failedFeatures
        ? fm.failedFeatures.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      return {
        status: passed ? "completed" : "error",
        artifacts: {
          report: basename(artifactPath),
          passed,
          ...(failedFeatures && failedFeatures.length > 0 ? { failedFeatures } : {}),
        },
      };
    }
```

With:
```typescript
    case "validate": {
      const passed = fm.status !== "failed";
      const failedFeatures = fm["failed-features"]
        ? fm["failed-features"].split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      return {
        status: passed ? "completed" : "error",
        artifacts: {
          report: basename(artifactPath),
          passed,
          ...(failedFeatures && failedFeatures.length > 0 ? { "failed-features": failedFeatures } : {}),
        },
      };
    }
```

- [ ] **Step 6: Update scanPlanFeatures function**

Replace the function signature and body (lines 140-182):

Change the return type from `Array<{ slug: string; plan: string; description?: string; wave?: number }>` to `Array<{ "feature-slug": string; plan: string; wave?: number }>`.

In the loop body:
- Change `if (!fm.feature) continue;` to `if (!fm["feature-slug"]) continue;`
- Change `if (fm.epic !== epic) continue;` to `if (fm["epic-slug"] !== epic) continue;`
- Change the entry object to use `"feature-slug": fm["feature-slug"]` instead of `slug: fm.feature`
- Remove `description: fm.description` from the entry

Full replacement:
```typescript
export function scanPlanFeatures(
  artifactsDir: string,
  epic: string | undefined,
): Array<{ "feature-slug": string; plan: string; wave?: number }> {
  if (!epic) return [];

  const planDir = join(artifactsDir, "plan");
  if (!existsSync(planDir)) return [];

  const features: Array<{ "feature-slug": string; plan: string; wave?: number }> = [];

  for (const filename of readdirSync(planDir)) {
    if (!filename.endsWith(".md")) continue;

    const filePath = join(planDir, filename);
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const fm = parseFrontmatter(content);
    if (!fm["feature-slug"]) continue;
    if (fm["epic-slug"] !== epic) continue;

    const entry: { "feature-slug": string; plan: string; wave?: number } = {
      "feature-slug": fm["feature-slug"],
      plan: basename(filePath, ".md") + ".md",
    };
    if (fm.wave !== undefined) {
      const parsed = parseInt(fm.wave, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        entry.wave = parsed;
      }
    }
    features.push(entry);
  }

  return features;
}
```

- [ ] **Step 7: Run typecheck**

Run: `bunx tsc --noEmit 2>&1 | head -50`
Expected: Type errors only in test files and downstream consumers (reconcile, cucumber steps) — those are separate features.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/session-stop.ts
git commit -m "feat(session-stop): use unified field names in frontmatter and buildOutput (#517)"
```

---

### Task 3: Update session-stop unit tests to use new field names

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `src/__tests__/session-stop.test.ts`

- [ ] **Step 1: Update parseFrontmatter tests**

Update the "handles all known fields" test to use new frontmatter field names:

Replace:
```typescript
  test("handles all known fields", () => {
    const fm = parseFrontmatter(
      "---\nphase: implement\nid: s\nepic: e\nfeature: f\nstatus: completed\nbump: minor\n---\n",
    );
    expect(fm.phase).toBe("implement");
    expect(fm.epic).toBe("e");
    expect(fm.feature).toBe("f");
    expect(fm.status).toBe("completed");
    expect(fm.bump).toBe("minor");
  });
```

With:
```typescript
  test("handles all known fields", () => {
    const fm = parseFrontmatter(
      "---\nphase: implement\nepic-id: s\nepic-slug: e\nfeature-slug: f\nstatus: completed\nbump: minor\n---\n",
    );
    expect(fm.phase).toBe("implement");
    expect(fm["epic-slug"]).toBe("e");
    expect(fm["feature-slug"]).toBe("f");
    expect(fm.status).toBe("completed");
    expect(fm.bump).toBe("minor");
  });
```

Add a new test for hyphenated key support:
```typescript
  test("handles hyphenated field names", () => {
    const fm = parseFrontmatter(
      "---\nepic-id: abc\nepic-slug: my-epic\nfeature-slug: auth\nfailed-features: a,b\n---\n",
    );
    expect(fm["epic-id"]).toBe("abc");
    expect(fm["epic-slug"]).toBe("my-epic");
    expect(fm["feature-slug"]).toBe("auth");
    expect(fm["failed-features"]).toBe("a,b");
  });
```

- [ ] **Step 2: Update buildOutput design tests**

Replace design phase test:
```typescript
  test("design phase output", () => {
    const output = buildOutput("path/to/design.md", { phase: "design", id: "abc123", epic: "my-epic" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { design: "design.md", slug: "my-epic", epic: "my-epic", summary: undefined },
    });
  });
```

With:
```typescript
  test("design phase output", () => {
    const output = buildOutput("path/to/design.md", { phase: "design", "epic-slug": "my-epic" } as ArtifactFrontmatter, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { design: "design.md", "epic-slug": "my-epic" },
    });
  });
```

Replace "design phase output without epic field":
```typescript
  test("design phase output without epic-slug field", () => {
    const output = buildOutput("path/to/design.md", { phase: "design" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { design: "design.md", "epic-slug": undefined },
    });
  });
```

- [ ] **Step 3: Update buildOutput implement tests**

Replace:
```typescript
  test("implement phase output", () => {
    const output = buildOutput("impl.md", { phase: "implement", feature: "auth", status: "completed" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { features: [{ slug: "auth", status: "completed" }] },
    });
  });

  test("implement phase defaults to unknown feature", () => {
    const output = buildOutput("impl.md", { phase: "implement" }, ARTIFACTS_DIR);
    expect(output?.artifacts).toEqual({ features: [{ slug: "unknown", status: "completed" }] });
  });
```

With:
```typescript
  test("implement phase output", () => {
    const output = buildOutput("impl.md", { phase: "implement", "feature-slug": "auth", status: "completed" } as ArtifactFrontmatter, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { features: [{ "feature-slug": "auth", status: "completed" }] },
    });
  });

  test("implement phase defaults to unknown feature", () => {
    const output = buildOutput("impl.md", { phase: "implement" }, ARTIFACTS_DIR);
    expect(output?.artifacts).toEqual({ features: [{ "feature-slug": "unknown", status: "completed" }] });
  });
```

- [ ] **Step 4: Update validate failedFeatures tests**

Replace:
```typescript
describe("validate buildOutput with failedFeatures", () => {
  test("includes failedFeatures in artifacts when present", () => {
    const fm = parseFrontmatter(
      "---\nphase: validate\nid: test\nepic: test\nstatus: failed\nfailedFeatures: token-cache,auth-lib\n---\n",
    );
    const output = buildOutput("test.md", fm, "/tmp");
    expect(output).toBeDefined();
    expect(output!.status).toBe("error");
    expect((output!.artifacts as any).failedFeatures).toEqual(["token-cache", "auth-lib"]);
  });

  test("does not include failedFeatures when absent", () => {
    const fm = parseFrontmatter(
      "---\nphase: validate\nid: test\nepic: test\nstatus: passed\n---\n",
    );
    const output = buildOutput("test.md", fm, "/tmp");
    expect(output).toBeDefined();
    expect(output!.status).toBe("completed");
    expect((output!.artifacts as any).failedFeatures).toBeUndefined();
  });
});
```

With:
```typescript
describe("validate buildOutput with failed-features", () => {
  test("includes failed-features in artifacts when present", () => {
    const fm = parseFrontmatter(
      "---\nphase: validate\nepic-id: test\nepic-slug: test\nstatus: failed\nfailed-features: token-cache,auth-lib\n---\n",
    );
    const output = buildOutput("test.md", fm, "/tmp");
    expect(output).toBeDefined();
    expect(output!.status).toBe("error");
    expect((output!.artifacts as any)["failed-features"]).toEqual(["token-cache", "auth-lib"]);
  });

  test("does not include failed-features when absent", () => {
    const fm = parseFrontmatter(
      "---\nphase: validate\nepic-id: test\nepic-slug: test\nstatus: passed\n---\n",
    );
    const output = buildOutput("test.md", fm, "/tmp");
    expect(output).toBeDefined();
    expect(output!.status).toBe("completed");
    expect((output!.artifacts as any)["failed-features"]).toBeUndefined();
  });
});
```

- [ ] **Step 5: Update scanPlanFeatures tests**

Update all frontmatter in plan artifacts from `epic:` to `epic-slug:` and `feature:` to `feature-slug:`.
Update all `.slug` assertions to `["feature-slug"]`.

Replace test "finds features for matching epic":
```typescript
  test("finds features for matching epic", () => {
    writeArtifact("plan", "2026-03-30-my-epic-auth.md",
      "---\nphase: plan\nepic-slug: my-epic\nfeature-slug: auth\n---\n# Auth");
    writeArtifact("plan", "2026-03-30-my-epic-db.md",
      "---\nphase: plan\nepic-slug: my-epic\nfeature-slug: db\n---\n# DB");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(2);
    expect(features.map((f) => f["feature-slug"]).sort()).toEqual(["auth", "db"]);
  });
```

Replace test "rejects features from different epic":
```typescript
  test("rejects features from different epic (strict frontmatter match)", () => {
    writeArtifact("plan", "2026-03-29-old-epic-stale.md",
      "---\nphase: plan\nepic-slug: old-epic\nfeature-slug: stale\n---\n# Stale");
    writeArtifact("plan", "2026-03-30-my-epic-fresh.md",
      "---\nphase: plan\nepic-slug: my-epic\nfeature-slug: fresh\n---\n# Fresh");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(1);
    expect(features[0]["feature-slug"]).toBe("fresh");
  });
```

Replace test "skips files without feature field":
```typescript
  test("skips files without feature-slug field", () => {
    writeArtifact("plan", "2026-03-30-my-epic.md",
      "---\nphase: plan\nepic-slug: my-epic\nepic-id: my-epic\n---\n# Epic-level plan");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(0);
  });
```

Replace test "extracts wave number":
```typescript
  test("extracts wave number from feature frontmatter", () => {
    writeArtifact("plan", "2026-03-30-my-epic-wave-a.md",
      "---\nphase: plan\nepic-slug: my-epic\nfeature-slug: wave-a\nwave: 1\n---\n# Wave A");
    writeArtifact("plan", "2026-03-30-my-epic-wave-b.md",
      "---\nphase: plan\nepic-slug: my-epic\nfeature-slug: wave-b\nwave: 2\n---\n# Wave B");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(2);
    const sorted = features.sort((a, b) => (a.wave ?? 1) - (b.wave ?? 1));
    expect(sorted[0]["feature-slug"]).toBe("wave-a");
    expect(sorted[0].wave).toBe(1);
    expect(sorted[1]["feature-slug"]).toBe("wave-b");
    expect(sorted[1].wave).toBe(2);
  });
```

Replace test "defaults wave to undefined":
```typescript
  test("defaults wave to undefined when not in frontmatter", () => {
    writeArtifact("plan", "2026-03-30-my-epic-no-wave.md",
      "---\nphase: plan\nepic-slug: my-epic\nfeature-slug: no-wave\n---\n# No Wave");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(1);
    expect(features[0].wave).toBeUndefined();
  });
```

- [ ] **Step 6: Update processArtifact tests**

Update frontmatter in "generates output.json for a design artifact":
- Change `id: my-epic` to `epic-slug: my-epic` in the artifact content

Update "generates output.json for a plan artifact with features":
- Change `epic: my-epic` to `epic-slug: my-epic` and `feature: auth` to `feature-slug: auth` in artifact content
- Change `features[0].slug` to `features[0]["feature-slug"]`

- [ ] **Step 7: Update runSessionStop tests**

Update frontmatter in "processes artifacts across multiple phases":
- Change `id: epic` to `epic-slug: epic` in the design artifact

Update "the bug scenario: stale plan features are excluded by frontmatter":
- Change all `epic:` to `epic-slug:` and `feature:` to `feature-slug:` in artifact content
- Change all `.slug` assertions to `["feature-slug"]`

- [ ] **Step 8: Add ArtifactFrontmatter import to test file**

Add import of `ArtifactFrontmatter` in the test file import list so `as ArtifactFrontmatter` casts work:

```typescript
import {
  parseFrontmatter,
  buildOutput,
  scanPlanFeatures,
  processArtifact,
  runSessionStop,
  type ArtifactFrontmatter,
} from "../hooks/session-stop";
```

- [ ] **Step 9: Run tests**

Run: `bun --bun vitest run src/__tests__/session-stop.test.ts`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add src/__tests__/session-stop.test.ts
git commit -m "test(session-stop): update fixtures to unified field names (#517)"
```
