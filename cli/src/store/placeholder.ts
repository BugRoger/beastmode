/**
 * Hacker-jargon placeholder name generator for design-phase epics.
 *
 * Format: {adjective}-{noun}-{4hex}
 * Uses a curated word list for ~10,000 combinations.
 * Deterministic: same hex input always produces the same name.
 */

export const ADJECTIVES: readonly string[] = [
  "async", "binary", "bogon", "borked", "brute",
  "cached", "chmod", "cloned", "cooked", "cracked",
  "crypto", "cyber", "daemon", "dead", "deep",
  "deref", "docker", "elite", "epic", "fatal",
  "forked", "frozen", "fuzzy", "gated", "ghost",
  "glitch", "grok", "hacked", "hardwire", "hex",
  "hotwire", "hyper", "idle", "inline", "jacked",
  "janky", "jit", "kernel", "keyed", "leet",
  "linked", "live", "logic", "loose", "lurked",
  "macro", "magic", "malloc", "mega", "meta",
  "modded", "muxed", "nano", "nested", "neural",
  "nil", "null", "nuked", "opaque", "orphan",
  "owned", "packed", "parsed", "patched", "piped",
  "polled", "primal", "pwned", "qubit", "queued",
  "raw", "rogue", "root", "routed", "runtime",
  "salted", "schway", "serial", "sharded", "shell",
  "signal", "slick", "sniff", "spawned", "spliced",
  "stale", "static", "stealth", "strobe", "sudo",
  "synced", "traced", "turbo", "unbound", "viral",
  "virtual", "void", "warp", "wired", "zombie",
] as const;

export const NOUNS: readonly string[] = [
  "abort", "ack", "bacon", "banshee", "bitmap",
  "blob", "botnet", "buffer", "byte", "cache",
  "chroot", "cobol", "cookie", "crontab", "daemon",
  "dongle", "dungeon", "emacs", "epoch", "exploit",
  "firewall", "foobar", "gadget", "glyph", "goblin",
  "grep", "griefer", "hack", "hash", "heap",
  "hydra", "inode", "jabber", "jargon", "kernel",
  "kobold", "lambda", "lichen", "lisp", "malloc",
  "mantra", "mutex", "nybble", "opcode", "oracle",
  "packet", "patch", "phoenix", "pixel", "plonk",
  "portal", "proxy", "quasar", "queue", "relic",
  "regex", "ritual", "router", "rubric", "snafu",
  "socket", "specter", "sphinx", "spline", "stack",
  "strobe", "subnet", "tarball", "totem", "token",
  "trojan", "troll", "unix", "vector", "vertex",
  "viper", "virus", "voodoo", "voxel", "wraith",
  "wombat", "wyrm", "xenon", "xor", "yak",
  "zealot", "zenith", "zilch", "zinc", "zork",
  "zombie", "zone", "zypher", "zeta", "zigzag",
] as const;

/**
 * Generate a deterministic placeholder name from a 4-char hex string.
 *
 * The hex value is parsed as an integer and used to select an adjective
 * and noun from the curated word lists. The hex suffix is appended as-is.
 *
 * @param shortHex - A 4-character hex string (e.g., "a1b2")
 * @returns A placeholder name like "sudo-kernel-a1b2"
 */
export function generatePlaceholderName(shortHex: string): string {
  const value = parseInt(shortHex, 16);
  const adjIndex = value % ADJECTIVES.length;
  const nounIndex = Math.floor(value / ADJECTIVES.length) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]}-${NOUNS[nounIndex]}-${shortHex}`;
}

/**
 * Strip the trailing 4-hex suffix from a placeholder name.
 *
 * "quick-quartz-f284" → "quick-quartz"
 * "my-custom-slug"    → "my-custom-slug"  (no match, returned as-is)
 */
export function stripPlaceholderHex(name: string): string {
  return name.replace(/-[0-9a-f]{4}$/, "");
}
