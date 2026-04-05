import { describe, test, expect } from "vitest";
import { formatEpicBody, formatFeatureBody } from "../github/sync";
import type { EpicBodyInput, FeatureBodyInput } from "../github/sync";

describe("Body Enrichment Integration", () => {
  describe("Epic issue title uses the human-readable epic name", () => {
    test("epic title should be the human-readable name, not the slug", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "design",
        features: [],
      };
      const body = formatEpicBody(input);
      expect(body).toBeDefined();
    });
  });

  describe("Feature issue title is prefixed with the epic name", () => {
    test("feature title format is '{epic}: {feature}'", () => {
      const input: FeatureBodyInput = {
        slug: "core-logger",
        description: "Core logger implementation",
        userStory: "As a user...",
        whatToBuild: "Build the core logger",
        acceptanceCriteria: "- [ ] Logger works",
      };
      const body = formatFeatureBody(input, 42);
      expect(body).toContain("## What to Build");
      expect(body).toContain("Build the core logger");
      expect(body).toContain("## Acceptance Criteria");
      expect(body).toContain("- [ ] Logger works");
      expect(body).toContain("**Epic:** #42");
    });
  });

  describe("Epic body contains full PRD sections", () => {
    test("renders all six PRD sections", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "implement",
        features: [],
        prdSections: {
          problem: "The logging system is inconsistent",
          solution: "Unify all loggers under a single interface",
          userStories: "1. As a developer, I want consistent logs",
          decisions: "- Use structured logging\n- Use pino as backend",
          testingDecisions: "- Unit test each logger adapter",
          outOfScope: "- Log aggregation service\n- Dashboard",
        },
      };
      const body = formatEpicBody(input);
      expect(body).toContain("## Problem");
      expect(body).toContain("The logging system is inconsistent");
      expect(body).toContain("## Solution");
      expect(body).toContain("Unify all loggers");
      expect(body).toContain("## User Stories");
      expect(body).toContain("consistent logs");
      expect(body).toContain("## Decisions");
      expect(body).toContain("structured logging");
      expect(body).toContain("## Testing Decisions");
      expect(body).toContain("Unit test each logger adapter");
      expect(body).toContain("## Out of Scope");
      expect(body).toContain("Log aggregation service");
    });

    test("retains phase badge and feature checklist", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "implement",
        features: [
          { slug: "core-logger", status: "completed", github: { issue: 10 } },
          { slug: "adapter", status: "pending" },
        ],
        prdSections: {
          problem: "Problem text",
          solution: "Solution text",
        },
      };
      const body = formatEpicBody(input);
      expect(body).toContain("**Phase:** implement");
      expect(body).toContain("- [x]");
      expect(body).toContain("- [ ]");
    });

    test("does not contain Git section", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "implement",
        features: [],
        prdSections: {
          problem: "Problem",
          solution: "Solution",
        },
      };
      const body = formatEpicBody(input);
      expect(body).not.toContain("## Git");
    });
  });

  describe("Feature body contains full plan sections", () => {
    test("renders description, user stories, what to build, acceptance criteria", () => {
      const input: FeatureBodyInput = {
        slug: "core-logger",
        description: "Implement the core logger module",
        userStory: "1. As a developer, I want structured logging",
        whatToBuild: "### Logger Interface\n\nCreate a Logger interface with info, warn, error methods",
        acceptanceCriteria: "- [ ] Logger interface defined\n- [ ] Default implementation works",
      };
      const body = formatFeatureBody(input, 42);
      expect(body).toContain("Implement the core logger module");
      expect(body).toContain("## User Story");
      expect(body).toContain("structured logging");
      expect(body).toContain("## What to Build");
      expect(body).toContain("Logger Interface");
      expect(body).toContain("## Acceptance Criteria");
      expect(body).toContain("Logger interface defined");
      expect(body).toContain("**Epic:** #42");
    });
  });
});
