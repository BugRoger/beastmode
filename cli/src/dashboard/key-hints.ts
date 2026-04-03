/** Dashboard interaction mode — determines which key hints to show. */
export type KeyHintMode = "normal" | "filter" | "confirm";

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
  mode: KeyHintMode,
  ctx?: { slug?: string; filterInput?: string },
): string {
  const hint = MODE_HINTS[mode];
  if (typeof hint === "function") return hint(ctx ?? {});
  return hint;
}
