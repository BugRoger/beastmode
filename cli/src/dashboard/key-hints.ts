import type { ViewType } from "./view-stack.js";

/** Key hint strings per view type. */
const KEY_HINTS: Record<ViewType["type"], string> = {
  "epic-list": "q quit  ↑↓ navigate  ↵ drill  x cancel  a all",
  "feature-list": "q quit  ↑↓ navigate  ↵ drill  ⎋ back",
  "agent-log": "q quit  ↑↓ scroll  ⎋ back  f follow",
};

/** Get the key hints string for the given view type. */
export function getKeyHints(viewType: ViewType["type"]): string {
  return KEY_HINTS[viewType];
}

/** Get the key hints string from a ViewType object. */
export function getKeyHintsForView(view: ViewType): string {
  return KEY_HINTS[view.type];
}
