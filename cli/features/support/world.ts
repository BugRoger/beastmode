/**
 * Cucumber World — shared test state for pipeline integration tests.
 *
 * Creates a real temporary git repository with .beastmode/ structure.
 * Provides artifact writers that simulate what Claude skills produce.
 * The only mock is the dispatch function; everything else runs for real.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { mkdtemp, rm } from "node:fs/promises";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { git } from "../../src/git/worktree.js";
import { JsonFileStore } from "../../src/store/json-file-store.js";
import { generateAll } from "../../src/hooks/generate-output.js";
import { run } from "../../src/pipeline/runner.js";
import { createNullLogger } from "../../src/logger.js";
import type { BeastmodeConfig } from "../../src/config.js";
import type { PipelineConfig, PipelineResult } from "../../src/pipeline/runner.js";
import type { Phase, PhaseResult } from "../../src/types.js";

export class PipelineWorld extends World {
  projectRoot!: string;
  epicSlug!: string;
  worktreePath!: string;
  config!: BeastmodeConfig;
  lastResult!: PipelineResult | null;

  /** Deferred artifact writer — set before pipeline run, called by dispatch with worktree cwd. */
  pendingWriter: ((cwd: string) => void) | null = null;

  async setup(): Promise<void> {
    this.projectRoot = await mkdtemp(join(tmpdir(), "beastmode-cucumber-"));
    this.lastResult = null;

    // Initialize git repo
    await git(["init", "-b", "main"], { cwd: this.projectRoot });
    await git(["config", "user.email", "test@test.com"], { cwd: this.projectRoot });
    await git(["config", "user.name", "Test"], { cwd: this.projectRoot });

    // Initial commit so HEAD exists
    writeFileSync(join(this.projectRoot, "README.md"), "# Test repo\n");
    await git(["add", "."], { cwd: this.projectRoot });
    await git(["commit", "-m", "initial commit"], { cwd: this.projectRoot });

    // Create .beastmode/ directory structure
    const beastDir = join(this.projectRoot, ".beastmode");
    const dirs = [
      "state",
      "artifacts/design",
      "artifacts/plan",
      "artifacts/implement",
      "artifacts/validate",
      "artifacts/release",
    ];
    for (const d of dirs) {
      mkdirSync(join(beastDir, d), { recursive: true });
    }

    // Write config with GitHub disabled
    writeFileSync(
      join(beastDir, "config.yaml"),
      [
        "github:",
        "  enabled: false",
        "cli:",
        "  dispatch-strategy: sdk",
        "  interval: 60",
        "hitl:",
        '  model: "haiku"',
        "  timeout: 30",
        '  design: "always defer to human"',
        '  plan: "auto-answer all questions"',
        '  implement: "auto-answer all questions"',
        '  validate: "auto-answer all questions"',
        '  release: "auto-answer all questions"',
        "file-permissions:",
        "  timeout: 30",
        '  claude-settings: "always defer to human"',
      ].join("\n") + "\n",
    );

    // Commit beastmode structure
    await git(["add", "."], { cwd: this.projectRoot });
    await git(["commit", "-m", "add beastmode structure"], { cwd: this.projectRoot });

    // Load config
    this.config = {
      github: { enabled: false },
      cli: { interval: 60 },
      hitl: {
        timeout: 30,
        design: "always defer to human",
        plan: "auto-answer all questions",
        implement: "auto-answer all questions",
        validate: "auto-answer all questions",
        release: "auto-answer all questions",
      },
      "file-permissions": {
        timeout: 30,
        "claude-settings": "always defer to human",
      },
    };
  }

  async teardown(): Promise<void> {
    if (this.projectRoot) {
      await rm(this.projectRoot, { recursive: true, force: true });
    }
  }

  // -- Artifact writers --

  writeDesignArtifact(wtPath: string, fields: Record<string, string>): void {
    const date = new Date().toISOString().slice(0, 10);
    const slug = fields.slug ?? this.epicSlug;
    const dir = join(wtPath, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });

    const frontmatter = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    writeFileSync(
      join(dir, `${date}-${slug}.md`),
      `---\n${frontmatter}\n---\n\n# ${fields.epic ?? slug}\n\nDesign document.\n`,
    );
  }

  writePlanArtifacts(
    wtPath: string,
    epicSlug: string,
    features: Array<{ feature: string; wave: number; description: string }>,
  ): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "plan");
    mkdirSync(dir, { recursive: true });

    for (const f of features) {
      const frontmatter = [
        `phase: plan`,
        `slug: ${epicSlug}`,
        `epic: ${epicSlug}`,
        `feature: ${f.feature}`,
        `wave: ${f.wave}`,
        `description: ${f.description}`,
      ].join("\n");

      writeFileSync(
        join(dir, `${date}-${epicSlug}-${f.feature}.md`),
        `---\n${frontmatter}\n---\n\n# ${f.feature}\n\nFeature plan.\n`,
      );
    }
  }

  writeImplementArtifact(wtPath: string, epicSlug: string, featureSlug: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "implement");
    mkdirSync(dir, { recursive: true });

    const frontmatter = [
      `phase: implement`,
      `slug: ${epicSlug}`,
      `epic: ${epicSlug}`,
      `feature: ${featureSlug}`,
      `status: completed`,
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}-${featureSlug}.md`),
      `---\n${frontmatter}\n---\n\n# ${featureSlug}\n\nImplementation deviation log.\n`,
    );
  }

  writeValidateArtifact(wtPath: string, epicSlug: string, status: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "validate");
    mkdirSync(dir, { recursive: true });

    const frontmatter = [
      `phase: validate`,
      `slug: ${epicSlug}`,
      `epic: ${epicSlug}`,
      `status: ${status}`,
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}.md`),
      `---\n${frontmatter}\n---\n\n# Validation Report\n\nAll gates passed.\n`,
    );
  }

  writeValidateArtifactWithFailures(
    wtPath: string,
    epicSlug: string,
    results: Array<{ feature: string; result: string }>,
  ): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "validate");
    mkdirSync(dir, { recursive: true });

    const failedFeatures = results
      .filter((r) => r.result === "failed")
      .map((r) => r.feature);

    const allPassed = failedFeatures.length === 0;

    const frontmatter = [
      `phase: validate`,
      `slug: ${epicSlug}`,
      `epic: ${epicSlug}`,
      `status: ${allPassed ? "passed" : "failed"}`,
      ...(failedFeatures.length > 0
        ? [`failedFeatures: ${failedFeatures.join(",")}`]
        : []),
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}.md`),
      `---\n${frontmatter}\n---\n\n# Validation Report\n\n## Results\n${results.map((r) => `- ${r.feature}: ${r.result}`).join("\n")}\n`,
    );
  }

  writeReleaseArtifact(wtPath: string, epicSlug: string, bump: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const dir = join(wtPath, ".beastmode", "artifacts", "release");
    mkdirSync(dir, { recursive: true });

    const frontmatter = [
      `phase: release`,
      `slug: ${epicSlug}`,
      `epic: ${epicSlug}`,
      `bump: ${bump}`,
    ].join("\n");

    writeFileSync(
      join(dir, `${date}-${epicSlug}.md`),
      `---\n${frontmatter}\n---\n\n# Release Notes\n\n## Features\n\n- Widget auth via OAuth2\n`,
    );
  }

  // -- Stop hook --

  runStopHook(wtPath: string): void {
    const artifactsDir = join(wtPath, ".beastmode", "artifacts");
    const worktreeSlug = basename(wtPath);
    generateAll(artifactsDir, "all", worktreeSlug);
  }

  // -- Pipeline execution --

  makeDispatch(): PipelineConfig["dispatch"] {
    return async (opts: { phase: Phase; args: string[]; cwd: string }) => {
      // Execute the deferred writer (writes artifacts into worktree)
      if (this.pendingWriter) {
        this.pendingWriter(opts.cwd);
        this.pendingWriter = null;
      }
      // Run the stop hook to generate output.json
      this.runStopHook(opts.cwd);

      return {
        success: true,
        result: { exit_status: "success", duration_ms: 100, session_id: null } as PhaseResult,
      };
    };
  }

  async runPipeline(phase: Phase, overrides: Partial<PipelineConfig> = {}): Promise<PipelineResult> {
    const pipelineConfig: PipelineConfig = {
      phase,
      epicSlug: this.epicSlug,
      args: [],
      projectRoot: this.projectRoot,
      strategy: "interactive",
      config: this.config,
      logger: createNullLogger(),
      dispatch: this.makeDispatch(),
      ...overrides,
    };

    const result = await run(pipelineConfig);
    this.lastResult = result;

    // Track slug renames (design phase)
    if (result.epicSlug !== this.epicSlug) {
      this.epicSlug = result.epicSlug;
    }

    // Track worktree path
    this.worktreePath = result.worktreePath;

    return result;
  }
}

setWorldConstructor(PipelineWorld);
