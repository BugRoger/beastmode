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

    it("links only feature branch during implement phase", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

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

    it("links only feature branch when no feature issue number", async () => {
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

      const gitCalls = mockGit.mock.calls;
      const deleteCall = gitCalls.find(
        (call: any) => call[0][0] === "push" && call[0].includes("--delete"),
      );
      expect(deleteCall).toBeDefined();
    });

    it("continues when repo node ID resolution fails", async () => {
      mockGhRepoNodeId.mockResolvedValue(undefined);

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
