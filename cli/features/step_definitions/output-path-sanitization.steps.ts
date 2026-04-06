/**
 * Step definitions for output path sanitization integration test.
 *
 * Exercises the real buildOutput and scanPlanFeatures functions — no mocks.
 * Verifies artifact path fields contain bare filenames, never absolute paths.
 */

import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildOutput, scanPlanFeatures } from "../../src/hooks/generate-output.js";

interface OutputPathWorld {
  artifactPath: string;
  phase: string;
  output: ReturnType<typeof buildOutput>;
  artifactsDir: string;
  features: Array<{ slug: string; plan: string; wave?: number }>;
}

const TEST_ROOT = resolve(import.meta.dirname, "../../../.test-output-path-sanitization");
const ARTIFACTS_DIR = join(TEST_ROOT, ".beastmode", "artifacts");

Before(function (this: OutputPathWorld) {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  for (const phase of ["design", "plan", "implement", "validate", "release"]) {
    mkdirSync(join(ARTIFACTS_DIR, phase), { recursive: true });
  }
  this.artifactsDir = ARTIFACTS_DIR;
});

After(function () {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
});

// --- Given ---

Given("a design artifact at absolute path {string}", function (this: OutputPathWorld, path: string) {
  this.artifactPath = path;
  this.phase = "design";
});

Given("a validate artifact at absolute path {string}", function (this: OutputPathWorld, path: string) {
  this.artifactPath = path;
  this.phase = "validate";
});

Given("a release artifact at absolute path {string}", function (this: OutputPathWorld, path: string) {
  this.artifactPath = path;
  this.phase = "release";
});

Given(
  "plan artifacts exist for epic {string} with features {string} and {string}",
  function (this: OutputPathWorld, epic: string, feat1: string, feat2: string) {
    this.phase = "plan";
    for (const feat of [feat1, feat2]) {
      const filename = `2026-04-06-${epic}-${feat}.md`;
      const content = `---\nphase: plan\nepic: ${epic}\nfeature: ${feat}\n---\n# ${feat}`;
      writeFileSync(join(ARTIFACTS_DIR, "plan", filename), content);
    }
  },
);

// --- When ---

When("buildOutput processes the design artifact", function (this: OutputPathWorld) {
  this.output = buildOutput(this.artifactPath, { phase: "design", slug: "test" }, this.artifactsDir);
});

When("buildOutput processes the validate artifact", function (this: OutputPathWorld) {
  this.output = buildOutput(this.artifactPath, { phase: "validate" }, this.artifactsDir);
});

When("buildOutput processes the release artifact", function (this: OutputPathWorld) {
  this.output = buildOutput(this.artifactPath, { phase: "release" }, this.artifactsDir);
});

When("the plan features are scanned for epic {string}", function (this: OutputPathWorld, epic: string) {
  this.features = scanPlanFeatures(this.artifactsDir, epic);
});

// --- Then ---

Then("the output design artifact field is {string}", function (this: OutputPathWorld, expected: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  assert.strictEqual(artifacts.design, expected);
});

Then("the output design artifact field does not contain {string}", function (this: OutputPathWorld, char: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  const value = artifacts.design as string;
  assert.ok(!value.includes(char), `Expected design field "${value}" to not contain "${char}"`);
});

Then("the output report field is {string}", function (this: OutputPathWorld, expected: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  assert.strictEqual(artifacts.report, expected);
});

Then("the output report field does not contain {string}", function (this: OutputPathWorld, char: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  const value = artifacts.report as string;
  assert.ok(!value.includes(char), `Expected report field "${value}" to not contain "${char}"`);
});

Then("the output changelog field is {string}", function (this: OutputPathWorld, expected: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  assert.strictEqual(artifacts.changelog, expected);
});

Then("the output changelog field does not contain {string}", function (this: OutputPathWorld, char: string) {
  assert.ok(this.output, "buildOutput returned undefined");
  const artifacts = this.output.artifacts as Record<string, unknown>;
  const value = artifacts.changelog as string;
  assert.ok(!value.includes(char), `Expected changelog field "${value}" to not contain "${char}"`);
});

Then("each feature plan field is a bare filename", function (this: OutputPathWorld) {
  assert.ok(this.features.length > 0, "No features found");
  for (const feat of this.features) {
    assert.ok(!feat.plan.includes("/"), `Feature plan "${feat.plan}" contains a directory separator`);
  }
});
