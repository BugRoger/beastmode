import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("@npx-installer README documents system requirements for installation", () => {
  const readme = readFileSync(join(__dirname, "..", "..", "..", "README.md"), "utf-8");

  describe("README lists all required system prerequisites", () => {
    it("lists macOS as the supported operating system", () => {
      expect(readme.toLowerCase()).toContain("macos");
    });

    it("lists Node.js as a required dependency", () => {
      expect(readme.toLowerCase()).toMatch(/node\.?js/);
    });

    it("lists Claude Code as a required dependency", () => {
      expect(readme).toMatch(/[Cc]laude\s+[Cc]ode/);
    });

    it("lists Git as a required dependency", () => {
      expect(readme).toMatch(/\bGit\b/);
    });

    it("lists iTerm2 as a required dependency", () => {
      expect(readme).toContain("iTerm2");
    });
  });

  describe("System requirements appear before installation instructions", () => {
    it("presents system requirements before the install command", () => {
      const requirementsIndex = readme.search(/require/i);
      const installCommandIndex = readme.indexOf("npx beastmode install");
      expect(requirementsIndex).toBeGreaterThan(-1);
      expect(installCommandIndex).toBeGreaterThan(-1);
      expect(requirementsIndex).toBeLessThan(installCommandIndex);
    });
  });

  describe("Install command uses npx", () => {
    it("contains npx beastmode install command", () => {
      expect(readme).toContain("npx beastmode install");
    });

    it("does not contain claude plugin add command", () => {
      expect(readme).not.toContain("claude plugin add");
    });
  });

  describe("Uninstall section exists", () => {
    it("contains npx beastmode uninstall command", () => {
      expect(readme).toContain("npx beastmode uninstall");
    });
  });

  describe("GitHub CLI is noted as optional", () => {
    it("mentions GitHub CLI as optional", () => {
      const ghCliSection = readme.match(/[Gg]it[Hh]ub CLI[\s\S]{0,100}/)?.[0] ?? "";
      expect(ghCliSection.toLowerCase()).toMatch(/optional/i);
    });
  });
});
