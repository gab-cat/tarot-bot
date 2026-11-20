import { describe, expect, test } from "bun:test";
import { normaliseEvent } from "../convex/lib/webhook";

describe("normaliseEvent", () => {
  test("uses the quick reply payload, not the button title", () => {
    expect(
      normaliseEvent({
        sender: { id: "u1" },
        timestamp: 10,
        message: { mid: "m1", text: "💼 Career & Work", quick_reply: { payload: "What's my career path?" } },
      }),
    ).toEqual({
      eventKey: "m1",
      senderId: "u1",
      timestamp: 10,
      input: "What's my career path?",
      payload: "What's my career path?",
      messageId: "m1",
    });
  });

  test("keeps typed text and trims it", () => {
    expect(
      normaliseEvent({ sender: { id: "u1" }, timestamp: 10, message: { mid: "m2", text: "  will he call?  " } })?.input,
    ).toBe("will he call?");
  });

  test("handles postbacks", () => {
    expect(normaliseEvent({ sender: { id: "u1" }, timestamp: 10, postback: { mid: "p1", payload: "GET_STARTED" } })).toEqual({
      eventKey: "p1",
      senderId: "u1",
      timestamp: 10,
      input: "GET_STARTED",
      payload: "GET_STARTED",
    });
  });

  test("drops echoes, attachments-only messages and receipts", () => {
    expect(normaliseEvent({ sender: { id: "page" }, message: { mid: "m3", text: "hi", is_echo: true } })).toBeNull();
    expect(normaliseEvent({ sender: { id: "u1" }, message: { mid: "m4" } })).toBeNull();
    expect(normaliseEvent({ sender: { id: "u1" } })).toBeNull();
  });
});
