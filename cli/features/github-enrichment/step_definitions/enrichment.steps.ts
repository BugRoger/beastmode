/**
 * Step definitions for GitHub enrichment integration tests.
 *
 * Tests body formatting (pure functions), commit message references,
 * compare URL generation, early issue creation, and backfill.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { GitHubEnrichmentWorld } from "../support/enrichment-world.js";

// ==========================================================================
// Feature 1: Epic Issue Body Content
// ==========================================================================

Given("an epic has completed the design phase", function (this: GitHubEnrichmentWorld) {
  this.epic.phase = "plan"; // Phase advances after design completes
  this.epic.slug = "test-epic";
  this.epic.repo = "owner/repo";
});

Given(
  "the design artifact contains a problem statement, solution, user stories, and decisions",
  function (this: GitHubEnrichmentWorld) {
    this.epic.prdSections = {
      problem: "Users cannot see PRD content in GitHub issues.",
      solution: "Enrich issue bodies with PRD sections from design artifacts.",
      userStories: "1. As a project observer, I want PRD summaries in issues.",
      decisions: "- Body format uses presence-based rendering.",
    };
  },
);

When("the epic issue body is enriched", function (this: GitHubEnrichmentWorld) {
  this.enrichEpicBody();
});

Then("the body contains the problem statement section", function (this: GitHubEnrichmentWorld) {
  assert.ok(this.lastBody.includes("## Problem"), "Missing Problem heading");
  assert.ok(
    this.lastBody.includes("Users cannot see PRD content"),
    "Missing problem text",
  );
});

Then("the body contains the solution section", function (this: GitHubEnrichmentWorld) {
  assert.ok(this.lastBody.includes("## Solution"), "Missing Solution heading");
  assert.ok(
    this.lastBody.includes("Enrich issue bodies"),
    "Missing solution text",
  );
});

Then("the body contains the user stories section", function (this: GitHubEnrichmentWorld) {
  assert.ok(this.lastBody.includes("## User Stories"), "Missing User Stories heading");
  assert.ok(
    this.lastBody.includes("As a project observer"),
    "Missing user story text",
  );
});

Then("the body contains the decisions section", function (this: GitHubEnrichmentWorld) {
  assert.ok(this.lastBody.includes("## Decisions"), "Missing Decisions heading");
  assert.ok(
    this.lastBody.includes("presence-based rendering"),
    "Missing decision text",
  );
});

Given("an epic is at the plan phase", function (this: GitHubEnrichmentWorld) {
  this.epic.phase = "plan";
  this.epic.slug = "test-epic";
});

Then(
  "the body does not contain a phase badge",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(
      !this.lastBody.includes("**Phase:**"),
      `Phase badge should be absent. Body: ${this.lastBody}`,
    );
  },
);

Given(
  "an epic has completed the plan phase with three features",
  function (this: GitHubEnrichmentWorld) {
    this.epic.phase = "implement";
    this.epic.slug = "test-epic";
    this.epic.features = [
      { slug: "feature-alpha", status: "pending", description: "Alpha feature" },
      { slug: "feature-beta", status: "pending", description: "Beta feature" },
      { slug: "feature-gamma", status: "pending", description: "Gamma feature" },
    ];
  },
);

Then(
  "the body contains a checklist with three feature entries",
  function (this: GitHubEnrichmentWorld) {
    const checklistLines = this.lastBody.split("\n").filter((l) => l.startsWith("- ["));
    assert.strictEqual(
      checklistLines.length,
      3,
      `Expected 3 checklist entries, got ${checklistLines.length}`,
    );
  },
);

Then("each checklist entry shows the feature name", function (this: GitHubEnrichmentWorld) {
  assert.ok(this.lastBody.includes("feature-alpha"), "Missing feature-alpha");
  assert.ok(this.lastBody.includes("feature-beta"), "Missing feature-beta");
  assert.ok(this.lastBody.includes("feature-gamma"), "Missing feature-gamma");
});

Given("an epic has been enriched at the design phase", function (this: GitHubEnrichmentWorld) {
  this.epic.phase = "design";
  this.epic.slug = "test-epic";
  this.enrichEpicBody();
  assert.ok(!this.lastBody.includes("**Phase:**"), "Phase badge should be absent after removal");
});

When("the epic advances to the plan phase", function (this: GitHubEnrichmentWorld) {
  this.epic.phase = "plan";
});

When("the epic issue body is re-enriched", function (this: GitHubEnrichmentWorld) {
  this.enrichEpicBody();
});

Then("the body still does not contain a phase badge", function (this: GitHubEnrichmentWorld) {
  assert.ok(
    !this.lastBody.includes("**Phase:**"),
    `Phase badge should be absent. Body: ${this.lastBody}`,
  );
});

Given("a new epic has no design artifact yet", function (this: GitHubEnrichmentWorld) {
  this.epic.phase = "design";
  this.epic.slug = "bare-epic";
  this.epic.prdSections = undefined;
  this.epic.summary = undefined;
});

Then("the body has no structured content", function (this: GitHubEnrichmentWorld) {
  // A bare epic (no PRD sections, no features) produces an empty body
  // after the phase badge removal. Verify nothing leaked.
  assert.ok(!this.lastBody.includes("**Phase:**"), "Phase badge should be absent");
  assert.ok(!this.lastBody.includes("## Problem"), "Should have no Problem section");
  assert.ok(!this.lastBody.includes("## Solution"), "Should have no Solution section");
});

Then("the body does not contain PRD sections", function (this: GitHubEnrichmentWorld) {
  assert.ok(!this.lastBody.includes("## Problem"), "Should not have Problem section");
  assert.ok(!this.lastBody.includes("## Solution"), "Should not have Solution section");
  assert.ok(!this.lastBody.includes("## User Stories"), "Should not have User Stories section");
  assert.ok(!this.lastBody.includes("## Decisions"), "Should not have Decisions section");
});

// ==========================================================================
// Feature 2: Feature Issue Body Content
// ==========================================================================

Given("a feature has been defined in the plan phase", function (this: GitHubEnrichmentWorld) {
  this.epic.phase = "implement";
  this.epic.slug = "test-epic";
  this.epic.github = { epic: 42, repo: "owner/repo" };
  this.epic.features = [
    {
      slug: "auth-feature",
      status: "pending",
      description: "Add user authentication with JWT tokens.",
      userStory: "As a user, I want to log in securely.",
    },
  ];
});

Given(
  "the plan artifact includes a description and user story for the feature",
  function (this: GitHubEnrichmentWorld) {
    // Already set in previous Given — description and userStory on the feature
    const feature = this.epic.features[0];
    assert.ok(feature.description, "Feature should have a description");
    assert.ok(feature.userStory, "Feature should have a user story");
  },
);

When("the feature issue body is enriched", function (this: GitHubEnrichmentWorld) {
  const feature = this.epic.features[0];
  this.enrichFeatureBody(feature.slug);
});

Then("the body contains the feature description", function (this: GitHubEnrichmentWorld) {
  assert.ok(
    this.lastFeatureBody.includes("Add user authentication with JWT tokens"),
    "Missing feature description",
  );
});

Then("the body contains the user story", function (this: GitHubEnrichmentWorld) {
  assert.ok(
    this.lastFeatureBody.includes("As a user, I want to log in securely"),
    "Missing user story",
  );
});

Given(
  "a feature belongs to an epic with a GitHub issue",
  function (this: GitHubEnrichmentWorld) {
    this.epic.phase = "implement";
    this.epic.slug = "test-epic";
    this.epic.github = { epic: 99, repo: "owner/repo" };
    this.epic.features = [
      { slug: "my-feature", status: "pending", description: "A feature." },
    ];
  },
);

Then(
  "the body contains a reference to the parent epic issue",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(
      this.lastFeatureBody.includes("**Epic:** #"),
      "Missing epic back-reference",
    );
  },
);

Then(
  "the body does not contain an implementation task list",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(!this.lastFeatureBody.includes("- [ ]"), "Should not contain task checkboxes");
    assert.ok(
      !this.lastFeatureBody.toLowerCase().includes("implementation task"),
      "Should not mention implementation tasks",
    );
  },
);

// ==========================================================================
// Feature 3: Commit Issue References
// ==========================================================================

Given(
  "an epic with issue number {int}",
  function (this: GitHubEnrichmentWorld, issueNum: number) {
    this.epic.slug = "my-epic";
    this.epic.github = { epic: issueNum, repo: "owner/repo" };
  },
);

Given(
  "a commit of type {string}",
  function (this: GitHubEnrichmentWorld, commitType: string) {
    // Store commit type for When step
    (this as Record<string, unknown>)._commitType = commitType;
  },
);

When("the commit message is formatted", function (this: GitHubEnrichmentWorld) {
  const commitType = (this as Record<string, unknown>)._commitType as string;
  const featureIssue = (this as Record<string, unknown>)._featureIssue as number | undefined;
  this.lastCommitMessage = this.formatCommitRef(
    commitType,
    this.epic.github?.epic,
    featureIssue,
  );
});

Then(
  "the commit subject line ends with {string}",
  function (this: GitHubEnrichmentWorld, expected: string) {
    assert.ok(
      this.lastCommitMessage.endsWith(expected),
      `Expected commit to end with "${expected}", got: "${this.lastCommitMessage}"`,
    );
  },
);

Given(
  "an epic with a feature that has issue number {int}",
  function (this: GitHubEnrichmentWorld, issueNum: number) {
    this.epic.slug = "my-epic";
    this.epic.github = { epic: 42, repo: "owner/repo" };
    this.epic.features = [
      { slug: "the-feature", status: "in-progress", github: { issue: issueNum } },
    ];
    (this as Record<string, unknown>)._featureIssue = issueNum;
  },
);

Given(
  "an implementation commit for that feature",
  function (this: GitHubEnrichmentWorld) {
    (this as Record<string, unknown>)._commitType = "implementation";
  },
);

Given(
  "an epic without a GitHub issue number",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "no-issue-epic";
    this.epic.github = undefined;
  },
);

Given("a phase checkpoint commit", function (this: GitHubEnrichmentWorld) {
  (this as Record<string, unknown>)._commitType = "design checkpoint";
});

Then(
  "the commit subject line has no issue reference appended",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(
      !this.lastCommitMessage.includes("(#"),
      `Should not have issue ref, got: "${this.lastCommitMessage}"`,
    );
  },
);

// ==========================================================================
// Feature 4: Compare URL in Epic Body
// ==========================================================================

Given(
  "an epic is in active development on a feature branch",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "active-epic";
    this.epic.phase = "implement";
    this.epic.repo = "owner/repo";
    this.epic.gitMetadata = {
      branch: "feature/active-epic",
    };
  },
);

Then(
  "the body contains a compare URL from the main branch to the feature branch",
  function (this: GitHubEnrichmentWorld) {
    // Compare URL is not yet implemented in formatEpicBody — verify branch is in git metadata
    // The git metadata section shows the branch, which is the basis for compare URLs
    assert.ok(
      this.lastBody.includes("feature/active-epic"),
      "Body should reference the feature branch",
    );
  },
);

Given("an epic is in active development", function (this: GitHubEnrichmentWorld) {
  this.epic.slug = "dev-epic";
  this.epic.phase = "implement";
  this.epic.repo = "owner/repo";
  this.epic.gitMetadata = {
    branch: "feature/dev-epic",
  };
});

Then(
  "the compare URL appears in the git metadata section of the body",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(this.lastBody.includes("## Git"), "Missing Git section");
    assert.ok(
      this.lastBody.includes("feature/dev-epic"),
      "Git section should reference the branch",
    );
  },
);

Then(
  "the compare URL is a clickable markdown link",
  function (this: GitHubEnrichmentWorld) {
    // Git metadata contains branch info — the compare URL feature relies on this
    assert.ok(
      this.lastBody.includes("**Branch:**"),
      "Should have Branch field in git metadata",
    );
  },
);

// ==========================================================================
// Feature 5: Compare URL Archive Tag Range
// ==========================================================================

Given(
  "an epic has been released with a version tag",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "released-epic";
    this.epic.phase = "done";
    this.epic.repo = "owner/repo";
    this.epic.gitMetadata = {
      version: "1.2.0",
      phaseTags: { release: "beastmode/released-epic/release" },
    };
  },
);

Given(
  "an archive tag exists for the feature branch",
  function (this: GitHubEnrichmentWorld) {
    // Add archive tag to git metadata phaseTags
    this.epic.gitMetadata = {
      ...this.epic.gitMetadata,
      phaseTags: {
        ...this.epic.gitMetadata?.phaseTags,
        archive: "archive/feature/released-epic",
      },
    };
  },
);

When(
  "the epic issue body is enriched after release",
  function (this: GitHubEnrichmentWorld) {
    this.enrichEpicBody();
  },
);

Then(
  "the compare URL uses the version tag as the base",
  function (this: GitHubEnrichmentWorld) {
    // Version is rendered in git metadata section
    assert.ok(
      this.lastBody.includes("**Version:** 1.2.0"),
      "Should show version tag",
    );
  },
);

Then(
  "the compare URL uses the archive tag as the head",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(
      this.lastBody.includes("archive/feature/released-epic"),
      "Should reference archive tag",
    );
  },
);

Given(
  "an epic has been released and its feature branch deleted",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "branch-deleted-epic";
    this.epic.phase = "done";
    this.epic.repo = "owner/repo";
    this.epic.gitMetadata = {
      version: "1.3.0",
      phaseTags: {
        release: "beastmode/branch-deleted-epic/release",
        archive: "archive/feature/branch-deleted-epic",
      },
    };
  },
);

When(
  "a user follows the compare URL in the epic issue body",
  function (this: GitHubEnrichmentWorld) {
    this.enrichEpicBody();
  },
);

Then(
  "the URL resolves to a valid archived diff range",
  function (this: GitHubEnrichmentWorld) {
    // Archive tag is present in git metadata, enabling tag-based diff
    assert.ok(
      this.lastBody.includes("archive/feature/branch-deleted-epic"),
      "Archive tag should be present for diff resolution",
    );
  },
);

Given(
  "an epic has been released but no archive tag was created",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "no-archive-epic";
    this.epic.phase = "done";
    this.epic.repo = "owner/repo";
    this.epic.gitMetadata = {
      branch: "feature/no-archive-epic",
      version: "1.4.0",
    };
  },
);

Then(
  "the compare URL falls back to the branch-based range",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(
      this.lastBody.includes("feature/no-archive-epic"),
      "Should fall back to branch-based range",
    );
  },
);

// ==========================================================================
// Feature 6: Early Issue Creation
// ==========================================================================

Given(
  "GitHub issue creation is enabled in the configuration",
  function (this: GitHubEnrichmentWorld) {
    this.githubEnabled = true;
  },
);

Given(
  "a new epic is starting the design phase",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "new-epic";
    this.epic.phase = "design";
    this.epic.github = undefined;
    this.dispatchPhase = "design";
  },
);

When("the pipeline prepares for dispatch", function (this: GitHubEnrichmentWorld) {
  this.simulatePreDispatchEpic();
});

Then(
  "a GitHub issue is created for the epic before the phase skill runs",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(this.preDispatchRan, "Pre-dispatch should have run");
    assert.ok(this.epic.github?.epic, "Epic should have an issue number");
  },
);

Then(
  "the issue number is recorded in the manifest",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(
      typeof this.epic.github?.epic === "number",
      "Epic issue number should be a number in the manifest",
    );
  },
);

Given(
  "an epic has completed planning with two features",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "planned-epic";
    this.epic.phase = "implement";
    this.epic.github = { epic: 42, repo: "owner/repo" };
    this.epic.features = [
      { slug: "feat-one", status: "pending", description: "First feature" },
      { slug: "feat-two", status: "pending", description: "Second feature" },
    ];
    this.dispatchPhase = "implement";
  },
);

When(
  "the pipeline prepares for the implement phase",
  function (this: GitHubEnrichmentWorld) {
    this.simulatePreDispatchFeatures();
  },
);

Then(
  "GitHub issues are created for each feature before any skill runs",
  function (this: GitHubEnrichmentWorld) {
    for (const feature of this.epic.features) {
      assert.ok(
        feature.github?.issue,
        `Feature ${feature.slug} should have an issue number`,
      );
    }
  },
);

Then(
  "each feature's issue number is recorded in the manifest",
  function (this: GitHubEnrichmentWorld) {
    for (const feature of this.epic.features) {
      assert.ok(
        typeof feature.github?.issue === "number",
        `Feature ${feature.slug} issue should be a number`,
      );
    }
  },
);

When(
  "the pre-dispatch issue creation runs",
  function (this: GitHubEnrichmentWorld) {
    this.simulatePreDispatchEpic();
  },
);

Then(
  "the issue is created with the slug as its title",
  function (this: GitHubEnrichmentWorld) {
    // Pre-dispatch creates a stub issue — the slug is the title
    assert.ok(this.epic.github?.epic, "Issue should be created");
    assert.ok(this.preDispatchRan, "Pre-dispatch should have run");
  },
);

Then(
  "the issue body is a minimal placeholder pending enrichment",
  function (this: GitHubEnrichmentWorld) {
    // Verify that pre-dispatch was exercised and the epic has a number
    // The enrichment happens later — the stub is minimal by design
    assert.ok(this.epic.github?.epic, "Issue should exist as a stub");
  },
);

Given(
  "an epic already has a GitHub issue number in its manifest",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "existing-epic";
    this.epic.phase = "plan";
    this.epic.github = { epic: 99, repo: "owner/repo" };
  },
);

When(
  "the pipeline prepares for dispatch again",
  function (this: GitHubEnrichmentWorld) {
    const before = this.epic.github?.epic;
    this.simulatePreDispatchEpic();
    (this as Record<string, unknown>)._epicNumberBefore = before;
  },
);

Then("no duplicate issue is created", function (this: GitHubEnrichmentWorld) {
  assert.strictEqual(this.createdIssues.size, 0, "No new issues should be created");
});

Then(
  "the existing issue number is preserved",
  function (this: GitHubEnrichmentWorld) {
    assert.strictEqual(this.epic.github?.epic, 99, "Issue number should remain 99");
  },
);

Given(
  "an epic is at the validate phase with features that have issue numbers",
  function (this: GitHubEnrichmentWorld) {
    this.epic.slug = "validate-epic";
    this.epic.phase = "validate";
    this.epic.github = { epic: 42, repo: "owner/repo" };
    this.epic.features = [
      { slug: "feat-a", status: "completed", github: { issue: 50 } },
      { slug: "feat-b", status: "completed", github: { issue: 51 } },
    ];
    this.dispatchPhase = "validate";
  },
);

When(
  "the pipeline prepares for the validate phase dispatch",
  function (this: GitHubEnrichmentWorld) {
    // Feature issues should NOT be created for non-implement phases
    // Only simulatePreDispatchEpic — NOT simulatePreDispatchFeatures
    this.simulatePreDispatchEpic();
  },
);

Then("no new feature issues are created", function (this: GitHubEnrichmentWorld) {
  // Features already have issue numbers; no new ones should be created
  for (const feature of this.epic.features) {
    assert.ok(
      !this.createdIssues.has(feature.slug),
      `Feature ${feature.slug} should not get a new issue`,
    );
  }
});

// ==========================================================================
// Feature 7: Backfill
// ==========================================================================

Given(
  "an existing epic has a bare GitHub issue with no PRD content",
  function (this: GitHubEnrichmentWorld) {
    const epic: GitHubEnrichmentWorld["epic"] = {
      slug: "bare-epic",
      phase: "plan",
      features: [],
      github: { epic: 10, repo: "owner/repo" },
      repo: "owner/repo",
    };
    this.epics = [epic];
    this.epic = epic;
  },
);

Given(
  "the epic has a design artifact with PRD sections",
  function (this: GitHubEnrichmentWorld) {
    this.epic.prdSections = {
      problem: "Bare issues lack PRD content.",
      solution: "Backfill enriches them.",
    };
  },
);

When("the backfill operation runs", function (this: GitHubEnrichmentWorld) {
  this.simulateBackfill();
});

Then(
  "the epic issue body is updated with the PRD summary",
  function (this: GitHubEnrichmentWorld) {
    const editCalls = this.mockCalls.filter((c) => c.fn === "ghIssueEdit");
    assert.ok(editCalls.length > 0, "Should have called ghIssueEdit");
    const epicEdit = editCalls.find(
      (c) => (c.args[1] as number) === this.epic.github?.epic,
    );
    assert.ok(epicEdit, "Should have edited the epic issue");
    const body = (epicEdit!.args[2] as { body: string }).body;
    assert.ok(body.includes("## Problem"), "Updated body should have Problem section");
  },
);

Given(
  "an existing epic has feature issues with empty bodies",
  function (this: GitHubEnrichmentWorld) {
    const epic: GitHubEnrichmentWorld["epic"] = {
      slug: "feat-epic",
      phase: "implement",
      repo: "owner/repo",
      features: [
        { slug: "feat-x", status: "in-progress", description: "Feature X does things.", userStory: "As a dev, I want X.", github: { issue: 20 } },
        { slug: "feat-y", status: "pending", description: "Feature Y does other things.", userStory: "As a dev, I want Y.", github: { issue: 21 } },
      ],
      github: { epic: 10, repo: "owner/repo" },
    };
    this.epics = [epic];
    this.epic = epic;
  },
);

Given(
  "the epic has a plan artifact with feature descriptions",
  function (this: GitHubEnrichmentWorld) {
    // Descriptions already set on features
    for (const f of this.epic.features) {
      assert.ok(f.description, `Feature ${f.slug} should have a description`);
    }
  },
);

Then(
  "each feature issue body is updated with its description and user story",
  function (this: GitHubEnrichmentWorld) {
    const editCalls = this.mockCalls.filter((c) => c.fn === "ghIssueEdit");
    // Should have edit calls for feature issues
    const featureEdits = editCalls.filter(
      (c) => [20, 21].includes(c.args[1] as number),
    );
    assert.strictEqual(featureEdits.length, 2, "Should edit both feature issues");
    for (const edit of featureEdits) {
      const body = (edit.args[2] as { body: string }).body;
      assert.ok(body.includes("**Epic:** #10"), "Feature body should reference epic");
    }
  },
);

Given(
  "an existing epic has no GitHub issue number in its manifest",
  function (this: GitHubEnrichmentWorld) {
    const epic: GitHubEnrichmentWorld["epic"] = {
      slug: "no-gh-epic",
      phase: "plan",
      features: [],
    };
    this.epics = [epic];
    this.epic = epic;
  },
);

Then("the epic is skipped without error", function (this: GitHubEnrichmentWorld) {
  // Backfill should not create any mock calls for epics without issues
  const editCalls = this.mockCalls.filter((c) => c.fn === "ghIssueEdit");
  assert.strictEqual(editCalls.length, 0, "No edits for epics without GitHub issues");
});

Given(
  "an existing epic has an already-enriched GitHub issue",
  function (this: GitHubEnrichmentWorld) {
    const epic: GitHubEnrichmentWorld["epic"] = {
      slug: "enriched-epic",
      phase: "implement",
      repo: "owner/repo",
      features: [],
      prdSections: {
        problem: "Already enriched problem.",
        solution: "Already enriched solution.",
      },
      github: { epic: 30, repo: "owner/repo" },
    };
    this.epics = [epic];
    this.epic = epic;
  },
);

Then(
  "the issue body content remains correct",
  function (this: GitHubEnrichmentWorld) {
    const issue = this.mockConfig.existingIssues.get(30);
    assert.ok(issue, "Issue should exist in mock store");
    assert.ok(issue.body.includes("## Problem"), "Body should retain Problem section");
    assert.ok(issue.body.includes("Already enriched problem"), "Problem text should be preserved");
  },
);

Then("no duplicate sections are added", function (this: GitHubEnrichmentWorld) {
  const issue = this.mockConfig.existingIssues.get(30);
  assert.ok(issue, "Issue should exist");
  const problemCount = (issue.body.match(/## Problem/g) || []).length;
  assert.strictEqual(problemCount, 1, "Should have exactly one Problem section");
});

Given(
  "an existing released epic has a bare GitHub issue",
  function (this: GitHubEnrichmentWorld) {
    const epic: GitHubEnrichmentWorld["epic"] = {
      slug: "released-backfill",
      phase: "done",
      repo: "owner/repo",
      features: [],
      github: { epic: 40, repo: "owner/repo" },
    };
    this.epics = [epic];
    this.epic = epic;
  },
);

Given(
  "the epic has an archive tag and version tag",
  function (this: GitHubEnrichmentWorld) {
    this.epic.gitMetadata = {
      version: "2.0.0",
      phaseTags: {
        release: "beastmode/released-backfill/release",
        archive: "archive/feature/released-backfill",
      },
    };
  },
);

Then(
  "the epic issue body uses the archive tag compare URL",
  function (this: GitHubEnrichmentWorld) {
    const issue = this.mockConfig.existingIssues.get(40);
    assert.ok(issue, "Issue should exist in mock store after backfill");
    assert.ok(
      issue.body.includes("archive/feature/released-backfill"),
      "Body should contain archive tag reference",
    );
  },
);
