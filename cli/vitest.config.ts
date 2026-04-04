import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/__tests__/*.test.ts",
      "src/pipeline-machine/__tests__/*.test.ts",
    ],
    pool: "forks",
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 30_000,
  },
});
