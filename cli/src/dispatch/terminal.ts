/**
 * Cross-platform terminal session factory.
 *
 * Windows : opens a new tab in Windows Terminal (wt.exe)
 * Linux   : opens a new tab in GNOME Terminal, falling back to xterm
 *
 * Completion detection is file-based (same .output.json mechanism as the
 * iTerm2 factory). Liveness checking is skipped — the timeout handles
 * sessions that die without writing output.json.
 */

import { type FSWatcher } from "node:fs";
import { resolve } from "node:path";
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "./factory.js";
import type { SessionResult } from "./types.js";
import * as worktree from "../git/index.js";
import {
  watchForMarker,
  findOutputJson,
  findOutputJsonBroad,
  cleanupWatcher,
} from "./session-watcher.js";

export type CreateWorktreeFn = (
  slug: string,
  opts: { cwd: string },
) => Promise<{ path: string }>;

export class TerminalSessionFactory implements SessionFactory {
  private createWorktree: CreateWorktreeFn;
  private watchTimeoutMs: number;
  private resolvers = new Map<string, (result: SessionResult) => void>();
  private watchers = new Map<string, FSWatcher>();

  constructor(opts?: { watchTimeoutMs?: number; createWorktree?: CreateWorktreeFn }) {
    this.createWorktree = opts?.createWorktree ?? ((slug, o) => worktree.create(slug, o));
    this.watchTimeoutMs = opts?.watchTimeoutMs ?? 3_600_000;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const { epicSlug, phase, featureSlug, args, projectRoot } = opts;
    const startTime = Date.now();
    const worktreeSlug = epicSlug;
    const id = `term-${worktreeSlug}-${Date.now()}`;

    const wt = await this.createWorktree(worktreeSlug, { cwd: projectRoot });

    const beastmodeCmd = `beastmode ${phase} ${args.join(" ")}`.trim();
    openTerminalTab({ title: `bm-${epicSlug}`, cwd: wt.path, command: beastmodeCmd });

    const artifactDir = resolve(wt.path, ".beastmode", "artifacts", phase);
    const outputSuffix = featureSlug
      ? `-${epicSlug}--${featureSlug}.output.json`
      : `-${epicSlug}.output.json`;

    // Check for a pre-existing output.json from a prior run before wiring the watcher
    const preExisting = findOutputJson(artifactDir, startTime, outputSuffix)
      ?? (!featureSlug ? findOutputJsonBroad(artifactDir, epicSlug, startTime) : null);

    const promise = preExisting
      ? Promise.resolve<SessionResult>({
          success: false,
          exitCode: 1,
          durationMs: Date.now() - startTime,
        })
      : watchForMarker({
          sessionId: id,
          artifactDir,
          startTime,
          signal: opts.signal,
          outputSuffix,
          epicSlug,
          broadMatch: !featureSlug,
          watchTimeoutMs: this.watchTimeoutMs,
          resolvers: this.resolvers,
          watchers: this.watchers,
        });

    opts.signal.addEventListener("abort", () => {
      cleanupWatcher(id, this.watchers);
      this.resolvers.delete(id);
    }, { once: true });

    return { id, worktreeSlug, promise };
  }

  async cleanup(_epicSlug: string): Promise<void> {
    // Windows Terminal and GNOME Terminal don't expose programmatic tab-close APIs.
    // Sessions close naturally when the beastmode process exits.
  }

  async setBadgeOnContainer(_epicSlug: string, _text: string): Promise<void> {
    // Not supported on Windows Terminal or GNOME Terminal.
  }
}

/**
 * Open a new terminal tab/window running `command` in the given `cwd`.
 * Best-effort — errors are swallowed so a failed terminal open doesn't
 * abort the dispatch.
 */
function openTerminalTab(opts: { title: string; cwd: string; command: string }): void {
  const { title, cwd, command } = opts;
  try {
    if (process.platform === "win32") {
      openWindowsTerminalTab(title, cwd, command);
    } else {
      openLinuxTerminalTab(title, cwd, command);
    }
  } catch {
    // Best-effort — watcher still resolves via .output.json
  }
}

function openWindowsTerminalTab(title: string, cwd: string, command: string): void {
  const safeCwd = cwd.replace(/'/g, "''");
  const psCommand = `Set-Location '${safeCwd}'; ${command}`;

  // wt.exe is a Windows App Execution Alias and cannot be spawned directly via
  // CreateProcess — route through pwsh, which resolves App Execution Aliases.
  // Use -EncodedCommand (UTF-16LE base64) for the inner pwsh to avoid quoting
  // issues when the command travels through two shell argument parsers.
  const encoded = Buffer.from(psCommand, "utf16le").toString("base64");
  const safeTitle = title.replace(/'/g, "''");
  // -w 0 targets the existing WT window; opens a new window if none is running
  Bun.spawn(
    ["pwsh", "-NoProfile", "-WindowStyle", "Hidden", "-Command",
     `wt -w 0 new-tab --title '${safeTitle}' -- pwsh -NoExit -EncodedCommand ${encoded}`],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
}

function openLinuxTerminalTab(title: string, cwd: string, command: string): void {
  // Keep terminal open after command exits so user can inspect output
  const shellCmd = `cd '${cwd.replace(/'/g, "'\\''")}' && ${command}; exec bash`;

  const gnomeAvail = Bun.spawnSync(
    ["which", "gnome-terminal"],
    { stdout: "pipe", stderr: "pipe" },
  ).exitCode === 0;

  if (gnomeAvail) {
    Bun.spawn(
      ["gnome-terminal", "--tab", `--title=${title}`, "--", "bash", "-c", shellCmd],
      { stdio: ["ignore", "ignore", "ignore"] },
    );
    return;
  }

  // xterm fallback
  Bun.spawn(
    ["xterm", "-title", title, "-e", `bash -c '${shellCmd.replace(/'/g, "'\\''")}'`],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
}
