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
const mockGhRepoNodeId = vi.hoisted(() => vi.fn());
const mockGhIssueNodeId = vi.hoisted(() => vi.fn());
const mockGhCreateLinkedBranch = vi.hoisted(() => vi.fn());

vi.mock("../github/cli.js", () => ({
  ghGraphQL: mockGhGraphQL,
  gh: mockGh,
  ghRepoNodeId: mockGhRepoNodeId,
  ghIssueNodeId: mockGhIssueNodeId,
  ghCreateLinkedBranch: mockGhCreateLinkedBranch,
}));

const mockGit = vi.hoisted(() => vi.fn(async () => ({ stdout: "abc123def", stderr: "", exitCode: 0 })));

vi.mock("../git/worktree.js", () => ({
  git: mockGit,
}));

describe("Branch Linking Integration", () => {
  beforeEach(() => {
    mockGhGraphQL.mockReset();
    mockGh.mockReset();
    mockGhRepoNodeId.mockReset();
    mockGhIssueNodeId.mockReset();
    mockGhCreateLinkedBranch.mockReset();
    mockGit.mockReset();
    mockGit.mockImplementation(async () => ({ stdout: "abc123def", stderr: "", exitCode: 0 }));
  });

  describe("Feature branch linked to epic issue", () => {
    test("feature branch appears in the epic issue's Development sidebar", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

      const { linkBranches } = await import("../github/branch-link.js");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        phase: "plan",
      });

      expect(mockGhCreateLinkedBranch).toHaveBeenCalledWith(
        "R_repo123",
        "I_epic456",
        "feature/my-epic",
        "abc123def",
        expect.any(Object),
      );
    });
  });

  describe("Feature branch linked during implement phase", () => {
    test("only feature branch is linked during implement phase (no impl branch)", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

      const { linkBranches } = await import("../github/branch-link.js");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        featureSlug: "my-feature",
        featureIssueNumber: 200,
        phase: "implement",
      });

      expect(mockGhCreateLinkedBranch).toHaveBeenCalledTimes(1);
      expect(mockGhCreateLinkedBranch.mock.calls[0][2]).toBe("feature/my-epic");
    });
  });

  describe("Branch linking is idempotent", () => {
    test("no duplicate link is created when branch already linked", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue(undefined); // null means already exists

      const { linkBranches } = await import("../github/branch-link.js");

      // Should not throw
      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        phase: "plan",
      });

      expect(mockGhCreateLinkedBranch).toHaveBeenCalled();
    });
  });

  describe("Branch linking skips issues without a known issue number", () => {
    test("epic is skipped without error when no issue number", async () => {
      const { linkBranches } = await import("../github/branch-link.js");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: undefined,
        phase: "plan",
      });

      expect(mockGhRepoNodeId).not.toHaveBeenCalled();
      expect(mockGhCreateLinkedBranch).not.toHaveBeenCalled();
    });
  });
});
