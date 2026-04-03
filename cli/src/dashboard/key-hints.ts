/** Dashboard interaction mode — determines which key hints to show. */
export type KeyHintMode = "normal" | "filter" | "confirm";

/** View type for context. */
export type ViewType = "epic-list" | "feature-list" | "agent-log";

/** Key hint strings per dashboard mode. */
const MODE_HINTS: Record<
  KeyHintMode,
  string | ((ctx: { slug?: string; filterInput?: string }) => string)
> = {
  normal: "q quit  ↑↓ navigate  / filter  x cancel  a all",
  filter: (ctx) => `/${ctx?.filterInput ?? ""}  ↵ apply  ⎋ clear`,
  confirm: (ctx) => `Cancel ${ctx?.slug ?? ""}? y confirm  n/⎋ abort`,
};

/** Get the key hints string for the given mode with optional context. */
export function getKeyHints(
  mode: KeyHintMode | ViewType,
  ctx?: { slug?: string; filterInput?: string },
): string {
  // Map view types to hint modes
  if (mode === "epic-list" || mode === "feature-list") {
    return "↵ drill down  ⎋ back  ↑↓ navigate  q quit  x cancel  a all";
  }
  if (mode === "agent-log") {
    return "space follow/pause  ⎋ back  q quit";
  }

  const hint = MODE_HINTS[mode as KeyHintMode];
  if (typeof hint === "function") return hint(ctx ?? {});
  return hint;
}
