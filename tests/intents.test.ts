import { describe, expect, test } from "bun:test";
import { isCancel, isGreeting, parseBirthdate } from "../convex/lib/intents";

describe("isGreeting", () => {
  test.each(["hi", "Hello there", "hey!", "good morning", "Kumusta", "yo"])("%s is a greeting", (text) => {
    expect(isGreeting(text)).toBe(true);
  });
  test.each(["his ex texted me", "history exam tomorrow", "your future?", "super confused", "will he call"])(
    "%s is not a greeting",
    (text) => {
      expect(isGreeting(text)).toBe(false);
    },
  );
});

describe("isCancel", () => {
  test("matches the whole message only", () => {
    expect(isCancel("cancel")).toBe(true);
    expect(isCancel(" Stop ")).toBe(true);
    expect(isCancel("should I cancel the trip?")).toBe(false);
  });
});

describe("parseBirthdate", () => {
  test.each([
    ["Oct 15", "Oct 15"],
    ["oct 15", "Oct 15"],
    [" DEC 02 ", "Dec 2"],
    ["Feb 29", "Feb 29"],
    ["October 15th", "Oct 15"],
    ["15 Oct", "Oct 15"],
    ["15th of October", "Oct 15"],
    ["Sept 3", "Sep 3"],
    ["Oktubre 15 po", "Oct 15"],
    ["ika-15 ng Oktubre", "Oct 15"],
    ["Oct 15, 1998", "Oct 15"],
    ["my birthday is dec 2", "Dec 2"],
    ["10/15", "Oct 15"],
    ["15/10", "Oct 15"],
    ["10-15-1998", "Oct 15"],
    ["1998-10-15", "Oct 15"],
  ])("reads %s as %s", (text, expected) => {
    expect(parseBirthdate(text)).toBe(expected);
  });

  test.each(["Feb 30", "Abc 1", "13/13", "15", "Oct 0", "will my ex come back", "October"])("rejects %s", (text) => {
    expect(parseBirthdate(text)).toBeNull();
  });
});
