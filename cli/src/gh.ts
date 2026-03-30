/**
 * GitHub CLI subprocess helper — runs `gh` commands via Bun.spawn.
 *
 * All calls use warn-and-continue: failures return undefined/null
 * and log a warning to stderr. Never throws.
 */

export interface GhResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a raw `gh` command. Returns result or undefined on failure.
 * Always warn-and-continue — never throws.
 */
export async function gh(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<GhResult | undefined> {
  try {
    const proc = Bun.spawn(["gh", ...args], {
      cwd: opts.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      console.error(
        `WARNING: gh ${args[0]} failed (exit ${exitCode}): ${stderr.trim()}`,
      );
      return undefined;
    }

    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
  } catch (err) {
    console.error(
      `WARNING: gh ${args[0]} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
}

/**
 * Run a `gh` command and parse JSON output. Returns parsed object or undefined.
 */
export async function ghJson<T = unknown>(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<T | undefined> {
  const result = await gh(args, opts);
  if (!result) return undefined;
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    console.error(`WARNING: gh ${args[0]} returned non-JSON output`);
    return undefined;
  }
}

/**
 * Run a GraphQL query via `gh api graphql`.
 * Returns the parsed `.data` object or undefined.
 */
export async function ghGraphQL<T = unknown>(
  query: string,
  variables: Record<string, string | number> = {},
  opts: { cwd?: string } = {},
): Promise<T | undefined> {
  const args: string[] = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === "number") {
      args.push("-F", `${key}=${value}`);
    } else {
      args.push("-f", `${key}=${value}`);
    }
  }

  const result = await gh(args, opts);
  if (!result) return undefined;
  try {
    const parsed = JSON.parse(result.stdout);
    return parsed.data as T;
  } catch {
    console.error(`WARNING: gh api graphql returned non-JSON output`);
    return undefined;
  }
}

/**
 * Create or update a GitHub issue label. Idempotent via --force.
 */
export async function ghLabelCreate(
  repo: string,
  name: string,
  opts: { description?: string; color?: string; cwd?: string } = {},
): Promise<boolean> {
  const args = ["label", "create", name, "--repo", repo, "--force"];
  if (opts.description) args.push("--description", opts.description);
  if (opts.color) args.push("--color", opts.color);
  const result = await gh(args, { cwd: opts.cwd });
  return result !== undefined;
}

/**
 * Edit a GitHub issue — add/remove labels, close, etc.
 */
export async function ghIssueEdit(
  repo: string,
  issueNumber: number,
  edits: {
    addLabels?: string[];
    removeLabels?: string[];
    state?: "open" | "closed";
  },
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const args = ["issue", "edit", String(issueNumber), "--repo", repo];
  if (edits.addLabels?.length)
    args.push("--add-label", edits.addLabels.join(","));
  if (edits.removeLabels?.length)
    args.push("--remove-label", edits.removeLabels.join(","));
  const result = await gh(args, { cwd: opts.cwd });

  if (result !== undefined && edits.state === "closed") {
    return (
      (await gh(
        ["issue", "close", String(issueNumber), "--repo", repo],
        { cwd: opts.cwd },
      )) !== undefined
    );
  }

  return result !== undefined;
}

/**
 * Create a GitHub issue. Returns the issue number or undefined.
 */
export async function ghIssueCreate(
  repo: string,
  title: string,
  body: string,
  labels: string[] = [],
  opts: { cwd?: string } = {},
): Promise<number | undefined> {
  const args = [
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    title,
    "--body",
    body,
  ];
  for (const label of labels) {
    args.push("--label", label);
  }
  const result = await gh(args, { cwd: opts.cwd });
  if (!result) return undefined;

  // gh issue create outputs the URL, extract the number
  const match = result.stdout.match(/\/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Close a GitHub issue.
 */
export async function ghIssueClose(
  repo: string,
  issueNumber: number,
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const result = await gh(
    ["issue", "close", String(issueNumber), "--repo", repo],
    { cwd: opts.cwd },
  );
  return result !== undefined;
}

/**
 * Reopen a closed GitHub issue.
 */
export async function ghIssueReopen(
  repo: string,
  issueNumber: number,
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const result = await gh(
    ["issue", "reopen", String(issueNumber), "--repo", repo],
    { cwd: opts.cwd },
  );
  return result !== undefined;
}

/**
 * Get an issue's open/closed state. Returns undefined on failure.
 */
export async function ghIssueState(
  repo: string,
  issueNumber: number,
  opts: { cwd?: string } = {},
): Promise<"open" | "closed" | undefined> {
  const result = await ghJson<{ state: string }>(
    [
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      repo,
      "--json",
      "state",
    ],
    { cwd: opts.cwd },
  );
  if (result?.state === "OPEN") return "open";
  if (result?.state === "CLOSED") return "closed";
  return undefined;
}

/**
 * Get issue labels. Returns label names or undefined.
 */
export async function ghIssueLabels(
  repo: string,
  issueNumber: number,
  opts: { cwd?: string } = {},
): Promise<string[] | undefined> {
  const result = await ghJson<Array<{ name: string }>>(
    [
      "issue",
      "view",
      String(issueNumber),
      "--repo",
      repo,
      "--json",
      "labels",
      "--jq",
      ".labels",
    ],
    { cwd: opts.cwd },
  );
  return result?.map((l) => l.name);
}

/**
 * Add an issue to a Projects V2 board. Returns the item ID or undefined.
 */
export async function ghProjectItemAdd(
  projectNumber: number,
  owner: string,
  issueUrl: string,
  opts: { cwd?: string } = {},
): Promise<string | undefined> {
  const result = await ghJson<{ id: string }>(
    [
      "project",
      "item-add",
      String(projectNumber),
      "--owner",
      owner,
      "--url",
      issueUrl,
      "--format",
      "json",
    ],
    { cwd: opts.cwd },
  );
  return result?.id;
}

/**
 * Set a Projects V2 single-select field value via GraphQL.
 */
export async function ghProjectSetField(
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string,
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const data = await ghGraphQL(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }`,
    { projectId, itemId, fieldId, optionId },
    { cwd: opts.cwd },
  );
  return data !== undefined;
}

/**
 * Remove an item from a Projects V2 board via GraphQL.
 */
export async function ghProjectItemDelete(
  projectId: string,
  itemId: string,
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const data = await ghGraphQL(
    `mutation($projectId: ID!, $itemId: ID!) {
      deleteProjectV2Item(input: {
        projectId: $projectId
        itemId: $itemId
      }) {
        deletedItemId
      }
    }`,
    { projectId, itemId },
    { cwd: opts.cwd },
  );
  return data !== undefined;
}

// ---------------------------------------------------------------------------
// Discovery functions — runtime-discovered metadata, warn-and-continue
// ---------------------------------------------------------------------------

/**
 * Discover the current repo's owner/name from the local git remote.
 * Returns "owner/repo" or undefined.
 */
export async function ghRepoDiscover(
  opts: { cwd?: string } = {},
): Promise<string | undefined> {
  const result = await gh(
    ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
    opts,
  );
  return result?.stdout || undefined;
}

/**
 * Discover a Projects V2 board by title. Returns {number, id} or undefined.
 * Tries user scope first, then organization scope for the project ID.
 */
export async function ghProjectDiscover(
  owner: string,
  projectName: string,
  opts: { cwd?: string } = {},
): Promise<{ number: number; id: string } | undefined> {
  // Find project number by title
  const projects = await ghJson<{
    projects: Array<{ title: string; number: number; id: string }>;
  }>(["project", "list", "--owner", owner, "--format", "json"], opts);
  if (!projects?.projects) return undefined;

  const match = projects.projects.find((p) => p.title === projectName);
  if (!match) return undefined;

  // The list endpoint returns the GraphQL ID directly
  if (match.id) {
    return { number: match.number, id: match.id };
  }

  // Fallback: fetch ID via GraphQL (try user, then org)
  const id = await ghProjectIdLookup(owner, match.number, opts);
  if (!id) return undefined;

  return { number: match.number, id };
}

/**
 * Lookup project GraphQL ID by number. Tries user scope, falls back to org.
 */
async function ghProjectIdLookup(
  owner: string,
  projectNumber: number,
  opts: { cwd?: string } = {},
): Promise<string | undefined> {
  // Try user scope
  const userData = await ghGraphQL<{
    user: { projectV2: { id: string } };
  }>(
    `query($owner: String!, $number: Int!) {
      user(login: $owner) { projectV2(number: $number) { id } }
    }`,
    { owner, number: projectNumber },
    opts,
  );
  if (userData?.user?.projectV2?.id) return userData.user.projectV2.id;

  // Try org scope
  const orgData = await ghGraphQL<{
    organization: { projectV2: { id: string } };
  }>(
    `query($owner: String!, $number: Int!) {
      organization(login: $owner) { projectV2(number: $number) { id } }
    }`,
    { owner, number: projectNumber },
    opts,
  );
  return orgData?.organization?.projectV2?.id;
}

/**
 * Discover a single-select field on a Projects V2 board.
 * Returns {fieldId, options} or undefined.
 */
export async function ghFieldDiscover(
  projectId: string,
  fieldName: string,
  opts: { cwd?: string } = {},
): Promise<
  { fieldId: string; options: Record<string, string> } | undefined
> {
  const data = await ghGraphQL<{
    node: {
      fields: {
        nodes: Array<{
          __typename: string;
          name: string;
          id: string;
          options?: Array<{ id: string; name: string }>;
        }>;
      };
    };
  }>(
    `query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 30) {
            nodes {
              __typename
              ... on ProjectV2SingleSelectField {
                name
                id
                options { id name }
              }
            }
          }
        }
      }
    }`,
    { projectId },
    opts,
  );

  const fields = data?.node?.fields?.nodes;
  if (!fields) return undefined;

  const field = fields.find(
    (f) => f.name === fieldName && f.options,
  );
  if (!field?.options) return undefined;

  const options: Record<string, string> = {};
  for (const opt of field.options) {
    options[opt.name] = opt.id;
  }

  return { fieldId: field.id, options };
}

/**
 * Link an issue as a sub-issue of a parent issue.
 */
export async function ghSubIssueAdd(
  repo: string,
  parentNumber: number,
  childNumber: number,
  opts: { cwd?: string } = {},
): Promise<boolean> {
  // Get the child's database ID (integer) — the sub_issues REST API requires it, not node_id
  const [owner, repoName] = repo.split("/");
  const nodeData = await ghJson<{ id: number }>(
    [
      "api",
      `repos/${owner}/${repoName}/issues/${childNumber}`,
      "--jq",
      "{id: .id}",
    ],
    { cwd: opts.cwd },
  );
  if (!nodeData?.id) return false;

  const result = await gh(
    [
      "api",
      `repos/${owner}/${repoName}/issues/${parentNumber}/sub_issues`,
      "--method",
      "POST",
      "-F",
      `sub_issue_id=${nodeData.id}`,
    ],
    { cwd: opts.cwd },
  );
  return result !== undefined;
}
