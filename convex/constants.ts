// Everything the bot says in Messenger. Readings themselves come from the prompts in
// convex/ai/prompts.ts. Quick reply titles must stay within 20 characters
// (tests/constants.test.ts checks this).

import { toBoldFont } from "./lib/text";
import type { QuickReply } from "./lib/messenger";
import type { StoredCard } from "./validators";

export { toBoldFont };

export const PRICES_PHP = { mystic: 49, oracle: 99 } as const;
export const SUBSCRIPTION_DAYS = 30;
export const FREE_READINGS_PER_DAY = 1;
export const MYSTIC_READINGS_PER_DAY = 5;
export const FOLLOWUP_WINDOW_MS = 10 * 60 * 1000;

// Follow-up questions allowed per reading, by tier.
export const FOLLOWUP_LIMITS = {
  free: 1,
  mystic: 3,
  oracle: 5,
  pro: 3, // legacy name for mystic
  "pro+": 5, // legacy name for oracle
} as const;

export const PLAN_NAMES = { mystic: "Mystic Guide", oracle: "Oracle Master" } as const;

export const TIER_DISPLAY_NAMES: Record<string, string> = {
  free: "Free Explorer",
  mystic: "Mystic Guide",
  oracle: "Oracle Master",
  pro: "Mystic Guide",
  "pro+": "Oracle Master",
};

// Card position labels.
export const CARD_POSITIONS = {
  past: { emoji: "⏮️", name: "Past" },
  present: { emoji: "▶️", name: "Present" },
  future: { emoji: "⏭️", name: "Future" },
} as const;

export type CardInfo = Pick<StoredCard, "name" | "meaning" | "position" | "reversed" | "description" | "cardType">;

function arcanaName(cardType: string): string {
  return cardType === "major" ? "Major Arcana" : "Minor Arcana";
}

/** Card details for prompts. */
export function formatCardInfo(card: CardInfo): string {
  const position = CARD_POSITIONS[card.position as keyof typeof CARD_POSITIONS];
  if (!position) return "";
  return `${position.name}: ${card.name}${card.reversed ? " (Reversed)" : ""}
- Type: ${arcanaName(card.cardType)}
- Description: ${card.description.substring(0, 200)}...
- Meaning: ${card.meaning}`;
}

/** Card summary shown to the user after the images. */
export function formatCardSummary(card: CardInfo): string {
  const position = CARD_POSITIONS[card.position as keyof typeof CARD_POSITIONS];
  if (!position) return "";
  return `${position.emoji} ${toBoldFont(position.name)}: ${card.name}${card.reversed ? " (Reversed)" : ""}
└─ ${toBoldFont(arcanaName(card.cardType))}
└─ ${card.meaning}`;
}

const askAnythingLine = `${toBoldFont("You can ask about anything:")} love, career, personal growth, or whatever is on your heart. 🌙 \nOr, you can simply describe your question or situation.`;

export const MESSAGES = {
  getStartedWelcome: `🎴 ${toBoldFont("The cards are calling to you...")} ✨\n\nI'm here to illuminate your path with ancient wisdom and cosmic insights. 🔮 What question burns in your heart today?`,
  getStartedWelcomeNamed: (name: string) =>
    `🎴 ${toBoldFont(`Welcome, ${name}!`)} ✨\n\nThe ancient cards are whispering your name... I'm your mystical tarot guide, here to illuminate your path with cosmic wisdom. 🔮\n\nWhat question calls to your soul today?`,
  welcomeBack: (name: string) => `🎴 ${toBoldFont(`Welcome back, ${name}!`)} ✨\n\nReady for your daily tarot reading? 🔮`,
  askQuestion: `🎴 What question would you like to ask the cards today? 🔮\n\n${askAnythingLine}`,
  askQuestionWelcome: `🎴 ${toBoldFont("Welcome!")} ✨\n\nWhat question would you like to ask the cards today? 🔮\n\n${askAnythingLine}`,
  askQuestionAfterBirthdate: (name?: string) =>
    `🎴 ${toBoldFont(name ? `Perfect, ${name}!` : "Perfect!")} ✨\n\nWhat question would you like to ask the cards today? 🔮\n\n${askAnythingLine}`,
  readingInProgress: `🔮 ${toBoldFont("Whispering to the cards...")} ✨\n\nI'm connecting with the mystical energies and drawing your three sacred cards. This may take a moment... 🌙`,
  cardsDrawn: `🎴 ${toBoldFont("Your Cards Are Drawn")} ✨\n\n${toBoldFont("Whispering with the ancient energies to reveal their story...")}`,
  readingComplete: "\n\n💫 Your daily reading is complete! Come back tomorrow for a new one. 🌟",
  readingFailed: `❌ ${toBoldFont("The cards couldn't be read just now")}\n\nYour reading wasn't used. Tap Try again, or send your question again in a minute.`,
  readingTooFresh: `🌙 ${toBoldFont("Your recent reading is still fresh in the mystical energies...")} ✨\n\nPlease wait a moment before requesting another reading. The cards need time to settle. 🔮`,
  sessionCancelled: `✋ ${toBoldFont("Session cancelled")} ✨\n\nYour reading session has been ended. Feel free to start a new one whenever you're ready! 🔮`,
  promptBirthdate: `🎂 ${toBoldFont("To begin your mystical journey, I need your birthdate")} ✨\n\nThis helps me align the cards with your unique cosmic energy. Please enter your birthdate in this format:\n\n${toBoldFont("Example:")} Oct 15, Dec 2, Jan 30\n\n📅 ${toBoldFont("Month")} followed by ${toBoldFont("day")} (no year needed)`,
  invalidBirthdate: `❌ ${toBoldFont("Invalid format")} ✨\n\nPlease use the format: ${toBoldFont("Month day")}\n\n${toBoldFont("Examples:")} Oct 15, Dec 2, Jan 30\n\nTry again! 🔮`,
  birthdateSaved: `✨ ${toBoldFont("Birthdate saved!")} ✨\n\nYour cosmic energy is now aligned. Ready for your reading? 🔮`,
  readyForReading: "Ready for your daily tarot reading? 🔮",
  howItWorks: `🔮 ${toBoldFont("How it works")}\n\nAsk the cards anything, or tell me what's on your mind. I draw three cards for your past, present and future and read them for you, then you can ask follow-up questions for 10 minutes.\n\nFree Explorers get 1 reading a day. Tap Start or just type your question. 🌙`,
  birthdateWhy: `🎂 ${toBoldFont("Your birthdate tells me your sun sign")} ✨\n\nThat lets the cards speak to your own cosmic energy. I only need the month and day.\n\n${toBoldFont("Example:")} Oct 15, Dec 2, Jan 30`,
  questionHeld: `🎴 ${toBoldFont("I've got your question")} ✨\n\nI'll read it as soon as I have your birthdate. Please send the month and day.\n\n${toBoldFont("Example:")} Oct 15, Dec 2, Jan 30`,
  stillReading: `🔮 ${toBoldFont("Still reading your cards...")} 🌙 Just a moment more.`,
  quickQuestion: `❓ ${toBoldFont("Quick mystical guidance awaits...")} ✨\n\nShare your brief question or situation, and I'll draw a single card to illuminate your path. 🌙`,
  dailyInsight: `✨ ${toBoldFont("Daily cosmic wisdom...")} 🔮\n\nThe cards have a special message for you today. Ready to receive their guidance?`,
  // The plan details used to sit in the button titles, which Messenger cuts at 20 characters.
  upgradeChoosePlan: `⭐ ${toBoldFont("Ready to unlock premium features?")} ✨\n\nChoose your upgrade path:\n💎 ${toBoldFont(`Mystic Guide (₱${PRICES_PHP.mystic})`)} - 5 daily readings\n👑 ${toBoldFont(`Oracle Master (₱${PRICES_PHP.oracle})`)} - Unlimited access`,
  upgradeAlreadySubscribed: `ℹ️ ${toBoldFont("Upgrade Options")}\nYour subscription is active. You can upgrade again once it expires.`,
  upgradeStarting: (planName: string) => `🔮 Initiating ${planName} upgrade... Check your payment link!`,
  upgradeFailed: "❌ Upgrade initiation failed. Please try again or contact support.",
  paymentLinkSubtitle: "This payment is securely processed by Xendit. We accept major credit cards and popular e-wallets.",
  genericError: "❌ An error occurred. Please try again.",
} as const;

export function getDailyLimitMessage(remainingTime: string, userType?: string): string {
  const base = `You've already received your daily reading! ✨\n\nCome back in ${remainingTime} for a new one. 🌟`;
  if (userType === "free") {
    return `${base}\n\n🌟 ${toBoldFont("Ready for more mystical insights?")}\n💎 ${toBoldFont("Mystic Guide")} → 5 daily readings + 3 follow-ups + deeper insights\n👑 ${toBoldFont("Oracle Master")} → Unlimited readings + 5 follow-ups + premium guidance`;
  }
  if (userType === "mystic" || userType === "pro") {
    return `${base}\n\n🌟 ${toBoldFont("Seeking even deeper mystical wisdom?")}\n👑 ${toBoldFont("Upgrade to Oracle Master")} → Unlimited readings (vs 5 daily) + 5 follow-ups (vs 3) + exclusive premium features`;
  }
  return base;
}

export function paymentConfirmationMessage(plan: "mystic" | "oracle"): string {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const benefits =
    plan === "mystic"
      ? "- 5 daily tarot readings\n- Unlimited follow-up questions\n- Deeper mystical insights"
      : "- Unlimited daily tarot readings\n- Unlimited follow-up questions\n- Advanced oracle guidance";
  return `🎉 Congratulations! You've successfully upgraded to ${planName} Plan! ✨\n\nYour new benefits:\n${benefits}\n\nEnjoy your enhanced mystical experience! 🔮\n\nReady to start your first reading?`;
}

export const QUICK_REPLIES = {
  start: { title: "🔮 Start My Reading", payload: "Start" },
  startReading: { title: "🎴 Start Reading", payload: "Start" },
  aboutMe: { title: "👤 About Me", payload: "About Me" },
  career: { title: "💼 Career & Work", payload: "What's my career path?" },
  love: { title: "💝 Love & Heart", payload: "How can I find true love?" },
  growth: { title: "🌱 Personal Growth", payload: "What should I focus on today?" },
  guidance: { title: "🎯 Life Guidance", payload: "What guidance do the cards have for me?" },
  quickQuestion: { title: "❓ Quick Question", payload: "Quick Question" },
  upgradeMystic: { title: `Upgrade Mystic (₱${PRICES_PHP.mystic})`, payload: "UPGRADE_MYSTIC" },
  upgradeOracle: { title: `Upgrade Oracle (₱${PRICES_PHP.oracle})`, payload: "UPGRADE_ORACLE" },
  tryAgain: (question: string): QuickReply => ({ title: "🔄 Try again", payload: question }),
} as const satisfies Record<string, QuickReply | ((question: string) => QuickReply)>;

export const QUESTION_TOPIC_REPLIES = [QUICK_REPLIES.career, QUICK_REPLIES.love, QUICK_REPLIES.growth, QUICK_REPLIES.guidance];
export const UPGRADE_REPLIES = [QUICK_REPLIES.upgradeMystic, QUICK_REPLIES.upgradeOracle];

export const FOLLOWUP_MESSAGES = {
  prompt: `🔮 ${toBoldFont("What's on your mind?")} ✨\n\nSend me any message to ask follow-up questions about your reading for deeper insights.\n\n⏰ ${toBoldFont("Follow-ups will be entertained within 10 minutes")}`,
  upgradePrompt: `⭐ ${toBoldFont("Ready to unlock more mystical insights?")}\n\nUpgrade to access unlimited follow-up questions and deeper guidance! 🔮`,
  limitReached: `🌟 ${toBoldFont("You've reached your follow-up limit for this reading")} ✨\n\nReady to explore more mystical wisdom? Upgrade your experience!`,
  sessionEnded: "Thank you for exploring the cards deeper. May their wisdom continue to guide your path. 🔮✨",
  windowEnded: `⏰ ${toBoldFont("Your 10-minute follow-up window has ended")} ✨\n\nReady for your next mystical journey? 🔮`,
  thanksReply: `💫 ${toBoldFont("You're welcome")} ✨\n\nYou can still ask about your reading until the 10 minutes are up, or end it here.`,
  answerFailed: "❌ I couldn't answer that just now. Your question wasn't used, so please ask again.",
  noSession: "❌ No active follow-up session found. Please complete a reading first.",
} as const;

export const FOLLOWUP_QUICK_REPLIES = {
  askQuestion: { title: "💭 Ask Follow-Up", payload: "FOLLOWUP_QUESTION" },
  endSession: { title: "🏁 End Reading", payload: "END_READING_SESSION" },
  upgradePrompt: { title: "⭐ Upgrade Now", payload: "UPGRADE_PROMPT" },
} as const;

export const NOTIFICATION_GREETINGS = [
  "🌙 The cosmic veil lifts once more...",
  "✨ The cards awaken with the new dawn...",
  "🔮 Your mystical journey continues today...",
  "🌟 The stars align for fresh insights...",
  "🎴 The ancient wisdom awaits your touch...",
  "💫 The mystical energies renew themselves...",
  "🌙 A new day brings new revelations...",
  "✨ Your spiritual path calls to you...",
  "🔮 The cards whisper of new beginnings...",
  "🌟 Fresh cosmic guidance awaits...",
];

export const DEFAULT_PROFILE_DESCRIPTION =
  "A curious soul beginning their journey into the mystical arts, ready to discover the wisdom the cards hold.";

// Stored in Convex file storage on the prod deployment; shown on the payment card.
export const PAYMENT_CARD_IMAGE_URL =
  "https://dependable-gopher-336.convex.cloud/api/storage/c3c82463-85ae-45b6-b864-05e30d70a4e2";
