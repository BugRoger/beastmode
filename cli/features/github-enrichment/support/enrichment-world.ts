/**
 * Cucumber World for GitHub enrichment integration tests.
 *
 * In-memory test state — no filesystem or git needed.
 * Body formatters are pure functions called directly.
 * Sync engine is tested with injectable mock state.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import type { Phase } from "../../../src/types.js";
import type { EpicBodyInput, FeatureBodyInput } from "../../../src/github/sync.js";
import { formatEpicBody, formatFeatureBody } from "../../../src/github/sync.js";

/** Minimal manifest-like state for test scenarios. */
export interface TestEpic {
  slug: string;
  phase: Phase;
  summary?: { problem: string; solution: string };
  features: Array<{
    slug: string;
    description?: string;
    userStory?: string;
    status: "pending" | "in-progress" | "completed" | "blocked" | "cancelled";
    github?: { issue: number; bodyHash?: string };
  }>;
  prdSections?: EpicBodyInput["prdSections"];
  artifactLinks?: EpicBodyInput["artifactLinks"];
  gitMetadata?: EpicBodyInput["gitMetadata"];
  repo?: string;
  github?: { epic: number; repo: string; bodyHash?: string };
}

/** Track mock GitHub API calls. */
export interface MockCall {
  fn: string;
  args: unknown[];
}

/** Configurable mock returns for GitHub API stubs. */
export interface MockConfig {
  nextIssueNumber: number;
  issueCreateFails: boolean;
  issueEditFails: boolean;
  existingIssues: Map<number, { title: string; body: string; state: "open" | "closed"; labels: string[] }>;
}

export class GitHubEnrichmentWorld extends World {
  epic!: TestEpic;
  lastBody = "";
  lastFeatureBody = "";
  lastCommitMessage = "";
  mockCalls: MockCall[] = [];
  mockConfig: MockConfig = {
    nextIssueNumber: 42,
    issueCreateFails: false,
    issueEditFails: false,
    existingIssues: new Map(),
  };

  /** Multiple epics for backfill scenarios. */
  epics: TestEpic[] = [];

  /** Track created issues during pre-dispatch scenarios. */
  createdIssues: Map<string, number> = new Map();

  /** Track whether pre-dispatch ran. */
  preDispatchRan = false;

  /** Phase for dispatch preparation. */
  dispatchPhase: Phase = "design";

  /** GitHub enabled flag (for early creation gating). */
  githubEnabled = true;

  setup(): void {
    this.epic = {
      slug: "test-epic",
      phase: "design",
      features: [],
    };
    this.lastBody = "";
    this.lastFeatureBody = "";
    this.lastCommitMessage = "";
    this.mockCalls = [];
    this.mockConfig = {
      nextIssueNumber: 42,
      issueCreateFails: false,
      issueEditFails: false,
      existingIssues: new Map(),
    };
    this.epics = [];
    this.createdIssues = new Map();
    this.preDispatchRan = false;
    this.dispatchPhase = "design";
    this.githubEnabled = true;
  }

  teardown(): void {
    // No-op — all state is in-memory
  }

  /** Build EpicBodyInput from test state. */
  buildEpicInput(): EpicBodyInput {
    return {
      slug: this.epic.slug,
      phase: this.epic.phase,
      summary: this.epic.summary,
      features: this.epic.features,
      prdSections: this.epic.prdSections,
      artifactLinks: this.epic.artifactLinks,
      gitMetadata: this.epic.gitMetadata,
      repo: this.epic.repo,
    };
  }

  /** Enrich the epic body using formatEpicBody. */
  enrichEpicBody(): void {
    this.lastBody = formatEpicBody(this.buildEpicInput());
  }

  /** Enrich a feature body using formatFeatureBody. */
  enrichFeatureBody(featureSlug: string): void {
    const feature = this.epic.features.find((f) => f.slug === featureSlug);
    if (!feature) throw new Error(`Feature ${featureSlug} not found`);
    const epicNumber = this.epic.github?.epic ?? 42;
    this.lastFeatureBody = formatFeatureBody(
      { slug: feature.slug, description: feature.description, userStory: feature.userStory },
      epicNumber,
    );
  }

  /** Format a commit message with issue reference. */
  formatCommitRef(
    commitType: string,
    epicIssue?: number,
    featureIssue?: number,
  ): string {
    const baseMessages: Record<string, string> = {
      "design checkpoint": `design(${this.epic.slug}): checkpoint`,
      "plan checkpoint": `plan(${this.epic.slug}): checkpoint`,
      "release merge": `release(${this.epic.slug}): squash merge`,
      "implementation": `feat(${this.epic.slug}): implement task`,
    };
    const base = baseMessages[commitType] ?? `chore(${this.epic.slug}): ${commitType}`;

    if (commitType === "implementation" && featureIssue) {
      return `${base} (#${featureIssue})`;
    }
    if (epicIssue) {
      return `${base} (#${epicIssue})`;
    }
    return base;
  }

  /** Simulate pre-dispatch issue creation for an epic. */
  simulatePreDispatchEpic(): void {
    if (!this.githubEnabled) return;
    if (this.epic.github?.epic) return; // Idempotent — already has issue

    const issueNum = this.mockConfig.nextIssueNumber++;
    this.epic.github = { epic: issueNum, repo: this.epic.repo ?? "owner/repo" };
    this.createdIssues.set(this.epic.slug, issueNum);
    this.preDispatchRan = true;
  }

  /** Simulate pre-dispatch feature issue creation. */
  simulatePreDispatchFeatures(): void {
    if (!this.githubEnabled) return;

    for (const feature of this.epic.features) {
      if (feature.github?.issue) continue; // Idempotent
      const issueNum = this.mockConfig.nextIssueNumber++;
      feature.github = { issue: issueNum };
      this.createdIssues.set(feature.slug, issueNum);
    }
    this.preDispatchRan = true;
  }

  /** Simulate backfill: re-enrich all epics that have GitHub issues. */
  simulateBackfill(): void {
    for (const epic of this.epics) {
      if (!epic.github?.epic) continue; // Skip epics without issues

      // Re-enrich epic body
      const epicInput: EpicBodyInput = {
        slug: epic.slug,
        phase: epic.phase,
        summary: epic.summary,
        features: epic.features,
        prdSections: epic.prdSections,
        artifactLinks: epic.artifactLinks,
        gitMetadata: epic.gitMetadata,
        repo: epic.repo,
      };
      const body = formatEpicBody(epicInput);
      this.mockConfig.existingIssues.set(epic.github.epic, {
        title: epic.slug,
        body,
        state: "open",
        labels: [`phase/${epic.phase}`],
      });
      this.mockCalls.push({ fn: "ghIssueEdit", args: [epic.github.repo, epic.github.epic, { body }] });

      // Re-enrich feature bodies
      for (const feature of epic.features) {
        if (!feature.github?.issue) continue;
        const featureBody = formatFeatureBody(
          { slug: feature.slug, description: feature.description, userStory: feature.userStory },
          epic.github.epic,
        );
        this.mockConfig.existingIssues.set(feature.github.issue, {
          title: feature.slug,
          body: featureBody,
          state: "open",
          labels: ["type/feature"],
        });
        this.mockCalls.push({ fn: "ghIssueEdit", args: [epic.github.repo, feature.github.issue, { body: featureBody }] });
      }
    }
  }
}

setWorldConstructor(GitHubEnrichmentWorld);
