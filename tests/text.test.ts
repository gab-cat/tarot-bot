import { describe, expect, test } from "bun:test";
import { formatForMessenger, splitMessageIntoChunks, toBoldFont, truncate } from "../convex/lib/text";

describe("splitMessageIntoChunks", () => {
  test("keeps short text in one chunk", () => {
    expect(splitMessageIntoChunks("hello")).toEqual(["hello"]);
  });

  test("every chunk fits Messenger's 2000-character limit and nothing is lost", () => {
    const paragraph = "The cards speak of change and patience. ".repeat(30);
    const text = Array.from({ length: 6 }, () => paragraph).join("\n\n");
    const chunks = splitMessageIntoChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(2000);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(text.trim().replace(/\s+/g, " "));
  });

  test("prefers paragraph breaks", () => {
    const first = "a".repeat(1500);
    const second = "b".repeat(1500);
    expect(splitMessageIntoChunks(`${first}\n\n${second}`)).toEqual([first, second]);
  });

  test("never splits a surrogate pair when it has to hard-cut", () => {
    // Each bold letter is 2 UTF-16 units; the leading "a" makes unit 2000 fall mid-letter.
    const bold = `a${toBoldFont("x").repeat(1500)}`;
    const chunks = splitMessageIntoChunks(bold);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2000);
      expect(chunk.isWellFormed()).toBe(true);
    }
    expect(chunks.join("")).toBe(bold);
  });
});

describe("formatForMessenger", () => {
  test("turns **bold** into Unicode bold", () => {
    expect(formatForMessenger("🔮 **Overview** - change is near")).toBe(`🔮 ${toBoldFont("Overview")} - change is near`);
  });

  test("turns headings into bold lines and bullets into dots", () => {
    expect(formatForMessenger("## Card Insights\n* The Fool: a leap\n- The Sun: joy")).toBe(
      `${toBoldFont("Card Insights")}\n• The Fool: a leap\n• The Sun: joy`,
    );
  });

  test("drops single-asterisk emphasis but keeps the words", () => {
    expect(formatForMessenger("trust the *process* today")).toBe("trust the process today");
  });

  test("collapses runs of blank lines", () => {
    expect(formatForMessenger("one\n\n\n\ntwo")).toBe("one\n\ntwo");
  });
});

describe("truncate", () => {
  test("does not cut a surrogate pair in half", () => {
    const text = `ab${toBoldFont("c")}`; // "ab" + 2 units
    expect(truncate(text, 3)).toBe("ab");
    expect(truncate(text, 4)).toBe(text);
  });
});
