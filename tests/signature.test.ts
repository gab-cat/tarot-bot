import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { signMessengerBody, timingSafeEqual, verifyMessengerSignature } from "../convex/lib/signature";

const secret = "test-app-secret";
const body = new TextEncoder().encode(
  '{"object":"page","entry":[{"messaging":[{"sender":{"id":"1"},"message":{"text":"\\u00f1"}}]}]}',
);
const raw = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
const metaStyle = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("verifyMessengerSignature", () => {
  test("accepts the signature Meta would send", async () => {
    expect(await verifyMessengerSignature(raw, metaStyle, secret)).toBe(true);
    expect(await signMessengerBody(raw, secret)).toBe(metaStyle);
  });
  test("rejects a missing, malformed or wrong signature", async () => {
    expect(await verifyMessengerSignature(raw, null, secret)).toBe(false);
    expect(await verifyMessengerSignature(raw, "sha1=abc", secret)).toBe(false);
    expect(await verifyMessengerSignature(raw, metaStyle, "other-secret")).toBe(false);
  });
  test("rejects a tampered body", async () => {
    const tampered = new TextEncoder().encode('{"object":"page","entry":[]}');
    expect(await verifyMessengerSignature(tampered.buffer as ArrayBuffer, metaStyle, secret)).toBe(false);
  });
});

describe("timingSafeEqual", () => {
  test("compares strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});
