import { describe, expect, test } from "bun:test";
import { formatManilaDate, startOfDay, startOfNextDay, timeUntilNextDay } from "../convex/lib/time";

describe("daily reset", () => {
  test("resets at midnight UTC (8:00 AM Manila)", () => {
    const at = Date.UTC(2026, 10, 21, 15, 30); // 11:30 PM Manila
    expect(startOfDay(at)).toBe(Date.UTC(2026, 10, 21));
    expect(startOfNextDay(at)).toBe(Date.UTC(2026, 10, 22));
  });
  test("formats the wait until the reset", () => {
    expect(timeUntilNextDay(Date.UTC(2026, 10, 21, 21, 15))).toBe("2h 45m");
    expect(timeUntilNextDay(Date.UTC(2026, 10, 21, 23, 50))).toBe("10m");
  });
  test("formats dates in Manila time", () => {
    expect(formatManilaDate(Date.UTC(2026, 10, 21, 20, 0))).toBe("Nov 22, 2026"); // 4 AM next day in Manila
  });
});
