import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGit = vi.hoisted(() => vi.fn(async (_args: string[], _opts?: any) => ({
  stdout: "",
  stderr: "",
  exitCode: 0,
})));

vi.mock("../git/worktree.js", () => ({
  git: mockGit,
  implBranchName: (slug: string, feature: string) => `impl/${slug}--${feature}`,
}));

import { hasRemote, pushBranches, pushTags } from "../git/push.js";

describe("git/push", () => {
  beforeEach(() => {
    mockGit.mockClear();
    mockGit.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
  });

  describe("hasRemote", () => {
    it("returns true when origin remote exists", async () => {
      mockGit.mockImplementation(async () => ({
        stdout: "https://github.com/user/repo.git",
        stderr: "",
        exitCode: 0,
      }));

      const result = await hasRemote({ cwd: "/tmp" });
      expect(result).toBe(true);
      expect(mockGit).toHaveBeenCalledWith(
        ["remote", "get-url", "origin"],
        { cwd: "/tmp", allowFailure: true },
      );
    });

    it("returns false when no origin remote", async () => {
      mockGit.mockImplementation(async () => ({
        stdout: "",
        stderr: "fatal: No such remote 'origin'",
        exitCode: 2,
      }));

      const result = await hasRemote({ cwd: "/tmp" });
      expect(result).toBe(false);
    });
  });

  describe("pushBranches", () => {
    it("pushes feature branch on non-implement phase", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "plan",
        cwd: "/tmp",
      });

      expect(mockGit).toHaveBeenCalledWith(
        ["push", "origin", "feature/my-epic"],
        expect.objectContaining({ cwd: "/tmp", allowFailure: true }),
      );
    });

    it("pushes both feature and impl branch on implement phase with featureSlug", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "implement",
        featureSlug: "my-feature",
        cwd: "/tmp",
      });

      const calls = mockGit.mock.calls;
      const pushCalls = calls.filter(([args]) => args[0] === "push");
      expect(pushCalls).toHaveLength(2);
      expect(pushCalls[0][0]).toEqual(["push", "origin", "feature/my-epic"]);
      expect(pushCalls[1][0]).toEqual(["push", "origin", "impl/my-epic--my-feature"]);
    });

    it("pushes only feature branch on implement phase without featureSlug", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "implement",
        cwd: "/tmp",
      });

      const calls = mockGit.mock.calls;
      const pushCalls = calls.filter(([args]) => args[0] === "push");
      expect(pushCalls).toHaveLength(1);
      expect(pushCalls[0][0]).toEqual(["push", "origin", "feature/my-epic"]);
    });

    it("pushes feature branch on release phase", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "release",
        cwd: "/tmp",
      });

      const calls = mockGit.mock.calls;
      const pushCalls = calls.filter(([args]) => args[0] === "push");
      expect(pushCalls).toHaveLength(1);
      expect(pushCalls[0][0]).toEqual(["push", "origin", "feature/my-epic"]);
    });
  });

  describe("pushTags", () => {
    it("pushes all tags", async () => {
      await pushTags({ cwd: "/tmp" });

      expect(mockGit).toHaveBeenCalledWith(
        ["push", "origin", "--tags"],
        expect.objectContaining({ cwd: "/tmp", allowFailure: true }),
      );
    });
  });
});
