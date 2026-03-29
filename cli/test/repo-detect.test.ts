/**
 * Unit tests for detectRepo — git remote URL parsing.
 */

import { describe, test, expect } from "bun:test";
import { detectRepo, _parseGitUrl as parseGitUrl } from "../src/repo-detect";

describe("parseGitUrl", () => {
  test("parses HTTPS URL with .git", () => {
    expect(parseGitUrl("https://github.com/owner/repo.git")).toBe(
      "owner/repo",
    );
  });

  test("parses HTTPS URL without .git", () => {
    expect(parseGitUrl("https://github.com/owner/repo")).toBe("owner/repo");
  });

  test("parses SSH URL with .git", () => {
    expect(parseGitUrl("git@github.com:owner/repo.git")).toBe("owner/repo");
  });

  test("parses SSH URL without .git", () => {
    expect(parseGitUrl("git@github.com:owner/repo")).toBe("owner/repo");
  });

  test("returns undefined for non-GitHub URL", () => {
    expect(parseGitUrl("https://gitlab.com/owner/repo")).toBeUndefined();
  });

  test("returns undefined for garbage", () => {
    expect(parseGitUrl("not-a-url")).toBeUndefined();
  });
});

describe("detectRepo", () => {
  test("detects repo from current git directory", () => {
    const result = detectRepo(process.cwd());
    expect(result).toBeDefined();
    expect(result).toContain("/");
  });

  test("returns undefined for non-git directory", () => {
    const result = detectRepo("/tmp");
    expect(result).toBeUndefined();
  });
});
