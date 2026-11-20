import { describe, expect, test } from "bun:test";
import cards from "../convex/tarot-cards.json";
import { drawThreeCards, toStoredCard } from "../convex/tarot";

describe("drawThreeCards", () => {
  test("the deck has all 78 cards with images", () => {
    expect(cards.cards.length).toBe(78);
    expect(new Set(cards.cards.map((card) => card.name_short)).size).toBe(78);
    for (const card of cards.cards) expect(card.img).toMatch(/\.jpg$/);
  });

  test("draws three different cards for past, present and future", () => {
    for (let run = 0; run < 500; run++) {
      const drawn = drawThreeCards();
      expect(drawn.map((card) => card.position)).toEqual(["past", "present", "future"]);
      expect(new Set(drawn.map((card) => card.id)).size).toBe(3);
    }
  });

  test("uses the reversed meaning for reversed cards", () => {
    const drawn = drawThreeCards(() => 0); // always the first card, always reversed
    const fool = cards.cards[0];
    expect(drawn[0].reversed).toBe(true);
    expect(drawn[0].meaning).toBe(fool.meaning_rev);
  });

  test("stored cards drop the image filename", () => {
    const [card] = drawThreeCards();
    expect(Object.keys(toStoredCard(card)).sort()).toEqual([
      "cardType",
      "description",
      "id",
      "meaning",
      "name",
      "position",
      "reversed",
    ]);
  });
});
