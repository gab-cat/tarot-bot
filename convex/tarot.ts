import cardsData from "./tarot-cards.json";
import type { StoredCard } from "./validators";

type TarotCardData = {
  type: string;
  name_short: string;
  name: string;
  meaning_up: string;
  meaning_rev: string;
  desc: string;
  img: string;
};

export type DrawnCard = StoredCard & { imageFilename: string };

const POSITIONS = ["past", "present", "future"] as const;
const DECK = cardsData.cards as TarotCardData[];

/** Three different cards for past, present and future, each upright or reversed. */
export function drawThreeCards(random: () => number = Math.random): DrawnCard[] {
  const deck = [...DECK];
  // Partial Fisher-Yates: the first three slots end up as a uniform random sample.
  for (let i = 0; i < POSITIONS.length; i++) {
    const j = i + Math.floor(random() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return POSITIONS.map((position, i) => {
    const card = deck[i];
    const reversed = random() < 0.5;
    return {
      id: card.name_short,
      name: card.name,
      meaning: reversed ? card.meaning_rev : card.meaning_up,
      position,
      reversed,
      description: card.desc,
      cardType: card.type,
      imageFilename: card.img,
    };
  });
}

export function toStoredCard({ imageFilename: _imageFilename, ...card }: DrawnCard): StoredCard {
  return card;
}
