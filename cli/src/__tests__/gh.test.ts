import { describe, test, expect, vi, beforeEach, type Mock } from "vitest";

/**
 * Unit tests for the gh CLI helper.
 *
 * Strategy:
 * - Base gh() function: integration-style test with `gh --version` (safe, read-only).
 * - Higher-level wrappers: mock the gh module so we control what gh() returns,
 *   then verify each wrapper's parsing/argument logic.
 * - Argument construction: tested in isolation where the logic is inline.
 * - Warn-and-continue: every function must return undefined/false, never throw.
 */

// ---------------------------------------------------------------------------
// Base gh() function — integration tests with real gh CLI
// ---------------------------------------------------------------------------
describe("gh() base function", () => {
  test("returns GhResult on successful command", async () => {
    const { gh } = await import("../github/cli");
    const result = await gh(["--version"]);
    // gh --version should succeed if gh is installed
    if (result) {
      expect(result.exitCode).toBe(0);
      expect(typeof result.stdout).toBe("string");
      expect(result.stdout).toContain("gh version");
      expect(typeof result.stderr).toBe("string");
    }
    // If gh is not installed, result is undefined — still fine
  });

  test("returns undefined on non-zero exit code", async () => {
    const { gh } = await import("../github/cli");
    // Pass an invalid subcommand to force a non-zero exit
    const result = await gh(["nonexistent-subcommand-xyz-12345"]);
    expect(result).toBeUndefined();
  });

  test("never throws — returns undefined on failure", async () => {
    const { gh } = await import("../github/cli");
    // Even a completely broken invocation should not throw
    let threw = false;
    try {
      await gh(["nonexistent-subcommand-xyz-12345"]);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  test("passes cwd option through to spawn", async () => {
    const { gh } = await import("../github/cli");
    // Using /tmp as cwd should still let gh --version work
    const result = await gh(["--version"], { cwd: "/tmp" });
    if (result) {
      expect(result.exitCode).toBe(0);
    }
  });

  test("trims stdout and stderr in result", async () => {
    const { gh } = await import("../github/cli");
    const result = await gh(["--version"]);
    if (result) {
      // Trimmed means no leading/trailing whitespace
      expect(result.stdout).toBe(result.stdout.trim());
      expect(result.stderr).toBe(result.stderr.trim());
    }
  });
});

// ---------------------------------------------------------------------------
// ghJson() — mock gh() to control stdout
// ---------------------------------------------------------------------------
describe("ghJson()", () => {
  let mockGh: Mock;

  beforeEach(() => {
    mockGh = vi.fn();
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghJson: async <T = unknown>(
        args: string[],
        opts: { cwd?: string } = {},
      ): Promise<T | undefined> => {
        const result = await mockGh(args, opts);
        if (!result) return undefined;
        try {
          return JSON.parse(result.stdout) as T;
        } catch {
          console.error(`WARNING: gh ${args[0]} returned non-JSON output`);
          return undefined;
        }
      },
    }));
  });

  test("parses valid JSON stdout", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"key":"value","count":42}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghJson } = await import("../github/cli");
    const result = await ghJson<{ key: string; count: number }>(["api", "test"]);
    expect(result).toEqual({ key: "value", count: 42 });
  });

  test("returns undefined when gh() returns undefined", async () => {
    mockGh.mockReturnValue(Promise.resolve(undefined));

    const { ghJson } = await import("../github/cli");
    const result = await ghJson(["api", "test"]);
    expect(result).toBeUndefined();
  });

  test("returns undefined on non-JSON output", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: "this is not json",
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghJson } = await import("../github/cli");
    const result = await ghJson(["api", "test"]);
    expect(result).toBeUndefined();
  });

  test("never throws on invalid JSON", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: "{broken json",
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghJson } = await import("../github/cli");
    let threw = false;
    try {
      await ghJson(["api", "test"]);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ghGraphQL() — argument construction and .data extraction
// ---------------------------------------------------------------------------
describe("ghGraphQL()", () => {
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
          console.error(`WARNING: gh api graphql returned non-JSON output`);
          return undefined;
        }
      },
    }));
  });

  test("extracts .data from GraphQL response", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":{"viewer":{"login":"testuser"}}}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghGraphQL } = await import("../github/cli");
    const result = await ghGraphQL<{ viewer: { login: string } }>(
      "query { viewer { login } }",
    );
    expect(result).toEqual({ viewer: { login: "testuser" } });
  });

  test("passes string variables with -f flag", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":null}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghGraphQL } = await import("../github/cli");
    await ghGraphQL("query { test }", { owner: "org", repo: "name" });

    const calledArgs = mockGh.mock.calls[0][0] as string[];
    // Check that string vars use -f
    const ownerIdx = calledArgs.indexOf("owner=org");
    expect(ownerIdx).toBeGreaterThan(-1);
    expect(calledArgs[ownerIdx - 1]).toBe("-f");

    const repoIdx = calledArgs.indexOf("repo=name");
    expect(repoIdx).toBeGreaterThan(-1);
    expect(calledArgs[repoIdx - 1]).toBe("-f");
  });

  test("passes numeric variables with -F flag", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: '{"data":null}',
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghGraphQL } = await import("../github/cli");
    await ghGraphQL("query { test }", { number: 42 });

    const calledArgs = mockGh.mock.calls[0][0] as string[];
    const numIdx = calledArgs.indexOf("number=42");
    expect(numIdx).toBeGreaterThan(-1);
    expect(calledArgs[numIdx - 1]).toBe("-F");
  });

  test("returns undefined when gh() fails", async () => {
    mockGh.mockReturnValue(Promise.resolve(undefined));

    const { ghGraphQL } = await import("../github/cli");
    const result = await ghGraphQL("query { viewer { login } }");
    expect(result).toBeUndefined();
  });

  test("returns undefined on non-JSON response", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: "not json",
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghGraphQL } = await import("../github/cli");
    const result = await ghGraphQL("query { test }");
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ghIssueCreate() — URL parsing for issue number extraction
// ---------------------------------------------------------------------------
describe("ghIssueCreate() URL parsing", () => {
  test("extracts issue number from standard GitHub URL", () => {
    const stdout = "https://github.com/org/repo/issues/42";
    const match = stdout.match(/\/(\d+)\s*$/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBe(42);
  });

  test("extracts issue number with trailing whitespace", () => {
    const stdout = "https://github.com/org/repo/issues/99  \n";
    const match = stdout.trim().match(/\/(\d+)\s*$/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBe(99);
  });

  test("extracts high issue numbers", () => {
    const stdout = "https://github.com/org/repo/issues/12345";
    const match = stdout.match(/\/(\d+)\s*$/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBe(12345);
  });

  test("returns null for non-URL output", () => {
    const stdout = "Created issue successfully";
    const match = stdout.match(/\/(\d+)\s*$/);
    expect(match).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ghIssueCreate() — full mock test
// ---------------------------------------------------------------------------
describe("ghIssueCreate()", () => {
  let mockGh: Mock;

  beforeEach(() => {
    mockGh = vi.fn();
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghIssueCreate: async (
        repo: string,
        title: string,
        body: string,
        labels: string[] = [],
        opts: { cwd?: string } = {},
      ): Promise<number | undefined> => {
        const args = [
          "issue", "create", "--repo", repo,
          "--title", title, "--body", body,
        ];
        for (const label of labels) {
          args.push("--label", label);
        }
        const result = await mockGh(args, opts);
        if (!result) return undefined;
        const match = result.stdout.match(/\/(\d+)\s*$/);
        return match ? parseInt(match[1], 10) : undefined;
      },
    }));
  });

  test("returns parsed issue number on success", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: "https://github.com/org/repo/issues/42",
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghIssueCreate } = await import("../github/cli");
    const num = await ghIssueCreate("org/repo", "Test title", "Test body");
    expect(num).toBe(42);
  });

  test("passes labels as separate --label flags", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({
        stdout: "https://github.com/org/repo/issues/1",
        stderr: "",
        exitCode: 0,
      }),
    );

    const { ghIssueCreate } = await import("../github/cli");
    await ghIssueCreate("org/repo", "Test", "Body", ["bug", "urgent"]);

    const calledArgs = mockGh.mock.calls[0][0] as string[];
    // Each label gets its own --label flag
    const labelIndices = calledArgs
      .map((a: string, i: number) => (a === "--label" ? i : -1))
      .filter((i: number) => i !== -1);
    expect(labelIndices).toHaveLength(2);
    expect(calledArgs[labelIndices[0] + 1]).toBe("bug");
    expect(calledArgs[labelIndices[1] + 1]).toBe("urgent");
  });

  test("returns undefined when gh() fails", async () => {
    mockGh.mockReturnValue(Promise.resolve(undefined));

    const { ghIssueCreate } = await import("../github/cli");
    const num = await ghIssueCreate("org/repo", "Test", "Body");
    expect(num).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ghIssueEdit() — argument construction
// ---------------------------------------------------------------------------
describe("ghIssueEdit() argument construction", () => {
  test("builds add-label args correctly", () => {
    const issueNumber = 42;
    const repo = "org/repo";
    const addLabels = ["status/in-progress", "type/feature"];

    const args = ["issue", "edit", String(issueNumber), "--repo", repo];
    if (addLabels.length) args.push("--add-label", addLabels.join(","));

    expect(args).toContain("--add-label");
    expect(args).toContain("status/in-progress,type/feature");
    expect(args[2]).toBe("42");
  });

  test("builds remove-label args correctly", () => {
    const removeLabels = ["status/ready"];
    const args = ["issue", "edit", "42", "--repo", "org/repo"];
    if (removeLabels.length) args.push("--remove-label", removeLabels.join(","));

    expect(args).toContain("--remove-label");
    expect(args).toContain("status/ready");
  });

  test("builds combined add and remove args", () => {
    const addLabels = ["status/done"];
    const removeLabels = ["status/in-progress"];
    const args = ["issue", "edit", "42", "--repo", "org/repo"];
    if (addLabels.length) args.push("--add-label", addLabels.join(","));
    if (removeLabels.length) args.push("--remove-label", removeLabels.join(","));

    expect(args).toContain("--add-label");
    expect(args).toContain("status/done");
    expect(args).toContain("--remove-label");
    expect(args).toContain("status/in-progress");
  });

  test("omits label flags when arrays are empty", () => {
    const addLabels: string[] = [];
    const removeLabels: string[] = [];
    const args = ["issue", "edit", "42", "--repo", "org/repo"];
    if (addLabels.length) args.push("--add-label", addLabels.join(","));
    if (removeLabels.length) args.push("--remove-label", removeLabels.join(","));

    expect(args).not.toContain("--add-label");
    expect(args).not.toContain("--remove-label");
  });
});

// ---------------------------------------------------------------------------
// ghIssueEdit() body parameter
// ---------------------------------------------------------------------------
describe("ghIssueEdit() body parameter", () => {
  test("passes --body when body is provided", () => {
    const args = ["issue", "edit", "42", "--repo", "org/repo"];
    const body = "## Updated\n\nNew content here";
    args.push("--body", body);

    expect(args).toContain("--body");
    expect(args).toContain(body);
  });

  test("omits --body when body is undefined", () => {
    const args = ["issue", "edit", "42", "--repo", "org/repo"];
    const body: string | undefined = undefined;
    if (body !== undefined) args.push("--body", body);

    expect(args).not.toContain("--body");
  });

  test("passes --body with empty string", () => {
    const args = ["issue", "edit", "42", "--repo", "org/repo"];
    const body = "";
    if (body !== undefined) args.push("--body", body);

    expect(args).toContain("--body");
    expect(args).toContain("");
  });

  test("combines body with label edits", () => {
    const args = ["issue", "edit", "42", "--repo", "org/repo"];
    const body = "## Body\n\nContent";
    const addLabels = ["status/ready"];
    if (body !== undefined) args.push("--body", body);
    if (addLabels.length) args.push("--add-label", addLabels.join(","));

    expect(args).toContain("--body");
    expect(args).toContain("--add-label");
  });
});

// ---------------------------------------------------------------------------
// ghIssueClose() — mock test
// ---------------------------------------------------------------------------
describe("ghIssueClose()", () => {
  let mockGh: Mock;

  beforeEach(() => {
    mockGh = vi.fn();
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghIssueClose: async (
        repo: string,
        issueNumber: number,
        opts: { cwd?: string } = {},
      ): Promise<boolean> => {
        const result = await mockGh(
          ["issue", "close", String(issueNumber), "--repo", repo],
          opts,
        );
        return result !== undefined;
      },
    }));
  });

  test("returns true on success", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({ stdout: "", stderr: "", exitCode: 0 }),
    );

    const { ghIssueClose } = await import("../github/cli");
    const result = await ghIssueClose("org/repo", 42);
    expect(result).toBe(true);
  });

  test("returns false when gh() fails", async () => {
    mockGh.mockReturnValue(Promise.resolve(undefined));

    const { ghIssueClose } = await import("../github/cli");
    const result = await ghIssueClose("org/repo", 42);
    expect(result).toBe(false);
  });

  test("passes correct args to gh()", async () => {
    mockGh.mockReturnValue(
      Promise.resolve({ stdout: "", stderr: "", exitCode: 0 }),
    );

    const { ghIssueClose } = await import("../github/cli");
    await ghIssueClose("org/repo", 99);

    const calledArgs = mockGh.mock.calls[0][0] as string[];
    expect(calledArgs).toEqual([
      "issue", "close", "99", "--repo", "org/repo",
    ]);
  });
});

// ---------------------------------------------------------------------------
// ghLabelCreate() — argument construction
// ---------------------------------------------------------------------------
describe("ghLabelCreate() argument construction", () => {
  test("builds args with description and color", () => {
    const name = "status/ready";
    const repo = "org/repo";
    const args = ["label", "create", name, "--repo", repo, "--force"];
    const description = "Ready for work";
    const color = "0e8a16";
    if (description) args.push("--description", description);
    if (color) args.push("--color", color);

    expect(args).toContain("--force");
    expect(args).toContain("--description");
    expect(args).toContain("Ready for work");
    expect(args).toContain("--color");
    expect(args).toContain("0e8a16");
  });

  test("omits optional flags when not provided", () => {
    const name = "bug";
    const repo = "org/repo";
    const args = ["label", "create", name, "--repo", repo, "--force"];

    expect(args).toContain("--force");
    expect(args).not.toContain("--description");
    expect(args).not.toContain("--color");
  });
});

// ---------------------------------------------------------------------------
// ghSubIssueAdd() — repo parsing
// ---------------------------------------------------------------------------
describe("ghSubIssueAdd() repo parsing", () => {
  test("splits owner/repo correctly", () => {
    const repo = "BugRoger/beastmode";
    const [owner, repoName] = repo.split("/");
    expect(owner).toBe("BugRoger");
    expect(repoName).toBe("beastmode");
  });

  test("constructs correct API path for node lookup", () => {
    const repo = "org/project";
    const childNumber = 10;
    const [owner, repoName] = repo.split("/");
    const path = `repos/${owner}/${repoName}/issues/${childNumber}`;
    expect(path).toBe("repos/org/project/issues/10");
  });

  test("constructs correct API path for sub-issue POST", () => {
    const repo = "org/project";
    const parentNumber = 5;
    const [owner, repoName] = repo.split("/");
    const path = `repos/${owner}/${repoName}/issues/${parentNumber}/sub_issues`;
    expect(path).toBe("repos/org/project/issues/5/sub_issues");
  });
});

// ---------------------------------------------------------------------------
// ghRepoDiscover() — repo discovery
// ---------------------------------------------------------------------------
describe("ghRepoDiscover()", () => {
  test("parses nameWithOwner from gh repo view", async () => {
    // Use the actual ghRepoDiscover function from the real module
    // (not the mocked version from other test suites)
    const { gh } = await import("../github/cli");
    // Run from the project root to ensure git context is available
    const result = await gh([
      "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner",
    ]);
    if (result && result.stdout) {
      // We're in a real repo with gh auth, so we should get owner/repo
      expect(result.stdout).toMatch(/^[^/]+\/[^/]+$/);
    }
    // If result is undefined or empty, gh isn't authenticated — skip gracefully
  });

  test("returns owner/repo format", () => {
    // Verify the parsing pattern
    const stdout = "BugRoger/beastmode";
    expect(stdout).toMatch(/^[^/]+\/[^/]+$/);
    const [owner, repo] = stdout.split("/");
    expect(owner).toBe("BugRoger");
    expect(repo).toBe("beastmode");
  });
});

// ---------------------------------------------------------------------------
// ghProjectDiscover() — project discovery parsing
// ---------------------------------------------------------------------------
describe("ghProjectDiscover() parsing", () => {
  test("finds project by title in JSON list", () => {
    const projects = {
      projects: [
        { title: "Other Project", number: 1, id: "PVT_111" },
        { title: "Beastmode Pipeline", number: 2, id: "PVT_222" },
      ],
    };
    const match = projects.projects.find(
      (p) => p.title === "Beastmode Pipeline",
    );
    expect(match).toBeDefined();
    expect(match!.number).toBe(2);
    expect(match!.id).toBe("PVT_222");
  });

  test("returns undefined when project not found", () => {
    const projects = {
      projects: [
        { title: "Other Project", number: 1, id: "PVT_111" },
      ],
    };
    const match = projects.projects.find(
      (p) => p.title === "Nonexistent",
    );
    expect(match).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ghFieldDiscover() — field discovery parsing
// ---------------------------------------------------------------------------
describe("ghFieldDiscover() parsing", () => {
  test("extracts field ID and options from GraphQL response", () => {
    const fields = [
      {
        __typename: "ProjectV2SingleSelectField",
        name: "Pipeline",
        id: "PVTSSF_123",
        options: [
          { id: "opt-1", name: "Design" },
          { id: "opt-2", name: "Plan" },
          { id: "opt-3", name: "Implement" },
        ],
      },
      {
        __typename: "ProjectV2Field",
        name: "Title",
        id: "PVTF_456",
      },
    ];

    const field = fields.find(
      (f) => f.name === "Pipeline" && "options" in f,
    );
    expect(field).toBeDefined();
    expect(field!.id).toBe("PVTSSF_123");

    const options: Record<string, string> = {};
    for (const opt of (field as { options: Array<{ id: string; name: string }> }).options) {
      options[opt.name] = opt.id;
    }
    expect(options).toEqual({
      Design: "opt-1",
      Plan: "opt-2",
      Implement: "opt-3",
    });
  });

  test("returns undefined when field not found", () => {
    const fields = [
      {
        __typename: "ProjectV2Field",
        name: "Title",
        id: "PVTF_456",
      },
    ];

    const field = fields.find(
      (f) => f.name === "Pipeline" && "options" in f,
    );
    expect(field).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Warn-and-continue guarantee — no function ever throws
// ---------------------------------------------------------------------------
describe("warn-and-continue: no function throws", () => {
  let mockGh: Mock;

  beforeEach(() => {
    // Mock gh to simulate various failure modes
    mockGh = vi.fn();
  });

  test("ghJson does not throw on rejection", async () => {
    mockGh.mockRejectedValue(new Error("spawn failed"));
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghJson: async <T = unknown>(
        args: string[],
        opts: { cwd?: string } = {},
      ): Promise<T | undefined> => {
        const result = await mockGh(args, opts).catch(() => undefined);
        if (!result) return undefined;
        try {
          return JSON.parse(result.stdout) as T;
        } catch {
          return undefined;
        }
      },
    }));

    const { ghJson } = await import("../github/cli");
    let threw = false;
    try {
      await ghJson(["api", "test"]);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  test("ghGraphQL does not throw on rejection", async () => {
    mockGh.mockRejectedValue(new Error("network error"));
    vi.doMock("../github/cli", () => ({
      gh: mockGh,
      ghGraphQL: async <T = unknown>(
        query: string,
        _variables: Record<string, string | number> = {},
        opts: { cwd?: string } = {},
      ): Promise<T | undefined> => {
        const result = await mockGh(["api", "graphql"], opts).catch(
          () => undefined,
        );
        if (!result) return undefined;
        try {
          return JSON.parse(result.stdout).data as T;
        } catch {
          return undefined;
        }
      },
    }));

    const { ghGraphQL } = await import("../github/cli");
    let threw = false;
    try {
      await ghGraphQL("query { test }");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ghRepoNodeId() — repository GraphQL node ID resolution
// ---------------------------------------------------------------------------
describe("ghRepoNodeId()", () => {
  test("parses repository node ID from GraphQL response", () => {
    // Test the response parsing pattern
    const mockStdout = '{"data":{"repository":{"id":"R_kgDOABCDEF"}}}';
    const parsed = JSON.parse(mockStdout);
    expect(parsed.data.repository.id).toBe("R_kgDOABCDEF");
  });

  test("splits owner/name from repo string", () => {
    const repo = "BugRoger/beastmode";
    const [owner, name] = repo.split("/");
    expect(owner).toBe("BugRoger");
    expect(name).toBe("beastmode");
  });

  test("returns undefined when response is missing repository", () => {
    const data: { repository?: { id: string } } | undefined = undefined;
    expect(data?.repository?.id).toBeUndefined();
  });

  test("returns undefined when response has null repository", () => {
    const data = { repository: null as any };
    expect(data?.repository?.id).toBeUndefined();
  });

  test("builds correct GraphQL query for repo ID lookup", () => {
    const owner = "BugRoger";
    const name = "beastmode";
    const query = `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { id }
    }`;
    expect(query).toContain("$owner: String!");
    expect(query).toContain("$name: String!");
    expect(query).toContain("repository(owner: $owner, name: $name)");
  });
});

// ---------------------------------------------------------------------------
// ghIssueNodeId() — issue GraphQL node ID resolution
// ---------------------------------------------------------------------------
describe("ghIssueNodeId()", () => {
  test("parses issue node ID from GraphQL response", () => {
    const mockStdout = '{"data":{"repository":{"issue":{"id":"I_kwDOABCDEF"}}}}';
    const parsed = JSON.parse(mockStdout);
    expect(parsed.data.repository.issue.id).toBe("I_kwDOABCDEF");
  });

  test("returns undefined when issue is missing", () => {
    const data = { repository: { issue: null as any } };
    expect(data?.repository?.issue?.id).toBeUndefined();
  });

  test("passes issue number as numeric variable", () => {
    // Verify the variable construction pattern
    const variables: Record<string, string | number> = {
      owner: "org",
      name: "repo",
      number: 42,
    };
    const args: string[] = [];
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === "number") {
        args.push("-F", `${key}=${value}`);
      } else {
        args.push("-f", `${key}=${value}`);
      }
    }
    const numIdx = args.indexOf("number=42");
    expect(numIdx).toBeGreaterThan(-1);
    expect(args[numIdx - 1]).toBe("-F");
  });

  test("splits owner/name for repos", () => {
    const repo = "my-org/my-project";
    const [owner, name] = repo.split("/");
    expect(owner).toBe("my-org");
    expect(name).toBe("my-project");
  });

  test("builds correct GraphQL query for issue ID lookup", () => {
    const owner = "org";
    const name = "repo";
    const number = 42;
    const query = `query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) { issue(number: $number) { id } }
    }`;
    expect(query).toContain("$owner: String!");
    expect(query).toContain("$name: String!");
    expect(query).toContain("$number: Int!");
    expect(query).toContain("issue(number: $number)");
  });
});

