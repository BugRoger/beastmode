import { verbosityLabel } from "./verbosity.js";

/** Dashboard interaction mode — determines which key hints to show. */
export type KeyHintMode = "normal" | "filter" | "confirm";

/** Context for key hint rendering. */
export interface KeyHintContext {
  slug?: string;
  filterInput?: string;
  verbosity?: number;
}

/** Key hint strings per dashboard mode. */
const MODE_HINTS: Record<
  KeyHintMode,
  string | ((ctx: KeyHintContext) => string)
> = {
  normal: (ctx) => `q quit  ↑↓ navigate  / filter  x cancel  a all  v verb:${verbosityLabel(ctx?.verbosity ?? 0)}`,
  filter: (ctx) => `/${ctx?.filterInput ?? ""}  ↵ apply  ⎋ clear`,
  confirm: (ctx) => `Cancel ${ctx?.slug ?? ""}? y confirm  n/⎋ abort`,
};

/** Get the key hints string for the given mode with optional context. */
export function getKeyHints(
  mode: KeyHintMode,
  ctx?: KeyHintContext,
): string {
  const hint = MODE_HINTS[mode];
  if (typeof hint === "function") return hint(ctx ?? {});
  return hint;
}
