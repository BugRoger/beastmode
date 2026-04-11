import { describe, test, expect } from "vitest";
import { buildEnvPrefix } from "../hooks/hitl-settings";

describe("buildEnvPrefix", () => {
  test("produces 3 env vars without feature context", () => {
    const result = buildEnvPrefix({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
    });
    expect(result).toBe(
      "BEASTMODE_PHASE=design BEASTMODE_EPIC_ID=bm-f3a7 BEASTMODE_EPIC_SLUG=dashboard-redesign-f3a7"
    );
  });

  test("produces 5 env vars with feature context", () => {
    const result = buildEnvPrefix({
      phase: "implement",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
      featureId: "bm-f3a7.1",
      featureSlug: "auth-flow-1",
    });
    expect(result).toBe(
      "BEASTMODE_PHASE=implement BEASTMODE_EPIC_ID=bm-f3a7 BEASTMODE_EPIC_SLUG=dashboard-redesign-f3a7 BEASTMODE_FEATURE_ID=bm-f3a7.1 BEASTMODE_FEATURE_SLUG=auth-flow-1"
    );
  });

  test("omits feature vars when featureId is undefined", () => {
    const result = buildEnvPrefix({
      phase: "plan",
      epicId: "bm-abc1",
      epicSlug: "my-epic-abc1",
    });
    expect(result).not.toContain("BEASTMODE_FEATURE_ID");
    expect(result).not.toContain("BEASTMODE_FEATURE_SLUG");
  });

  test("omits feature vars when featureSlug is undefined", () => {
    const result = buildEnvPrefix({
      phase: "plan",
      epicId: "bm-abc1",
      epicSlug: "my-epic-abc1",
      featureId: "bm-abc1.1",
    });
    expect(result).not.toContain("BEASTMODE_FEATURE_ID");
    expect(result).not.toContain("BEASTMODE_FEATURE_SLUG");
  });

  test("does not contain old env var names", () => {
    const result = buildEnvPrefix({
      phase: "design",
      epicId: "bm-f3a7",
      epicSlug: "dashboard-redesign-f3a7",
    });
    expect(result).not.toContain("BEASTMODE_EPIC=");
    expect(result).not.toContain("BEASTMODE_SLUG=");
  });
});
