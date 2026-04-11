/**
 * ID resolution for phase commands.
 *
 * Three-step lookup (four with prefix matching):
 * 1. Try as entity ID — exact match on bm-xxxx pattern
 * 2. Try as slug — match on entity's slug field
 * 3. Try as prefix — match epic slugs starting with identifier + "-" (opt-in only)
 * 4. Return not-found (manifest fallback handled by caller)
 *
 * Detects ambiguity when an identifier matches both an ID and a slug
 * of different entities, or when a prefix matches multiple slugs.
 */

import type { TaskStore, Entity } from "./types.js";

// --- Result Types ---

export type ResolveResult =
  | { kind: "found"; entity: Entity }
  | { kind: "ambiguous"; matches: Entity[] }
  | { kind: "not-found" };

// --- Options ---

export interface ResolveOptions {
  /** When true, resolve feature IDs to their parent epic (for phase commands). */
  resolveToEpic?: boolean;
  /** When true, attempt prefix matching on epic slugs after exact match fails. CLI entry points only. */
  allowPrefix?: boolean;
}

// --- Resolution ---

/**
 * Resolve an identifier to an entity in the store.
 *
 * Priority:
 * 1. Exact ID match (bm-xxxx or bm-xxxx.N)
 * 2. Epic slug match
 * 3. Feature slug match
 * 4. Prefix slug match (only when allowPrefix is true)
 *
 * If an identifier matches both an ID and a slug of different entities,
 * returns an ambiguous result.
 */
export function resolveIdentifier(
  store: TaskStore,
  identifier: string,
  options?: ResolveOptions,
): ResolveResult {
  const matches: Entity[] = [];

  // Step 1: Try as entity ID — use getEpic/getFeature for precise ID lookup
  // (avoids find()'s built-in slug fallback which would conflate the two lookups)
  const byEpicId = store.getEpic(identifier);
  const byFeatureId = store.getFeature(identifier);
  const byId = byEpicId ?? byFeatureId;

  if (byId) {
    matches.push(byId);
  }

  // Step 2: Try as slug — scan epics for slug match
  // Only add if it's a different entity than what we found by ID
  const epics = store.listEpics();
  for (const epic of epics) {
    if (epic.slug === identifier && epic.id !== identifier) {
      matches.push(epic);
    }
  }

  // Step 3: Try as feature slug — scan features for slug match
  // Only check if no epic slug matched (epic slugs take priority)
  if (matches.length === 0 || (matches.length === 1 && matches[0] === byId)) {
    for (const epic of epics) {
      const features = store.listFeatures(epic.id);
      for (const feature of features) {
        if (feature.slug === identifier && feature.id !== identifier) {
          matches.push(feature);
        }
      }
    }
  }

  // No matches at all — try prefix matching if opted in
  if (matches.length === 0) {
    if (options?.allowPrefix) {
      const prefixMatches: Entity[] = [];
      for (const epic of epics) {
        if (epic.slug.startsWith(identifier + "-")) {
          prefixMatches.push(epic);
        }
      }

      if (prefixMatches.length === 1) {
        let entity = prefixMatches[0];
        if (options?.resolveToEpic && entity.type === "feature") {
          const parent = store.getEpic(entity.parent);
          if (!parent) return { kind: "not-found" };
          entity = parent;
        }
        return { kind: "found", entity };
      }

      if (prefixMatches.length > 1) {
        return { kind: "ambiguous", matches: prefixMatches };
      }
    }

    return { kind: "not-found" };
  }

  // Ambiguity: identifier matches both an ID and a slug of different entities
  if (matches.length > 1) {
    return { kind: "ambiguous", matches };
  }

  // Single match — apply resolveToEpic if needed
  let entity = matches[0];

  if (options?.resolveToEpic && entity.type === "feature") {
    const parent = store.getEpic(entity.parent);
    if (!parent) {
      return { kind: "not-found" };
    }
    entity = parent;
  }

  return { kind: "found", entity };
}
