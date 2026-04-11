import { describe, test, expect } from "vitest";
import { buildEnvPrefix } from "../hooks/hitl-settings";
import type { EnvPrefixContext } from "../hooks/hitl-settings";

describe("buildEnvPrefix", () => {
  test("produces 3 vars when no feature context", () => {
    const ctx: EnvPrefixContext = { phase: "design", epicId: "bm-abc", epicSlug: "my-epic-abc" };
    expect(buildEnvPrefix(ctx)).toBe("BEASTMODE_PHASE=design BEASTMODE_EPIC_ID=bm-abc BEASTMODE_EPIC_SLUG=my-epic-abc");
  });

  test("produces 5 vars when feature context present", () => {
    const ctx: EnvPrefixContext = { phase: "implement", epicId: "bm-abc", epicSlug: "my-epic-abc", featureId: "bm-abc.1", featureSlug: "auth-flow-1" };
    expect(buildEnvPrefix(ctx)).toBe("BEASTMODE_PHASE=implement BEASTMODE_EPIC_ID=bm-abc BEASTMODE_EPIC_SLUG=my-epic-abc BEASTMODE_FEATURE_ID=bm-abc.1 BEASTMODE_FEATURE_SLUG=auth-flow-1");
  });

  test("omits feature vars when only featureSlug provided", () => {
    const ctx: EnvPrefixContext = { phase: "plan", epicId: "bm-abc", epicSlug: "my-epic", featureSlug: "feat" };
    expect(buildEnvPrefix(ctx)).toBe("BEASTMODE_PHASE=plan BEASTMODE_EPIC_ID=bm-abc BEASTMODE_EPIC_SLUG=my-epic");
  });

  test("omits feature vars when only featureId provided", () => {
    const ctx: EnvPrefixContext = { phase: "plan", epicId: "bm-abc", epicSlug: "my-epic", featureId: "bm-abc.1" };
    expect(buildEnvPrefix(ctx)).toBe("BEASTMODE_PHASE=plan BEASTMODE_EPIC_ID=bm-abc BEASTMODE_EPIC_SLUG=my-epic");
  });

  test("does not include old env var names", () => {
    const ctx: EnvPrefixContext = { phase: "design", epicId: "bm-abc", epicSlug: "my-epic" };
    const result = buildEnvPrefix(ctx);
    expect(result).not.toContain("BEASTMODE_EPIC=");
    expect(result).not.toContain("BEASTMODE_SLUG=");
  });

  test("does not include feature vars when both are absent", () => {
    const ctx: EnvPrefixContext = { phase: "validate", epicId: "bm-abc", epicSlug: "my-epic" };
    const result = buildEnvPrefix(ctx);
    expect(result).not.toContain("BEASTMODE_FEATURE");
  });
});
