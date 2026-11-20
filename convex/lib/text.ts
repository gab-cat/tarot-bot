// Messenger renders plain text only. "Bold" is done with Unicode mathematical letters.

// prettier-ignore
const BOLD_FONT_MAP: Record<string, string> = {
  a: "𝐚", b: "𝐛", c: "𝐜", d: "𝐝", e: "𝐞", f: "𝐟", g: "𝐠", h: "𝐡", i: "𝐢", j: "𝐣",
  k: "𝐤", l: "𝐥", m: "𝐦", n: "𝐧", o: "𝐨", p: "𝐩", q: "𝐪", r: "𝐫", s: "𝐬", t: "𝐭",
  u: "𝐮", v: "𝐯", w: "𝐰", x: "𝐱", y: "𝐲", z: "𝐳",
  A: "𝐀", B: "𝐁", C: "𝐂", D: "𝐃", E: "𝐄", F: "𝐅", G: "𝐆", H: "𝐇", I: "𝐈", J: "𝐉",
  K: "𝐊", L: "𝐋", M: "𝐌", N: "𝐍", O: "𝐎", P: "𝐏", Q: "𝐐", R: "𝐑", S: "𝐒", T: "𝐓",
  U: "𝐔", V: "𝐕", W: "𝐖", X: "𝐗", Y: "𝐘", Z: "𝐙",
  "0": "𝟎", "1": "𝟏", "2": "𝟐", "3": "𝟑", "4": "𝟒", "5": "𝟓", "6": "𝟔", "7": "𝟕", "8": "𝟖", "9": "𝟗",
};

export function toBoldFont(text: string): string {
  return Array.from(text, (char) => BOLD_FONT_MAP[char] ?? char).join("");
}

/**
 * Turns model Markdown into Messenger plain text: **bold** and __bold__ become
 * Unicode bold, "# Heading" lines become bold lines, "* item" bullets become "• item",
 * and stray emphasis markers are dropped. Asking the model for Unicode bold directly
 * was unreliable and cost extra tokens, so the model writes Markdown and we convert.
 */
export function formatForMessenger(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+(.+)$/gm, (_, heading: string) => toBoldFont(heading.replace(/\*\*/g, "").trim()))
    .replace(/\*\*(.+?)\*\*/g, (_, inner: string) => toBoldFont(inner))
    .replace(/__(.+?)__/g, (_, inner: string) => toBoldFont(inner))
    .replace(/^(\s*)[*-]\s+/gm, "$1• ")
    .replace(/(^|[\s(])\*(\S(?:.*?\S)?)\*(?=[\s).,!?:;]|$)/gm, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const MESSENGER_MAX_CHARS = 2000;

/**
 * Splits text into chunks that fit Messenger's 2000-character limit, preferring
 * paragraph, line, sentence and word boundaries, and never cutting a surrogate pair
 * (Unicode bold letters and most emoji are two UTF-16 units).
 */
export function splitMessageIntoChunks(text: string, maxChars: number = MESSENGER_MAX_CHARS): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  const minBreak = Math.floor(maxChars * 0.3);

  while (remaining.length > maxChars) {
    let splitIndex = -1;
    const candidates = [
      remaining.lastIndexOf("\n\n", maxChars),
      remaining.lastIndexOf("\n", maxChars),
      Math.max(
        remaining.lastIndexOf(". ", maxChars - 1),
        remaining.lastIndexOf("! ", maxChars - 1),
        remaining.lastIndexOf("? ", maxChars - 1),
      ) + 1,
      remaining.lastIndexOf(" ", maxChars),
    ];
    for (const candidate of candidates) {
      if (candidate > minBreak) {
        splitIndex = candidate;
        break;
      }
    }
    if (splitIndex === -1) {
      splitIndex = maxChars;
      const code = remaining.charCodeAt(splitIndex - 1);
      if (code >= 0xd800 && code <= 0xdbff) splitIndex -= 1; // keep the surrogate pair together
    }
    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/** Cuts text to at most `max` UTF-16 units without splitting a surrogate pair. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  let end = max;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return text.slice(0, end);
}

export function fullName(user: { firstName?: string; lastName?: string } | null | undefined): string | undefined {
  if (!user) return undefined;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : undefined;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
