// Tarot System Constants

// export const TAROT_SYSTEM_PROMPT = `**How I roll:**
// - Chatting like we're grabbing coffee and you're spilling about your week
// - Connecting your past vibes, what's happening now, and what's coming up next
// - Pointing out those "oh wow, that makes sense" moments that hit different, but not nescesarily adding this phrase to the interpretation.
// - Getting specific about real stuff - like that awkward text you sent, the job interview nerves, or why you can't stop thinking about that one person
// - Keeping it relatable - relationship drama, work frustrations, creative blocks, family stuff, or that nagging feeling something's about to change
// - Around 200 words of insights that actually help you navigate real life
// - IMPORTANT: Keep everything under 2000 characters (emojis included)

// **What you'll get:**
// 🎴 *Your Cards*
// 🔮 *The Bigger Picture* - how everything ties together
// 💡 *Real Talk* - the stuff you need to hear right now
// 🌟 *What To Try* - practical next moves that feel doable

// **Make it personal:** Think about specific situations - that crush you can't stop thinking about, the project that's stressing you out, the family tension that's been building, or that gut feeling about a decision you're making. The more specific you are, the more the cards can speak directly to you.`;

export const TAROT_SYSTEM_PROMPT = `Picture this - you're curled up with your coffee, scrolling through your morning routine, when your phone buzzes with exactly what you need to hear. That's me. Not some mystical fortune-teller hiding behind crystal balls, but your friend who happens to have really good intuition and isn't afraid to tell you what's up.

Think of me as that friend who always knows what to say - the one who calls you out when you're overthinking, celebrates when you're winning, and reminds you that everything's going to work out when life feels messy. I'm here for the real stuff: that text you're debating whether to send, the job interview butterflies, wondering if your crush actually likes you back, or that gut feeling telling you it's time for a change.

What you're getting:
🎴 Your Cards - the story they're telling about your day (Should only be brief descriptions of the cards)
🔮 The Bigger Picture - what's actually happening (no sugarcoating)
💡 What You Need To Hear - the thing you already know but need to hear
🌟 Your Next Move - something you can actually do today

Make it count: The more specific you get, the better I can help. Don't just say "love life" - tell me about that person you can't stop thinking about. Skip "work stress" and get into that project that's keeping you up at night. The messier and more real you get, the more the cards can actually speak to what's happening in your world.

**CRITICAL: Make it intensely personal and enticing by mentioning specific scenarios and moments that resonate deeply.** When interpreting the cards, always weave in references to concrete situations like:
- The exact moment you felt that gut feeling about a decision
- That specific conversation where everything changed
- The particular dream you had last night that felt meaningful
- That recurring thought you can't shake about someone
- The specific challenge you're facing right now at work/school/home
- The emotional moment when you realized something needed to change

**Use these specific moments and scenarios to make your interpretation feel like it was written just for them - not generic advice, but insights that feel eerily accurate to their exact situation.**

IMPORTANT: If you know the person's name, use it naturally throughout your reading to make it more personal and engaging. Address them by name when giving advice or insights. Just use it once or twice and do not bold it.

ASTROLOGICAL AWARENESS: Consider relevant astrological events and planetary influences for today's date ({current_date}) when interpreting the cards. If significant events like Venus retrograde, Mercury retrograde, eclipses, or other major astrological transits are happening today, weave this cosmic context naturally into your interpretation where it feels relevant and meaningful. Let your knowledge of astrology inform the reading without forcing it - only mention astrological events if they genuinely enhance the interpretation.

USER BIRTHDATE: The user was born on {user_birthdate}. Consider their sun sign and any relevant astrological influences based on their birthdate when providing insights that feel personally meaningful to them. No need to bold it or emphasize it. And do not mention it in the interpretation if not relevant.

IMPORTANT: Keep everything under 2000 characters (emojis included)

Around 200 words that hit different - keeping it under 2000 characters because we both have places to be.`

// Card position mappings
export const CARD_POSITIONS = {
  past: { emoji: "⏮️", name: "Past" },
  present: { emoji: "▶️", name: "Present" },
  future: { emoji: "⏭️", name: "Future" }
} as const;

// Card info type for formatting functions
export interface CardInfo {
  name: string;
  meaning: string;
  position: string;
  reversed: boolean;
  description: string;
  cardType: string;
}

// Pure functions for text formatting
export function formatCardInfo(card: CardInfo): string {
  const position = CARD_POSITIONS[card.position as keyof typeof CARD_POSITIONS];
  if (!position) return "";

  return `${position.emoji} ${position.name}: ${card.name}${card.reversed ? " (Reversed)" : ""}
└ Type: ${card.cardType === "major" ? "Major Arcana" : "Minor Arcana"}
└ Description: ${card.description.substring(0, 200)}...
└ Meaning: ${card.meaning}`;
}

export function formatCardSummary(card: CardInfo): string {
  const position = CARD_POSITIONS[card.position as keyof typeof CARD_POSITIONS];
  if (!position) return "";

  const status = card.reversed ? " (Reversed)" : "";
  const cardType = card.cardType === "major" ? "Major Arcana" : "Minor Arcana";

  return `${position.emoji} *${position.name}*: ${card.name}${status}
└─ *${cardType}*
└─ ${card.meaning}`;
}

// Fallback interpretation text
export const FALLBACK_INTERPRETATION = {
  title: "🎴 **Mystical Reading**",
  cardsReveal: "🔮 **The Cards Reveal**: Your question \"{question}\" draws forth a fascinating journey. The {firstCard} speaks of foundations, while {secondCard} illuminates your current moment, and {thirdCard} points toward possibilities ahead.",
  wisdom: "💡 **Whispers of Wisdom**:\n• Trust the timing of your path\n• Your intuition holds powerful answers\n• Small steps lead to meaningful change",
  pathForward: "🌟 **Your Path Forward**: Embrace curiosity and stay open to synchronicities. The cards are your allies in this beautiful dance of life."
};

// Messenger bot message constants
export const MESSAGES = {
  // Welcome and start messages
  welcome: "🎴 *Welcome to your mystical tarot reading!* ✨\n\nAsk me anything your heart desires, or simply describe your question or situation. You can also choose from the options below:",
  readingInProgress: "🔮 *Whispering to the cards...* ✨\n\nI'm connecting with the mystical energies and drawing your three sacred cards. This may take a moment... 🌙",
  cardsDrawn: "🎴 *Your Cards Are Drawn* ✨\n\n*Whispering with the ancient energies to reveal their story...*",

  // Completion messages
  readingComplete: "\n\n💫 Your daily reading is complete! Come back tomorrow for a new one. 🌟",

  // Error messages
  aiUnavailable: "AI interpretation temporarily unavailable. Please try your question again.",
  dailyLimitReached: "You've already received your daily reading! ✨\n\nCome back in {time} for a new one. 🌟",

  // Cooldown messages
  readingTooFresh: "🌙 *Your recent reading is still fresh in the mystical energies...* ✨\n\nPlease wait a moment before requesting another reading. The cards need time to settle. 🔮",

  // Birthdate messages
  promptBirthdate: "🎂 *To begin your mystical journey, I need your birthdate* ✨\n\nThis helps me align the cards with your unique cosmic energy. Please enter your birthdate in this format:\n\n*Example:* Oct 15, Dec 2, Jan 30\n\n📅 *Month* followed by *day* (no year needed)",
  invalidBirthdate: "❌ *Invalid format* ✨\n\nPlease use the format: *Month day*\n\n*Examples:* Oct 15, Dec 2, Jan 30\n\nTry again! 🔮",
  birthdateSaved: "✨ *Birthdate saved!* ✨\n\nYour cosmic energy is now aligned. Ready for your reading? 🔮",

  // Prompts
  readyForReading: "Ready for your daily tarot reading? 🔮"
} as const;

// Quick reply options
export const QUICK_REPLIES = {
  start: { title: "🎴 Start Reading", payload: "Start" },
  aboutMe: { title: "👤 About Me", payload: "About Me" },
  career: { title: "💼 Career Path", payload: "What's my career path?" },
  love: { title: "💝 Love & Relationships", payload: "How can I find true love?" },
  growth: { title: "🧘 Personal Growth", payload: "What should I focus on today?" },
  guidance: { title: "🎯 General Guidance", payload: "What guidance do the cards have for me?" }
} as const;

// Error messages
export const ERRORS = {
  webhookVerificationFailed: "Verification failed - incorrect token or mode",
  filenameRequired: "Filename required",
  invalidFilename: "Invalid filename",
  imageNotFound: "Image not found",
  internalServerError: "Internal server error",
  accessTokenMissing: "Missing ACCESS_TOKEN",
  webhookIgnored: "Ignored",
  eventReceived: "EVENT_RECEIVED",
  errorHandled: "ERROR_HANDLED"
} as const;

// HTTP status messages
export const HTTP_RESPONSES = {
  forbidden: "Forbidden",
  badRequest: "Bad Request",
  notFound: "Not Found",
  internalError: "Internal Server Error"
} as const;

// Gemini API error message
export const GEMINI_ERROR_MESSAGE = "AI interpretation temporarily unavailable. Please try your question again.";

// Follow-up question limits by subscription tier
export const FOLLOWUP_LIMITS = {
  free: 1,
  mystic: 3,    // pro
  oracle: 5,    // pro+
  pro: 3,       // backward compatibility
  "pro+": 5     // backward compatibility
} as const;

// Follow-up UI messages
export const FOLLOWUP_MESSAGES = {
  sessionAvailable: "💫 *Your reading is ready for deeper exploration* ✨\n\nWould you like to ask a follow-up question to gain more clarity?",
  questionPrompt: "🔮 *What's on your mind?* ✨\n\nAsk me anything about your reading for deeper insights:",
  processingQuestion: "🔮 *Consulting the cards again...* ✨\n\nI'm weaving together the mystical energies from your original reading.",
  remainingQuestions: (remaining: number, max: number) => `📊 *Questions remaining:* ${remaining}/${max}`,
  limitReached: "🌟 *You've reached your follow-up limit for this reading* ✨\n\nReady to explore more mystical wisdom? Upgrade your experience!",
  sessionEnded: "💫 *Thank you for exploring the cards deeper* ✨\n\nMay their wisdom continue to guide your path. 🔮✨",
  invalidQuestion: "❌ *I couldn't fully connect that question to your reading* ✨\n\nTry rephrasing or asking about specific cards from your spread.",
} as const;

// Follow-up quick replies
export const FOLLOWUP_QUICK_REPLIES = {
  askQuestion: { title: "💭 Ask Follow-Up", payload: "FOLLOWUP_QUESTION" },
  endSession: { title: "🏁 End Reading", payload: "END_READING_SESSION" },
  upgradePrompt: { title: "⭐ Upgrade Now", payload: "UPGRADE_PROMPT" },
} as const;

// Test console messages
export const TEST_MESSAGES = {
  testingCaching: "🧪 Testing on-the-fly caching functionality...",
  convexUrlRequired: "❌ CONVEX_URL environment variable is required",
  accessTokenRequired: "❌ ACCESS_TOKEN environment variable is required",
  testingUpload: "📤 Testing uploadMultipleImageAttachments action...",
  checkingCache: "🔍 Checking initial cache status...",
  runningUpload: "🚀 Running uploadMultipleImageAttachments (this should cache missing images)...",
  verifyingCache: "🔍 Verifying images are now cached...",
  testingReuse: "🔄 Testing that cached images are reused...",
  cachedReused: "✅ Cached attachment IDs are being reused correctly!",
  cachedNotReused: "❌ Cached attachment IDs are not being reused!",
  testCompleted: "🎉 On-the-fly caching test completed successfully!",
  testFailed: "❌ Test failed:",
  cached: "CACHED",
  notCached: "NOT CACHED"
} as const;

// Helper functions for dynamic messages
export function getDailyLimitMessage(remainingTime: string, userType?: string): string {
  const baseMessage = MESSAGES.dailyLimitReached.replace("{time}", remainingTime);

  // Add upgrade prompts based on user type
  if (userType === "free") {
    return `${baseMessage}\n\n🌟 *Ready for more mystical insights?*\n💎 *Mystic Guide* → 5 daily readings + 3 follow-ups + deeper insights\n👑 *Oracle Master* → Unlimited readings + 5 follow-ups + premium guidance`;
  } else if (userType === "mystic" || userType === "pro") {
    return `${baseMessage}\n\n🌟 *Seeking even deeper mystical wisdom?*\n👑 *Upgrade to Oracle Master* → Unlimited readings (vs 5 daily) + 5 follow-ups (vs 3) + exclusive premium features`;
  }

  // Default message for other user types or unknown
  return baseMessage;
}

export function getFallbackInterpretation(question: string, cards: CardInfo[]): string {
  const firstCard = cards[0]?.name || "first card";
  const secondCard = cards[1]?.name || "second card";
  const thirdCard = cards[2]?.name || "third card";

  return `${FALLBACK_INTERPRETATION.title}

${FALLBACK_INTERPRETATION.cardsReveal
  .replace("{question}", question)
  .replace("{firstCard}", firstCard)
  .replace("{secondCard}", secondCard)
  .replace("{thirdCard}", thirdCard)}

${FALLBACK_INTERPRETATION.wisdom}

${FALLBACK_INTERPRETATION.pathForward}`;
}
