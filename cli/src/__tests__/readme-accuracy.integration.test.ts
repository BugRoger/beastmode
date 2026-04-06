import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("@readme-refresh README content accuracy", () => {
  const readme = readFileSync(join(__dirname, "..", "..", "..", "README.md"), "utf-8");
  const lines = readme.split("\n");

  describe("Config example uses real HITL gate names", () => {
    it("shows an hitl section with phase-level prose fields", () => {
      expect(readme).toContain("hitl:");
      // Should show at least one phase with a prose string
      expect(readme).toMatch(/hitl:[\s\S]*?(design|plan|implement|validate|release):\s*"/);
    });

    it("does not contain a gates subsection with named gate IDs", () => {
      expect(readme).not.toContain("gates:");
      expect(readme).not.toContain("existing-design-choice");
      expect(readme).not.toContain("decision-tree");
      expect(readme).not.toContain("prd-approval");
      expect(readme).not.toContain("architectural-deviation");
      expect(readme).not.toContain("blocked-task-decision");
      expect(readme).not.toContain("validation-failure");
    });
  });

  describe("Domain description matches actual directory structure", () => {
    const domainSection = readme.match(
      /Three domains[\s\S]*?(?=\n##|\n$)/
    )?.[0] ?? "";

    it("includes Research as the directory name", () => {
      expect(domainSection).toMatch(/\*\*Research\*\*/);
    });

    it("does not reference Meta as a domain directory", () => {
      expect(domainSection).not.toMatch(/\*\*Meta\*\*/);
    });
  });

  describe("README is consistent with current codebase", () => {
    it("documented config keys correspond to real config keys", () => {
      const configBlock = readme.match(/```yaml[\s\S]*?```/)?.[0] ?? "";
      expect(configBlock).toContain("hitl:");
      expect(configBlock).not.toContain("gates:");
    });

    it("documented directory names correspond to actual directories", () => {
      expect(readme).toMatch(/\*\*Artifacts\*\*/);
      expect(readme).toMatch(/\*\*Context\*\*/);
      expect(readme).toMatch(/\*\*Research\*\*/);
      expect(readme).not.toMatch(/\*\*Meta\*\*/);
    });
  });

  describe("README line count", () => {
    it("stays under 150 lines", () => {
      expect(lines.length).toBeLessThanOrEqual(150);
    });
  });
});
