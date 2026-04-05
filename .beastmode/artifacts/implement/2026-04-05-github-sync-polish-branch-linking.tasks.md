# Branch Linking — Implementation Tasks

## Goal

Link feature branches to epic issues and impl branches to feature issues via the GitHub `createLinkedBranch` GraphQL mutation. This makes branches visible in the Development sidebar of each issue.

## Architecture

- **GraphQL wrapper** in `cli/src/github/cli.ts` — new `ghCreateLinkedBranch()` function using existing `ghGraphQL()` helper
- **GraphQL ID resolution** in `cli/src/github/cli.ts` — new `ghRepoNodeId()` and `ghIssueNodeId()` helpers
- **Branch link orchestrator** in `cli/src/github/branch-link.ts` — pure function that maps branches to issues and calls the wrapper
- **Pipeline integration** in `cli/src/pipeline/runner.ts` — new Step 8.9 after git.push (Step 8.7), gated on `github.enabled`
- All functions follow warn-and-continue pattern (return undefined on failure, never throw)

## Tech Stack

- TypeScript, Bun runtime
- `vitest` for testing (project convention)
- `gh api graphql` via `ghGraphQL()` for GitHub API calls

## File Structure

- **Modify:** `cli/src/github/cli.ts` — add `ghCreateLinkedBranch()`, `ghRepoNodeId()`, `ghIssueNodeId()`
- **Create:** `cli/src/github/branch-link.ts` — orchestrator: `linkBranches()` function
- **Modify:** `cli/src/pipeline/runner.ts` — add Step 8.9 branch-link call
- **Create:** `cli/src/__tests__/branch-link.test.ts` — unit tests for branch-link orchestrator
- **Modify:** `cli/src/__tests__/gh.test.ts` — unit tests for new GraphQL wrappers
- **Modify:** `cli/src/__tests__/pipeline-runner.test.ts` — test for Step 8.9
- **Create:** `cli/src/__tests__/branch-linking.integration.test.ts` — integration test (Task 0)

---

### Task 0: Integration Test (BDD RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/branch-linking.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { describe, test, expect, vi, beforeEach } from "vitest";

/**
 * Branch Linking Integration Test
 *
 * Verifies the end-to-end flow: branches are linked to issues via
 * the GitHub createLinkedBranch GraphQL mutation. These tests verify
 * the orchestrator logic with mocked GraphQL calls.
 *
 * @tag github-sync-polish
 */

// Mock the CLI module at the top level
const mockGhGraphQL = vi.hoisted(() => vi.fn());
const mockGh = vi.hoisted(() => vi.fn());

vi.mock("../github/cli.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../github/cli.js")>();
  return {
    ...orig,
    ghGraphQL: mockGhGraphQL,
    gh: mockGh,
  };
});

describe("Branch Linking Integration", () => {
  beforeEach(() => {
    mockGhGraphQL.mockReset();
    mockGh.mockReset();
  });

  describe("Feature branch linked to epic issue", () => {
    test("feature branch appears in the epic issue's Development sidebar", async () => {
      // Stub repo node ID resolution
      mockGhGraphQL
        .mockResolvedValueOnce({ repository: { id: "R_repo123" } }) // repo node ID
        .mockResolvedValueOnce({ repository: { issue: { id: "I_epic456" } } }) // issue node ID
        .mockResolvedValueOnce(undefined); // delete ref (may fail, that's ok)

      mockGhGraphQL.mockResolvedValueOnce({
        createLinkedBranch: { linkedBranch: { id: "LB_1" } },
      }); // createLinkedBranch

      const { linkBranches } = await import("../github/branch-link.js");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        featureSlug: undefined,
        featureIssueNumber: undefined,
        phase: "plan",
      });

      // Verify createLinkedBranch was called for feature branch -> epic issue
      const calls = mockGhGraphQL.mock.calls;
      const createCall = calls.find(([query]: [string]) =>
        query.includes("createLinkedBranch"),
      );
      expect(createCall).toBeDefined();
    });
  });

  describe("Impl branch linked to feature issue", () => {
    test("impl branch appears in the feature issue's Development sidebar", async () => {
      // Stub for feature branch -> epic issue
      mockGhGraphQL
        .mockResolvedValueOnce({ repository: { id: "R_repo123" } }) // repo node ID
        .mockResolvedValueOnce({ repository: { issue: { id: "I_epic456" } } }) // epic issue node ID
        .mockResolvedValueOnce(undefined) // delete ref
        .mockResolvedValueOnce({
          createLinkedBranch: { linkedBranch: { id: "LB_1" } },
        }); // createLinkedBranch for feature branch

      // Stub for impl branch -> feature issue
      mockGhGraphQL
        .mockResolvedValueOnce({ repository: { issue: { id: "I_feat789" } } }) // feature issue node ID
        .mockResolvedValueOnce(undefined) // delete ref
        .mockResolvedValueOnce({
          createLinkedBranch: { linkedBranch: { id: "LB_2" } },
        }); // createLinkedBranch for impl branch

      const { linkBranches } = await import("../github/branch-link.js");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        featureSlug: "my-feature",
        featureIssueNumber: 200,
        phase: "implement",
      });

      const calls = mockGhGraphQL.mock.calls;
      const createCalls = calls.filter(([query]: [string]) =>
        query.includes("createLinkedBranch"),
      );
      expect(createCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Branch linking is idempotent", () => {
    test("no duplicate link is created when branch already linked", async () => {
      // First call returns linkedBranch: null (already exists)
      mockGhGraphQL
        .mockResolvedValueOnce({ repository: { id: "R_repo123" } })
        .mockResolvedValueOnce({ repository: { issue: { id: "I_epic456" } } })
        .mockResolvedValueOnce(undefined) // delete ref
        .mockResolvedValueOnce({
          createLinkedBranch: { linkedBranch: { id: "LB_new" } },
        });

      const { linkBranches } = await import("../github/branch-link.js");

      // Should not throw
      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        featureSlug: undefined,
        featureIssueNumber: undefined,
        phase: "plan",
      });

      // Verify the flow completed without error
      expect(mockGhGraphQL).toHaveBeenCalled();
    });
  });

  describe("Branch linking skips issues without a known issue number", () => {
    test("epic is skipped without error when no issue number", async () => {
      const { linkBranches } = await import("../github/branch-link.js");

      // Should not throw, should not call any GraphQL
      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: undefined,
        featureSlug: undefined,
        featureIssueNumber: undefined,
        phase: "plan",
      });

      expect(mockGhGraphQL).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/branch-linking.integration.test.ts`
Expected: FAIL — `../github/branch-link.js` module does not exist

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/branch-linking.integration.test.ts
git commit -m "test(branch-linking): add integration test (RED)"
```

---

### Task 1: GraphQL Node ID Resolution Helpers

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/cli.ts`
- Modify: `cli/src/__tests__/gh.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/gh.test.ts`:

```typescript
// ---------------------------------------------------------------------------
// ghRepoNodeId() — repository GraphQL node ID resolution
// ---------------------------------------------------------------------------
describe("ghRepoNodeId()", () => {
  let mockGh: Mock;

  beforeEach(() => {
    mockGh = vi.fn();
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghGraphQL: async <T = unknown>(
        query: string,
        variables: Record<string, string | number> = {},
        opts: { cwd?: string } = {},
      ): Promise<T | undefined> => {
        const args: string[] = ["api", "graphql", "-f", `query=${query}`];
        for (const [key, value] of Object.entries(variables)) {
          if (typeof value === "number") {
            args.push("-F", `${key}=${value}`);
          } else {
            args.push("-f", `${key}=${value}`);
          }
        }
        const result = await mockGh(args, opts);
        if (!result) return undefined;
        try {
          const parsed = JSON.parse(result.stdout);
          return parsed.data as T;
        } catch {
          return undefined;
        }
      },
      ghRepoNodeId: async (
        repo: string,
        opts: { cwd?: string; logger?: any } = {},
      ): Promise<string | undefined> => {
        const [owner, name] = repo.split("/");
        const data = await (async () => {
          const args: string[] = ["api", "graphql", "-f", `query=query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { id } }`];
          args.push("-f", `owner=${owner}`, "-f", `name=${name}`);
          const result = await mockGh(args, opts);
          if (!result) return undefined;
          try { return JSON.parse(result.stdout).data; } catch { return undefined; }
        })();
        return data?.repository?.id;
      },
    }));
  });

  test("returns repository node ID on success", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"repository":{"id":"R_kgDOABCDEF"}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghRepoNodeId } = await import("../github/cli");
    const id = await ghRepoNodeId("BugRoger/beastmode");
    expect(id).toBe("R_kgDOABCDEF");
  });

  test("returns undefined when gh fails", async () => {
    mockGh.mockReturnValue(Promise.resolve(undefined));

    const { ghRepoNodeId } = await import("../github/cli");
    const id = await ghRepoNodeId("BugRoger/beastmode");
    expect(id).toBeUndefined();
  });

  test("splits owner/name correctly", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"repository":{"id":"R_123"}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghRepoNodeId } = await import("../github/cli");
    await ghRepoNodeId("org/project");

    const calledArgs = mockGh.mock.calls[0][0] as string[];
    expect(calledArgs).toContain("owner=org");
    expect(calledArgs).toContain("name=project");
  });
});

// ---------------------------------------------------------------------------
// ghIssueNodeId() — issue GraphQL node ID resolution
// ---------------------------------------------------------------------------
describe("ghIssueNodeId()", () => {
  let mockGh: Mock;

  beforeEach(() => {
    mockGh = vi.fn();
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghGraphQL: async <T = unknown>(
        query: string,
        variables: Record<string, string | number> = {},
        opts: { cwd?: string } = {},
      ): Promise<T | undefined> => {
        const args: string[] = ["api", "graphql", "-f", `query=${query}`];
        for (const [key, value] of Object.entries(variables)) {
          if (typeof value === "number") {
            args.push("-F", `${key}=${value}`);
          } else {
            args.push("-f", `${key}=${value}`);
          }
        }
        const result = await mockGh(args, opts);
        if (!result) return undefined;
        try {
          const parsed = JSON.parse(result.stdout);
          return parsed.data as T;
        } catch {
          return undefined;
        }
      },
      ghIssueNodeId: async (
        repo: string,
        issueNumber: number,
        opts: { cwd?: string; logger?: any } = {},
      ): Promise<string | undefined> => {
        const [owner, name] = repo.split("/");
        const data = await (async () => {
          const args: string[] = ["api", "graphql", "-f", `query=query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { issue(number: $number) { id } } }`];
          args.push("-f", `owner=${owner}`, "-f", `name=${name}`, "-F", `number=${issueNumber}`);
          const result = await mockGh(args, opts);
          if (!result) return undefined;
          try { return JSON.parse(result.stdout).data; } catch { return undefined; }
        })();
        return data?.repository?.issue?.id;
      },
    }));
  });

  test("returns issue node ID on success", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"repository":{"issue":{"id":"I_kwDOABCDEF"}}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghIssueNodeId } = await import("../github/cli");
    const id = await ghIssueNodeId("BugRoger/beastmode", 414);
    expect(id).toBe("I_kwDOABCDEF");
  });

  test("returns undefined when gh fails", async () => {
    mockGh.mockReturnValue(Promise.resolve(undefined));

    const { ghIssueNodeId } = await import("../github/cli");
    const id = await ghIssueNodeId("BugRoger/beastmode", 414);
    expect(id).toBeUndefined();
  });

  test("passes issue number as numeric -F flag", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"repository":{"issue":{"id":"I_123"}}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghIssueNodeId } = await import("../github/cli");
    await ghIssueNodeId("org/repo", 42);

    const calledArgs = mockGh.mock.calls[0][0] as string[];
    const numIdx = calledArgs.indexOf("number=42");
    expect(numIdx).toBeGreaterThan(-1);
    expect(calledArgs[numIdx - 1]).toBe("-F");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/gh.test.ts`
Expected: FAIL — `ghRepoNodeId` and `ghIssueNodeId` not exported from `../github/cli`

- [ ] **Step 3: Implement the GraphQL node ID resolution helpers**

Add to `cli/src/github/cli.ts` (after the `ghGraphQL` function):

```typescript
/**
 * Resolve a repository's GraphQL node ID from "owner/repo".
 * Returns the ID string (e.g., "R_kgDOABCDEF") or undefined.
 */
export async function ghRepoNodeId(
  repo: string,
  opts: { cwd?: string; logger?: Logger } = {},
): Promise<string | undefined> {
  const [owner, name] = repo.split("/");
  const data = await ghGraphQL<{
    repository: { id: string };
  }>(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { id }
    }`,
    { owner, name },
    opts,
  );
  return data?.repository?.id;
}

/**
 * Resolve a GitHub issue's GraphQL node ID from repo + issue number.
 * Returns the ID string (e.g., "I_kwDOABCDEF") or undefined.
 */
export async function ghIssueNodeId(
  repo: string,
  issueNumber: number,
  opts: { cwd?: string; logger?: Logger } = {},
): Promise<string | undefined> {
  const [owner, name] = repo.split("/");
  const data = await ghGraphQL<{
    repository: { issue: { id: string } };
  }>(
    `query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) { issue(number: $number) { id } }
    }`,
    { owner, name, number: issueNumber },
    opts,
  );
  return data?.repository?.issue?.id;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/gh.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/github/cli.ts cli/src/__tests__/gh.test.ts
git commit -m "feat(branch-linking): add ghRepoNodeId and ghIssueNodeId helpers"
```

---

### Task 2: createLinkedBranch GraphQL Wrapper

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/cli.ts`
- Modify: `cli/src/__tests__/gh.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/gh.test.ts`:

```typescript
// ---------------------------------------------------------------------------
// ghCreateLinkedBranch() — createLinkedBranch GraphQL mutation
// ---------------------------------------------------------------------------
describe("ghCreateLinkedBranch()", () => {
  let mockGh: Mock;

  beforeEach(() => {
    mockGh = vi.fn();
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghGraphQL: async <T = unknown>(
        query: string,
        variables: Record<string, string | number> = {},
        opts: { cwd?: string } = {},
      ): Promise<T | undefined> => {
        const args: string[] = ["api", "graphql", "-f", `query=${query}`];
        for (const [key, value] of Object.entries(variables)) {
          if (typeof value === "number") {
            args.push("-F", `${key}=${value}`);
          } else {
            args.push("-f", `${key}=${value}`);
          }
        }
        const result = await mockGh(args, opts);
        if (!result) return undefined;
        try {
          const parsed = JSON.parse(result.stdout);
          return parsed.data as T;
        } catch {
          return undefined;
        }
      },
      ghCreateLinkedBranch: async (
        repoId: string,
        issueId: string,
        branchName: string,
        oid: string,
        opts: { cwd?: string; logger?: any } = {},
      ): Promise<string | undefined> => {
        const data = await (async () => {
          const args: string[] = ["api", "graphql", "-f", `query=mutation($repoId: ID!, $issueId: ID!, $branchName: String!, $oid: GitObjectID!) { createLinkedBranch(input: { repositoryId: $repoId, issueId: $issueId, name: $branchName, oid: $oid }) { linkedBranch { id } } }`];
          args.push("-f", `repoId=${repoId}`, "-f", `issueId=${issueId}`, "-f", `branchName=${branchName}`, "-f", `oid=${oid}`);
          const result = await mockGh(args, opts);
          if (!result) return undefined;
          try { return JSON.parse(result.stdout).data; } catch { return undefined; }
        })();
        return data?.createLinkedBranch?.linkedBranch?.id;
      },
    }));
  });

  test("returns linked branch ID on success", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"createLinkedBranch":{"linkedBranch":{"id":"LB_abc123"}}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghCreateLinkedBranch } = await import("../github/cli");
    const id = await ghCreateLinkedBranch("R_repo", "I_issue", "feature/my-epic", "abc123def");
    expect(id).toBe("LB_abc123");
  });

  test("returns undefined when linkedBranch is null (branch exists)", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"createLinkedBranch":{"linkedBranch":null}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghCreateLinkedBranch } = await import("../github/cli");
    const id = await ghCreateLinkedBranch("R_repo", "I_issue", "feature/test", "abc123");
    expect(id).toBeUndefined();
  });

  test("returns undefined when gh fails", async () => {
    mockGh.mockReturnValue(Promise.resolve(undefined));

    const { ghCreateLinkedBranch } = await import("../github/cli");
    const id = await ghCreateLinkedBranch("R_repo", "I_issue", "feature/test", "abc123");
    expect(id).toBeUndefined();
  });

  test("passes all four variables as string -f flags", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"createLinkedBranch":{"linkedBranch":{"id":"LB_1"}}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghCreateLinkedBranch } = await import("../github/cli");
    await ghCreateLinkedBranch("R_repo", "I_issue", "feature/test", "sha123");

    const calledArgs = mockGh.mock.calls[0][0] as string[];
    expect(calledArgs).toContain("repoId=R_repo");
    expect(calledArgs).toContain("issueId=I_issue");
    expect(calledArgs).toContain("branchName=feature/test");
    expect(calledArgs).toContain("oid=sha123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/gh.test.ts`
Expected: FAIL — `ghCreateLinkedBranch` not exported

- [ ] **Step 3: Implement the createLinkedBranch wrapper**

Add to `cli/src/github/cli.ts` (after the node ID helpers):

```typescript
/**
 * Create a linked branch on a GitHub issue via GraphQL mutation.
 *
 * The mutation creates a remote branch AND links it to the issue in one step.
 * Returns the linked branch ID on success, or undefined if the branch
 * already existed (linkedBranch: null) or the call failed.
 */
export async function ghCreateLinkedBranch(
  repoId: string,
  issueId: string,
  branchName: string,
  oid: string,
  opts: { cwd?: string; logger?: Logger } = {},
): Promise<string | undefined> {
  const data = await ghGraphQL<{
    createLinkedBranch: { linkedBranch: { id: string } | null };
  }>(
    `mutation($repoId: ID!, $issueId: ID!, $branchName: String!, $oid: GitObjectID!) {
      createLinkedBranch(input: {
        repositoryId: $repoId
        issueId: $issueId
        name: $branchName
        oid: $oid
      }) {
        linkedBranch { id }
      }
    }`,
    { repoId, issueId, branchName, oid },
    opts,
  );
  return data?.createLinkedBranch?.linkedBranch?.id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/gh.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/github/cli.ts cli/src/__tests__/gh.test.ts
git commit -m "feat(branch-linking): add ghCreateLinkedBranch GraphQL wrapper"
```

---

### Task 3: Branch Link Orchestrator

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Create: `cli/src/github/branch-link.ts`
- Create: `cli/src/__tests__/branch-link.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// cli/src/__tests__/branch-link.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGhRepoNodeId = vi.hoisted(() => vi.fn());
const mockGhIssueNodeId = vi.hoisted(() => vi.fn());
const mockGhCreateLinkedBranch = vi.hoisted(() => vi.fn());
const mockGh = vi.hoisted(() => vi.fn());

vi.mock("../github/cli.js", () => ({
  ghRepoNodeId: mockGhRepoNodeId,
  ghIssueNodeId: mockGhIssueNodeId,
  ghCreateLinkedBranch: mockGhCreateLinkedBranch,
  gh: mockGh,
}));

const mockGit = vi.hoisted(() => vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 })));

vi.mock("../git/worktree.js", () => ({
  git: mockGit,
  implBranchName: (slug: string, feature: string) => `impl/${slug}--${feature}`,
}));

import { linkBranches } from "../github/branch-link.js";

describe("branch-link", () => {
  beforeEach(() => {
    mockGhRepoNodeId.mockReset();
    mockGhIssueNodeId.mockReset();
    mockGhCreateLinkedBranch.mockReset();
    mockGh.mockReset();
    mockGit.mockReset();
    mockGit.mockImplementation(async () => ({ stdout: "abc123def456", stderr: "", exitCode: 0 }));
  });

  describe("linkBranches", () => {
    it("links feature branch to epic issue", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        phase: "plan",
      });

      expect(mockGhRepoNodeId).toHaveBeenCalledWith("BugRoger/beastmode", expect.any(Object));
      expect(mockGhIssueNodeId).toHaveBeenCalledWith("BugRoger/beastmode", 100, expect.any(Object));
      expect(mockGhCreateLinkedBranch).toHaveBeenCalledWith(
        "R_repo123",
        "I_epic456",
        "feature/my-epic",
        "abc123def456",
        expect.any(Object),
      );
    });

    it("links both feature and impl branches during implement phase", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId
        .mockResolvedValueOnce("I_epic456")   // epic issue
        .mockResolvedValueOnce("I_feat789");  // feature issue
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        featureSlug: "my-feature",
        featureIssueNumber: 200,
        phase: "implement",
      });

      expect(mockGhCreateLinkedBranch).toHaveBeenCalledTimes(2);
      // First call: feature branch -> epic issue
      expect(mockGhCreateLinkedBranch.mock.calls[0][2]).toBe("feature/my-epic");
      // Second call: impl branch -> feature issue
      expect(mockGhCreateLinkedBranch.mock.calls[1][2]).toBe("impl/my-epic--my-feature");
    });

    it("skips entirely when no epic issue number", async () => {
      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: undefined,
        phase: "plan",
      });

      expect(mockGhRepoNodeId).not.toHaveBeenCalled();
      expect(mockGhCreateLinkedBranch).not.toHaveBeenCalled();
    });

    it("skips impl branch when no feature issue number", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        featureSlug: "my-feature",
        featureIssueNumber: undefined,
        phase: "implement",
      });

      // Only feature branch -> epic, not impl branch -> feature
      expect(mockGhCreateLinkedBranch).toHaveBeenCalledTimes(1);
      expect(mockGhCreateLinkedBranch.mock.calls[0][2]).toBe("feature/my-epic");
    });

    it("deletes remote ref before createLinkedBranch", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        phase: "plan",
      });

      // git push origin --delete should be called before createLinkedBranch
      const gitCalls = mockGit.mock.calls;
      const deleteCall = gitCalls.find(
        ([args]: [string[]]) => args[0] === "push" && args.includes("--delete"),
      );
      expect(deleteCall).toBeDefined();
    });

    it("continues when repo node ID resolution fails", async () => {
      mockGhRepoNodeId.mockResolvedValue(undefined);

      // Should not throw
      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        phase: "plan",
      });

      expect(mockGhCreateLinkedBranch).not.toHaveBeenCalled();
    });

    it("continues when issue node ID resolution fails", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue(undefined);

      // Should not throw
      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        phase: "plan",
      });

      expect(mockGhCreateLinkedBranch).not.toHaveBeenCalled();
    });

    it("continues when createLinkedBranch fails", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue(undefined);

      // Should not throw — warn and continue
      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        phase: "plan",
      });

      expect(mockGhCreateLinkedBranch).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/branch-link.test.ts`
Expected: FAIL — `../github/branch-link.js` does not exist

- [ ] **Step 3: Implement the branch link orchestrator**

Create `cli/src/github/branch-link.ts`:

```typescript
/**
 * Branch Link Orchestrator — links branches to GitHub issues via
 * the createLinkedBranch GraphQL mutation.
 *
 * Feature branches link to epic issues. Impl branches link to feature issues.
 * Uses delete-then-recreate flow since branches are already pushed.
 * Warn-and-continue: never throws, logs failures.
 */

import {
  ghRepoNodeId,
  ghIssueNodeId,
  ghCreateLinkedBranch,
} from "./cli.js";
import { git, implBranchName } from "../git/worktree.js";
import { createLogger } from "../logger.js";
import type { Logger } from "../logger.js";

export interface LinkBranchesOpts {
  repo: string;
  epicSlug: string;
  epicIssueNumber?: number;
  featureSlug?: string;
  featureIssueNumber?: number;
  phase: string;
  cwd?: string;
  logger?: Logger;
}

/**
 * Link branches to their corresponding GitHub issues.
 *
 * Always links the feature branch to the epic issue.
 * During implement phase, also links the impl branch to the feature issue.
 *
 * Uses delete-then-recreate: delete the remote ref first, then call
 * createLinkedBranch to recreate at the same SHA — this establishes the link.
 */
export async function linkBranches(opts: LinkBranchesOpts): Promise<void> {
  const log = opts.logger ?? createLogger(0, {});
  const { repo, epicSlug, epicIssueNumber, featureSlug, featureIssueNumber, phase, cwd } = opts;

  // Skip if no epic issue number
  if (!epicIssueNumber) return;

  // Resolve repo node ID (needed for createLinkedBranch)
  const repoId = await ghRepoNodeId(repo, { cwd, logger: log });
  if (!repoId) {
    log.warn?.("branch-link: failed to resolve repo node ID — skipping");
    return;
  }

  // Get HEAD SHA for createLinkedBranch
  const headResult = await git(["rev-parse", "HEAD"], { cwd, allowFailure: true });
  const oid = headResult.stdout.trim();
  if (!oid) {
    log.warn?.("branch-link: failed to resolve HEAD SHA — skipping");
    return;
  }

  // Link feature branch -> epic issue
  const featureBranch = `feature/${epicSlug}`;
  await linkOneBranch({
    repoId,
    repo,
    issueNumber: epicIssueNumber,
    branchName: featureBranch,
    oid,
    cwd,
    logger: log,
  });

  // Link impl branch -> feature issue (implement phase only)
  if (phase === "implement" && featureSlug && featureIssueNumber) {
    const implBranch = implBranchName(epicSlug, featureSlug);
    await linkOneBranch({
      repoId,
      repo,
      issueNumber: featureIssueNumber,
      branchName: implBranch,
      oid,
      cwd,
      logger: log,
    });
  }
}

/**
 * Link a single branch to an issue.
 * Delete remote ref first, then createLinkedBranch to establish the link.
 */
async function linkOneBranch(opts: {
  repoId: string;
  repo: string;
  issueNumber: number;
  branchName: string;
  oid: string;
  cwd?: string;
  logger?: Logger;
}): Promise<void> {
  const { repoId, repo, issueNumber, branchName, oid, cwd, logger: log } = opts;

  // Resolve issue node ID
  const issueId = await ghIssueNodeId(repo, issueNumber, { cwd, logger: log });
  if (!issueId) {
    log?.warn?.(`branch-link: failed to resolve issue #${issueNumber} node ID — skipping ${branchName}`);
    return;
  }

  // Delete the remote ref first (may fail if not on remote — that's fine)
  await git(
    ["push", "origin", "--delete", branchName],
    { cwd, allowFailure: true },
  );

  // Create linked branch (establishes the issue link)
  const linkedId = await ghCreateLinkedBranch(repoId, issueId, branchName, oid, { cwd, logger: log });
  if (linkedId) {
    log?.detail?.(`branch-link: linked ${branchName} -> #${issueNumber}`);
  } else {
    log?.warn?.(`branch-link: createLinkedBranch returned null for ${branchName} -> #${issueNumber}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/branch-link.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/github/branch-link.ts cli/src/__tests__/branch-link.test.ts
git commit -m "feat(branch-linking): add branch link orchestrator"
```

---

### Task 4: Pipeline Runner Integration (Step 8.9)

**Wave:** 3
**Depends on:** Task 3

**Files:**
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/__tests__/pipeline-runner.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `cli/src/__tests__/pipeline-runner.test.ts`. First, add the mock at the top (alongside existing mocks):

```typescript
// Mock github/branch-link
const mockLinkBranches = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../github/branch-link.js", () => ({
  linkBranches: mockLinkBranches,
}));
```

Then add the test at the end of the file:

```typescript
// ---------------------------------------------------------------------------
// Step 8.9: branch-link
// ---------------------------------------------------------------------------
describe("Step 8.9: branch-link", () => {
  it("calls linkBranches after push when github is enabled", async () => {
    const result = await run({
      phase: "implement" as Phase,
      epicSlug: "test-epic",
      args: ["test-epic", "my-feature"],
      projectRoot: "/tmp/test-project",
      strategy: "interactive",
      featureSlug: "my-feature",
      config: {
        hitl: { timeout: 5000 },
        "file-permissions": { timeout: 5000 },
        github: { enabled: true },
      } as any,
      dispatch: async () => ({ success: true }),
      skipPreDispatch: true,
    });

    expect(result.success).toBe(true);
    expect(mockLinkBranches).toHaveBeenCalledWith(expect.objectContaining({
      epicSlug: "test-epic",
      featureSlug: "my-feature",
      phase: "implement",
    }));
  });

  it("skips linkBranches when github is disabled", async () => {
    mockLinkBranches.mockClear();

    await run({
      phase: "plan" as Phase,
      epicSlug: "test-epic",
      args: ["test-epic"],
      projectRoot: "/tmp/test-project",
      strategy: "interactive",
      config: {
        hitl: { timeout: 5000 },
        "file-permissions": { timeout: 5000 },
        github: { enabled: false },
      } as any,
      dispatch: async () => ({ success: true }),
      skipPreDispatch: true,
    });

    expect(mockLinkBranches).not.toHaveBeenCalled();
  });

  it("does not block pipeline when linkBranches throws", async () => {
    mockLinkBranches.mockRejectedValueOnce(new Error("GraphQL timeout"));

    const result = await run({
      phase: "plan" as Phase,
      epicSlug: "test-epic",
      args: ["test-epic"],
      projectRoot: "/tmp/test-project",
      strategy: "interactive",
      config: {
        hitl: { timeout: 5000 },
        "file-permissions": { timeout: 5000 },
        github: { enabled: true },
      } as any,
      dispatch: async () => ({ success: true }),
      skipPreDispatch: true,
    });

    // Pipeline should still succeed
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: FAIL — `mockLinkBranches` never called (Step 8.9 doesn't exist yet)

- [ ] **Step 3: Add Step 8.9 to the pipeline runner**

Modify `cli/src/pipeline/runner.ts`:

1. Add import at the top:
```typescript
import { linkBranches } from "../github/branch-link.js";
```

2. Add Step 8.9 after the git.push block (after line 369), before Step 9:

```typescript
  // -- Step 8.9: branch-link -------------------------------------------------
  // Link branches to GitHub issues via createLinkedBranch GraphQL mutation.
  // Gated on github.enabled — pure git push (step 8.7) always runs.
  // Warn-and-continue on failure.
  try {
    const beastConfig = config.config;
    if (beastConfig.github.enabled) {
      const manifest = store.load(config.projectRoot, epicSlug);
      if (manifest?.github) {
        const featureIssueNumber = config.featureSlug
          ? manifest.features.find((f) => f.slug === config.featureSlug)?.github?.issue
          : undefined;
        await linkBranches({
          repo: manifest.github.repo,
          epicSlug,
          epicIssueNumber: manifest.github.epic,
          featureSlug: config.featureSlug,
          featureIssueNumber,
          phase: config.phase,
          cwd: worktreePath,
          logger,
        });
        logger.detail?.("branch linking complete");
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`branch linking failed (non-blocking): ${message}`);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/__tests__/pipeline-runner.test.ts
git commit -m "feat(branch-linking): add Step 8.9 to pipeline runner"
```
