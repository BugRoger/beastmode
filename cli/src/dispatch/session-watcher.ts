/**
 * Shared file-based session completion detection.
 *
 * Both ITermSessionFactory and TerminalSessionFactory use this to watch for
 * .output.json files written by beastmode phase hooks.
 */

import { watch, type FSWatcher } from "node:fs";
import { readFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { SessionResult } from "./types.js";
import { filenameMatchesEpic } from "../artifacts/index.js";

export interface WatchMarkerOpts {
  sessionId: string;
  artifactDir: string;
  startTime: number;
  signal: AbortSignal;
  outputSuffix: string;
  epicSlug: string;
  broadMatch: boolean;
  watchTimeoutMs: number;
  resolvers: Map<string, (result: SessionResult) => void>;
  watchers: Map<string, FSWatcher>;
}

export function watchForMarker(opts: WatchMarkerOpts): Promise<SessionResult> {
  const {
    sessionId, artifactDir, startTime, signal, outputSuffix,
    epicSlug, broadMatch, watchTimeoutMs, resolvers, watchers,
  } = opts;

  return new Promise<SessionResult>((resolvePromise, rejectPromise) => {
    resolvers.set(sessionId, (result: SessionResult) => {
      resolvers.delete(sessionId);
      cleanupWatcher(sessionId, watchers);
      resolvePromise(result);
    });

    const existing = findOutputJson(artifactDir, startTime, outputSuffix)
      ?? (broadMatch ? findOutputJsonBroad(artifactDir, epicSlug, startTime) : null);
    if (existing) {
      const result = readOutputJson(existing, startTime);
      if (result) {
        resolvers.delete(sessionId);
        resolvePromise(result);
        return;
      }
    }

    const cleanup = () => {
      cleanupWatcher(sessionId, watchers);
      clearTimeout(timeout);
    };

    let watcher: FSWatcher;

    try {
      mkdirSync(artifactDir, { recursive: true });

      watcher = watch(artifactDir, (_eventType, filename) => {
        if (!filename || !filename.endsWith(".output.json")) return;
        if (!filename.endsWith(outputSuffix) &&
            !(broadMatch && filenameMatchesEpic(filename, epicSlug))) return;
        const filePath = resolve(artifactDir, filename);
        try {
          if (statSync(filePath).mtimeMs < startTime) return;
        } catch {
          return;
        }
        const result = readOutputJson(filePath, startTime);
        if (result) {
          cleanup();
          resolvers.delete(sessionId);
          resolvePromise(result);
        }
      });
      watchers.set(sessionId, watcher);
    } catch {
      // Fall back to polling
      const pollInterval = setInterval(() => {
        const found = findOutputJson(artifactDir, startTime, outputSuffix)
          ?? (broadMatch ? findOutputJsonBroad(artifactDir, epicSlug, startTime) : null);
        if (found) {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          const result = readOutputJson(found, startTime);
          resolvers.delete(sessionId);
          resolvePromise(
            result ?? { success: false, exitCode: 1, durationMs: Date.now() - startTime },
          );
        }
      }, 5_000);

      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
        const broad = findOutputJsonBroad(artifactDir, epicSlug, startTime);
        if (broad) {
          const result = readOutputJson(broad, startTime);
          if (result) {
            resolvers.delete(sessionId);
            resolvePromise(result);
            return;
          }
        }
        resolvers.delete(sessionId);
        resolvePromise({ success: false, exitCode: 1, durationMs: Date.now() - startTime });
      }, watchTimeoutMs);

      signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        rejectPromise(new DOMException("Aborted", "AbortError"));
      }, { once: true });

      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      const broad = findOutputJsonBroad(artifactDir, epicSlug, startTime);
      if (broad) {
        const result = readOutputJson(broad, startTime);
        if (result) {
          resolvers.delete(sessionId);
          resolvePromise(result);
          return;
        }
      }
      resolvers.delete(sessionId);
      resolvePromise({ success: false, exitCode: 1, durationMs: Date.now() - startTime });
    }, watchTimeoutMs);

    signal.addEventListener("abort", () => {
      cleanup();
      rejectPromise(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export function findOutputJsonBroad(dir: string, epicSlug: string, newerThanMs?: number): string | null {
  try {
    const files = readdirSync(dir) as string[];
    const candidates = files
      .filter((f: string) => f.endsWith(".output.json") && filenameMatchesEpic(f, epicSlug))
      .map((f: string) => resolve(dir, f))
      .filter((fullPath: string) => {
        if (newerThanMs === undefined) return true;
        try { return statSync(fullPath).mtimeMs >= newerThanMs; } catch { return false; }
      })
      .sort();
    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  } catch {
    return null;
  }
}

export function findOutputJson(dir: string, newerThanMs?: number, suffix?: string): string | null {
  try {
    const files = readdirSync(dir) as string[];
    const matchSuffix = suffix ?? ".output.json";
    const candidates = files
      .filter((f: string) => f.endsWith(matchSuffix))
      .map((f: string) => resolve(dir, f))
      .filter((fullPath: string) => {
        if (newerThanMs === undefined) return true;
        try { return statSync(fullPath).mtimeMs >= newerThanMs; } catch { return false; }
      })
      .sort();
    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  } catch {
    return null;
  }
}

export function readOutputJson(filePath: string, startTime: number): SessionResult | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const output = JSON.parse(raw);
    if (!output.status || !output.artifacts) return null;
    return {
      success: output.status === "completed",
      exitCode: output.status === "completed" ? 0 : 1,
      durationMs: Date.now() - startTime,
    };
  } catch {
    return null;
  }
}

export function cleanupWatcher(sessionId: string, watchers: Map<string, FSWatcher>): void {
  const watcher = watchers.get(sessionId);
  if (watcher) {
    watcher.close();
    watchers.delete(sessionId);
  }
}
