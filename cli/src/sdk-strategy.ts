/**
 * SDK-based session strategy — dispatches phases via Claude Agent SDK
 * with Bun.spawn CLI fallback.
 *
 * Extracted from the inline dispatch logic in watch-command.ts.
 */

import type {
  SessionStrategy,
  DispatchOptions,
  DispatchHandle,
} from "./session-strategy.js";
import type { SessionResult } from "./watch-types.js";
import * as worktree from "./worktree.js";

export class SdkStrategy implements SessionStrategy {
  private completed = new Set<string>();

  async dispatch(opts: DispatchOptions): Promise<DispatchHandle> {
    const worktreeSlug = opts.featureSlug
      ? `${opts.epicSlug}-${opts.featureSlug}`
      : opts.epicSlug;

    // Create worktree
    const wt = await worktree.create(worktreeSlug, { cwd: opts.projectRoot });

    const id = `${worktreeSlug}-${Date.now()}`;
    const startTime = Date.now();

    const promise = (async (): Promise<SessionResult> => {
      let sessionResult: SessionResult;

      try {
        // Try to use the Claude Agent SDK
        const sdk = await import("@anthropic-ai/claude-agent-sdk");
        const AgentClass =
          (sdk as Record<string, unknown>).ClaudeAgent ??
          (sdk as Record<string, unknown>).default;
        if (typeof AgentClass !== "function")
          throw new Error("SDK not available");
        const prompt = `/beastmode:${opts.phase} ${opts.args.join(" ")}`;

        const agent = new (
          AgentClass as new (opts: Record<string, unknown>) => {
            query: () => Promise<{ exitCode: number; costUsd?: number }>;
          }
        )({
          cwd: wt.path,
          prompt,
          settingSources: ["project"],
          permissionMode: "bypassPermissions",
          abortSignal: opts.signal,
        });

        const result = await agent.query();

        sessionResult = {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          costUsd: result.costUsd ?? 0,
          durationMs: Date.now() - startTime,
        };
      } catch {
        // SDK not available — fall back to Bun.spawn of claude CLI
        const args = [
          "claude",
          "--print",
          `/beastmode:${opts.phase} ${opts.args.join(" ")}`,
          "--output-format",
          "json",
          "--dangerously-skip-permissions",
        ];

        const proc = Bun.spawn(args, {
          cwd: wt.path,
          stdout: "pipe",
          stderr: "pipe",
          signal: opts.signal,
        });

        const [stdout] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
        ]);

        const exitCode = await proc.exited;

        // Try to parse cost from JSON output
        let costUsd = 0;
        try {
          const output = JSON.parse(stdout);
          costUsd = output.cost_usd ?? 0;
        } catch {
          // Non-JSON output — no cost info
        }

        sessionResult = {
          success: exitCode === 0,
          exitCode,
          costUsd,
          durationMs: Date.now() - startTime,
        };
      }

      // Release teardown: archive, merge, remove on success
      if (opts.phase === "release" && sessionResult.success) {
        try {
          console.log(
            `[watch] ${opts.epicSlug}: release teardown — archiving branch...`,
          );
          const tagName = await worktree.archive(worktreeSlug, {
            cwd: opts.projectRoot,
          });
          console.log(`[watch] ${opts.epicSlug}: archived as ${tagName}`);

          await worktree.merge(worktreeSlug, { cwd: opts.projectRoot });
          console.log(`[watch] ${opts.epicSlug}: squash-merged to main`);

          await worktree.remove(worktreeSlug, { cwd: opts.projectRoot });
          console.log(`[watch] ${opts.epicSlug}: worktree removed`);
        } catch (err) {
          console.error(
            `[watch] ${opts.epicSlug}: release teardown failed:`,
            err,
          );
          console.error(
            `[watch] ${opts.epicSlug}: worktree preserved for manual cleanup`,
          );
        }
      }

      this.completed.add(id);
      return sessionResult;
    })();

    return { id, worktreeSlug, promise };
  }

  isComplete(id: string): boolean {
    return this.completed.has(id);
  }

  async cleanup(id: string): Promise<void> {
    this.completed.delete(id);
  }
}
