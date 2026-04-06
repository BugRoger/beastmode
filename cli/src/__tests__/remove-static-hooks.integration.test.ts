import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

describe("Plugin Stop hook removal for non-beastmode projects", () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(__dirname, "../../..");

  it("Plugin has no Stop hook declaration", () => {
    const hooksPath = resolve(repoRoot, "hooks/hooks.json");
    const hooks = JSON.parse(readFileSync(hooksPath, "utf-8"));
    expect(hooks.hooks.Stop).toBeUndefined();
  });

  it("Plugin has no static PreToolUse hook declaration for HITL", () => {
    const hooksPath = resolve(repoRoot, "hooks/hooks.json");
    const hooks = JSON.parse(readFileSync(hooksPath, "utf-8"));
    if (hooks.hooks.PreToolUse) {
      const askUserHooks = hooks.hooks.PreToolUse.filter(
        (entry: any) =>
          entry.matcher === "AskUserQuestion" ||
          (entry.hooks &&
            entry.hooks.some((h: any) =>
              h.command?.includes("AskUserQuestion")
            ))
      );
      expect(askUserHooks).toHaveLength(0);
    }
  });

  it("Project settings has no Stop hook declaration", () => {
    const settingsPath = resolve(repoRoot, ".claude/settings.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.hooks?.Stop).toBeUndefined();
  });

  it("hooks/hooks.json is valid JSON", () => {
    const hooksPath = resolve(repoRoot, "hooks/hooks.json");
    expect(() => JSON.parse(readFileSync(hooksPath, "utf-8"))).not.toThrow();
  });

  it(".claude/settings.json is valid JSON", () => {
    const settingsPath = resolve(repoRoot, ".claude/settings.json");
    expect(() =>
      JSON.parse(readFileSync(settingsPath, "utf-8"))
    ).not.toThrow();
  });
});
