/**
 * Cucumber World for spring-cleaning integration tests.
 *
 * Structural verification approach: reads source files and checks for
 * presence/absence of code patterns. No runtime behavior testing — these
 * scenarios verify that removed code is truly gone.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const CLI_SRC = resolve(import.meta.dirname, "../../src");
const CLI_ROOT = resolve(import.meta.dirname, "../..");
const PROJECT_ROOT = resolve(import.meta.dirname, "../../../..");

export class SpringCleaningWorld extends World {
  // ---- Source contents (loaded on demand) ----
  factorySource = "";
  typesSource = "";
  configSource = "";
  watchSource = "";
  dashboardSource = "";
  indexSource = "";
  cmuxExists = false;

  // ---- Dispatch strategy query results ----
  availableStrategies: string[] = [];

  // ---- Config loading results ----
  configLoadError?: Error;
  configLoadResult?: Record<string, unknown>;

  // ---- File scan results ----
  testFiles: string[] = [];
  knowledgeFiles: Map<string, string> = new Map();
  contextFiles: Map<string, string> = new Map();
  designFiles: Map<string, string> = new Map();

  // ---- CLI command results ----
  cliCommands: string[] = [];

  setup(): void {
    // Load dispatch module sources
    this.factorySource = this.safeRead(resolve(CLI_SRC, "dispatch/factory.ts"));
    this.typesSource = this.safeRead(resolve(CLI_SRC, "dispatch/types.ts"));
    this.configSource = this.safeRead(resolve(CLI_SRC, "config.ts"));
    this.watchSource = this.safeRead(resolve(CLI_SRC, "commands/watch.ts"));
    this.dashboardSource = this.safeRead(resolve(CLI_SRC, "commands/dashboard.ts"));
    this.indexSource = this.safeRead(resolve(CLI_SRC, "index.ts"));
    this.cmuxExists = existsSync(resolve(CLI_SRC, "dispatch/cmux.ts"));

    // Scan test files
    this.testFiles = this.findTestFiles(resolve(CLI_SRC, "__tests__"));

    // Scan CLI commands from index.ts
    this.cliCommands = this.extractCliCommands();
  }

  private safeRead(path: string): string {
    try {
      return readFileSync(path, "utf-8");
    } catch {
      return "";
    }
  }

  private findTestFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        files.push(entry.name);
      }
    }
    return files;
  }

  private extractCliCommands(): string[] {
    // Parse index.ts for registered commands
    const commands: string[] = [];
    const commandPattern = /["'](\w+)["']\s*(?:=>|:)/g;
    let match: RegExpExecArray | null;
    while ((match = commandPattern.exec(this.indexSource)) !== null) {
      commands.push(match[1]);
    }
    return commands;
  }

  // ---- Query helpers ----

  /** Check if a strategy name appears in selectStrategy or config types. */
  strategyIsAvailable(name: string): boolean {
    // Check if the strategy appears in the DispatchStrategy type union
    const typePattern = new RegExp(`["']${name}["']`, "i");
    return typePattern.test(this.configSource) && typePattern.test(this.watchSource);
  }

  /** Check if factory.ts exports a given identifier. */
  factoryExports(name: string): boolean {
    return this.factorySource.includes(`export class ${name}`) ||
           this.factorySource.includes(`export interface ${name}`) ||
           this.factorySource.includes(`export type ${name}`) ||
           this.factorySource.includes(`export function ${name}`);
  }

  /** Check if types.ts contains a field name in an interface. */
  typeHasField(typeName: string, fieldName: string): boolean {
    // Find the interface block and check for the field
    const interfacePattern = new RegExp(
      `interface\\s+${typeName}\\s*\\{([^}]+)\\}`,
      "s",
    );
    const match = interfacePattern.exec(this.typesSource + this.factorySource);
    if (!match) return false;
    return match[1].includes(`${fieldName}`);
  }

  /** Check if a test file exists matching a pattern. */
  hasTestFile(pattern: string): boolean {
    return this.testFiles.some((f) => f.toLowerCase().includes(pattern.toLowerCase()));
  }

  /** Read test file contents to check imports. */
  getTestFileContents(fileName: string): string {
    return this.safeRead(resolve(CLI_SRC, "__tests__", fileName));
  }

  /** Scan knowledge files for a pattern. */
  scanKnowledgeForPattern(pattern: string): boolean {
    const knowledgeDirs = [
      resolve(PROJECT_ROOT, ".beastmode/context"),
    ];
    for (const dir of knowledgeDirs) {
      if (!existsSync(dir)) continue;
      const files = this.scanDirRecursive(dir);
      for (const file of files) {
        const content = this.safeRead(file);
        if (new RegExp(pattern, "i").test(content)) return true;
      }
    }
    return false;
  }

  /** Scan design docs for a pattern. */
  scanDesignDocsForPattern(pattern: string): boolean {
    const designDir = resolve(PROJECT_ROOT, ".beastmode/artifacts/design");
    if (!existsSync(designDir)) return false;
    const files = readdirSync(designDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = this.safeRead(resolve(designDir, file));
      // Skip the spring-cleaning design doc itself (it documents what we're removing)
      if (file.includes("spring-cleaning")) continue;
      if (new RegExp(pattern, "i").test(content)) return true;
    }
    return false;
  }

  private scanDirRecursive(dir: string): string[] {
    const results: string[] = [];
    if (!existsSync(dir)) return results;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.scanDirRecursive(fullPath));
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".ts")) {
        results.push(fullPath);
      }
    }
    return results;
  }
}

setWorldConstructor(SpringCleaningWorld);
