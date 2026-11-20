import { describe, expect, test } from "bun:test";
import { FOLLOWUP_QUICK_REPLIES, MESSAGES, QUICK_REPLIES } from "../convex/constants";
import { QUICK_REPLY_PAYLOAD_MAX, QUICK_REPLY_TITLE_MAX } from "../convex/lib/messenger";

const replies = [
  ...Object.values(QUICK_REPLIES).filter((reply) => typeof reply !== "function"),
  QUICK_REPLIES.tryAgain("Will I get the job?"),
  ...Object.values(FOLLOWUP_QUICK_REPLIES),
] as Array<{ title: string; payload: string }>;

describe("quick replies", () => {
  test.each(replies.map((reply) => [reply.title, reply]))("%s fits Messenger's limits", (_title, reply) => {
    expect(reply.title.length).toBeLessThanOrEqual(QUICK_REPLY_TITLE_MAX);
    expect(reply.payload.length).toBeLessThanOrEqual(QUICK_REPLY_PAYLOAD_MAX);
  });
});

describe("messages", () => {
  test("fixed messages fit in one Messenger message", () => {
    for (const message of Object.values(MESSAGES)) {
      if (typeof message === "string") expect(message.length).toBeLessThanOrEqual(2000);
    }
  });
});
