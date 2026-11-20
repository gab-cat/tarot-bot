// Messenger signs every webhook POST with X-Hub-Signature-256: "sha256=" + the
// lowercase hex HMAC-SHA256 of the raw request body, keyed with the Meta app secret.
// Verify against the raw bytes; re-serialising the parsed JSON changes them.

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, body: ArrayBuffer): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, body);
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings in time that depends only on their length. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyMessengerSignature(
  rawBody: ArrayBuffer,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
  return timingSafeEqual(signatureHeader.toLowerCase(), expected);
}

export async function signMessengerBody(rawBody: ArrayBuffer, appSecret: string): Promise<string> {
  return `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
}
