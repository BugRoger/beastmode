import { fromPromise } from "xstate";

/**
 * Result type for GitHub sync service.
 * Mirrors the SyncResult from github-sync.ts.
 */
export interface SyncGitHubResult {
  epicCreated: boolean;
  epicNumber?: number;
  featuresCreated: number;
  featuresClosed: number;
  featuresReopened: number;
  labelsUpdated: number;
  projectUpdated: boolean;
  epicClosed: boolean;
  warnings: string[];
}

/**
 * GitHub sync service — wraps the existing syncGitHub() function.
 * Non-blocking: errors are caught internally and returned as warnings.
 *
 * The actual sync function is injected via input so the machine definition
 * stays decoupled from the filesystem/network layer.
 */
export const syncGitHubService = fromPromise<
  SyncGitHubResult,
  { syncFn?: () => Promise<SyncGitHubResult> }
>(async ({ input }) => {
  if (!input.syncFn) {
    return {
      epicCreated: false,
      featuresCreated: 0,
      featuresClosed: 0,
      featuresReopened: 0,
      labelsUpdated: 0,
      projectUpdated: false,
      epicClosed: false,
      warnings: ["No sync function provided"],
    };
  }

  try {
    return await input.syncFn();
  } catch (error) {
    return {
      epicCreated: false,
      featuresCreated: 0,
      featuresClosed: 0,
      featuresReopened: 0,
      labelsUpdated: 0,
      projectUpdated: false,
      epicClosed: false,
      warnings: [
        `GitHub sync failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
});
