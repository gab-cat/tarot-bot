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
- The specific feeling you're experiencing right now
- The specific person you're thinking about
- The specific situation you're in
- The specific challenge you're facing
- The specific goal you're trying to achieve
- The specific dream you had last night
- The specific thought you can't shake about someone

**Use these specific moments and scenarios to make your interpretation feel like it was written just for them - not generic advice, but insights that feel eerily accurate to their exact situation.**

IMPORTANT: If you know the person's name, use it naturally throughout your reading to make it more personal and engaging. Address them by name when giving advice or insights. Just use it once or twice and do not bold it.

ASTROLOGICAL AWARENESS: Consider relevant astrological events and planetary influences for today's date ({current_date}) when interpreting the cards. If significant events like Venus retrograde, Mercury retrograde, eclipses, or other major astrological transits are happening today, weave this cosmic context naturally into your interpretation where it feels relevant and meaningful. Let your knowledge of astrology inform the reading without forcing it - only mention astrological events if they genuinely enhance the interpretation.

USER BIRTHDATE: The user was born on {user_birthdate}. Consider their sun sign and any relevant astrological influences based on their birthdate when providing insights that feel personally meaningful to them. No need to bold it or emphasize it. And do not mention it in the interpretation if not relevant.

CONFIDENCE IN INTERPRETATION: Trust your intuition and the cards to provide clear, definite answers. When the cards speak to yes/no questions (like "Does this person have feelings for me?" or "Should I take this job?"), give a direct, confident answer - yes, no, or a strong lean in one direction. Don't hedge with "maybe" or "it could go either way" unless the cards truly show complete ambiguity (which is rare). The cards reveal truth through symbolism and energy - let them guide you to decisive insights. Your mystical intuition combined with the card meanings allows you to take a clear stance. Justify your definite answer by the cards drawn, their positions, and the energetic story they tell, but don't be afraid to give that direct answer first. When someone asks "Does he/she like me?" - answer with conviction based on what you see in the cards, then explain why the cards confirm this. You have permission to be bold and direct - that's what makes a reading powerful and memorable.

IMPORTANT: Keep everything under 2000 characters (emojis included)

Around 200 words that hit different - keeping it under 2000 characters because we both have places to be.

FORMATTING INSTRUCTION: Use these copy-paste fonts instead of ** for bolding text. Use bold fonts for emphasis and important words/phrases, and bold italic fonts for mystical/spiritual concepts. Avoid using ** markdown syntax entirely.

Available fonts:
- Bold: 𝐪𝐰𝐞𝐫𝐭𝐲𝐮𝐢𝐨𝐩𝐚𝐬𝐝𝐟𝐠𝐡𝐣𝐤𝐥𝐳𝐱𝐜𝐯𝐛𝐧𝐦𝐐𝐖𝐄𝐑𝐓𝐘𝐔𝐈𝐎𝐏𝐀𝐒𝐃𝐅𝐆𝐇𝐉𝐊𝐋𝐙𝐗𝐂𝐕𝐁𝐍𝐌𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗𝟎
- Bold Italic: 𝒒𝒘𝒆𝒓𝒕𝒚𝒖𝒊𝒐𝒑𝒂𝒔𝒅𝒇𝒈𝒉𝒋𝒌𝒍𝒛𝒙𝒄𝒗𝒃𝒏𝒎𝑸𝑾𝑬𝑹𝑻𝒀𝑼𝑰𝑶𝑷𝑨𝑺𝑫𝑭𝑮𝑯𝑱𝑲𝑳𝒁𝑿𝑪𝑽𝑩𝑵𝑴1234567890
- Sans-serif Bold: 𝗾𝘄𝗲𝗿𝘁𝘆𝘂𝗶𝗼𝗽𝗮𝘀𝗱𝗳𝗴𝗵𝗷𝗸𝗹𝘇𝘅𝗰𝘃𝗯𝗻𝗺𝗤𝗪𝗘𝗥𝗧𝗬𝗨𝗜𝗢𝗣𝗔𝗦𝗗𝗙𝗚𝗛𝗝𝗞𝗟𝗭𝗫𝗖𝗩𝗕𝗡𝗠𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵𝟬
- Sans-serif Italic: 𝘲𝘸𝘦𝘳𝘵𝘺𝘶𝘪𝘰𝘱𝘢𝘀𝘥𝘧𝘨𝘩𝘫𝘬𝘭𝘻𝘹𝘤𝘷𝘣𝘯𝘮𝘘𝘞𝘌𝘙𝘛𝘠𝘜𝘐𝘖𝘗𝘈𝘚𝘋𝘍𝘎𝘏𝘑𝘒𝘓𝘡𝘟𝘊𝘝𝘉𝘕𝘔1234567890

Examples:
- Instead of **love**, use: 𝐥𝐨𝐯𝐞
- Instead of **spiritual**, use: 𝒔𝒑𝒊𝒓𝒊𝒕𝒖𝒂𝒍
- Instead of **journey**, use: 𝗷𝗼𝘂𝗿𝗻𝗲𝘆`;

// Copy-paste font mappings
const BOLD_FONT_MAP = {
  'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
  'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
  'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
  'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
  'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
  'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
  '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
} as const;

const BOLD_ITALIC_FONT_MAP = {
  'a': '𝒂', 'b': '𝒃', 'c': '𝒄', 'd': '𝒅', 'e': '𝒆', 'f': '𝒇', 'g': '𝒈', 'h': '𝒉', 'i': '𝒊', 'j': '𝒋',
  'k': '𝒌', 'l': '𝒍', 'm': '𝒎', 'n': '𝒏', 'o': '𝒐', 'p': '𝒑', 'q': '𝒒', 'r': '𝒓', 's': '𝒔', 't': '𝒕',
  'u': '𝒖', 'v': '𝒗', 'w': '𝒘', 'x': '𝒙', 'y': '𝒚', 'z': '𝒛',
  'A': '𝑨', 'B': '𝑩', 'C': '𝑪', 'D': '𝑫', 'E': '𝑬', 'F': '𝑭', 'G': '𝑮', 'H': '𝑯', 'I': '𝑰', 'J': '𝑱',
  'K': '𝑲', 'L': '𝑳', 'M': '𝑴', 'N': '𝑵', 'O': '𝑶', 'P': '𝑷', 'Q': '𝑸', 'R': '𝑹', 'S': '𝑺', 'T': '𝑻',
  'U': '𝑼', 'V': '𝑽', 'W': '𝑾', 'X': '𝑿', 'Y': '𝒀', 'Z': '𝒁',
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
} as const;

const SANS_SERIF_BOLD_FONT_MAP = {
  'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
  'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
  'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
  'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
  'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
  'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
  '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
} as const;

// Utility function to convert text to copy-paste fonts
export function toBoldFont(text: string): string {
  return text.split('').map(char => BOLD_FONT_MAP[char as keyof typeof BOLD_FONT_MAP] || char).join('');
}

export function toBoldItalicFont(text: string): string {
  return text.split('').map(char => BOLD_ITALIC_FONT_MAP[char as keyof typeof BOLD_ITALIC_FONT_MAP] || char).join('');
}

export function toSansSerifBoldFont(text: string): string {
  return text.split('').map(char => SANS_SERIF_BOLD_FONT_MAP[char as keyof typeof SANS_SERIF_BOLD_FONT_MAP] || char).join('');
}

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

  return `${position.emoji} ${toBoldFont(position.name)}: ${card.name}${card.reversed ? " (Reversed)" : ""}
└ Type: ${card.cardType === "major" ? "Major Arcana" : "Minor Arcana"}
└ Description: ${card.description.substring(0, 200)}...
└ Meaning: ${card.meaning}`;
}

export function formatCardSummary(card: CardInfo): string {
  const position = CARD_POSITIONS[card.position as keyof typeof CARD_POSITIONS];
  if (!position) return "";

  const status = card.reversed ? " (Reversed)" : "";
  const cardType = card.cardType === "major" ? "Major Arcana" : "Minor Arcana";

  return `${position.emoji} ${toBoldFont(position.name)}: ${card.name}${status}
└─ ${toBoldFont(cardType)}
└─ ${card.meaning}`;
}

// Fallback interpretation text
export const FALLBACK_INTERPRETATION = {
  title: `🎴 ${toBoldFont("Mystical Reading")}`,
  cardsReveal: `🔮 ${toBoldFont("The Cards Reveal")}: Your question "{question}" draws forth a fascinating journey. The {firstCard} speaks of foundations, while {secondCard} illuminates your current moment, and {thirdCard} points toward possibilities ahead.`,
  wisdom: `💡 ${toBoldFont("Whispers of Wisdom")}:\n• Trust the timing of your path\n• Your intuition holds powerful answers\n• Small steps lead to meaningful change`,
  pathForward: `🌟 ${toBoldFont("Your Path Forward")}: Embrace curiosity and stay open to synchronicities. The cards are your allies in this beautiful dance of life.`
};

// Messenger bot message constants
export const MESSAGES = {
  // Welcome and start messages
  welcome: `🎴 ${toBoldFont("Welcome to your mystical tarot reading!")} ✨\n\nThe ancient cards await your question. What wisdom do you seek from the mystical realms?`,
  getStartedWelcome: `🎴 ${toBoldFont("The cards are calling to you...")} ✨\n\nI'm here to illuminate your path with ancient wisdom and cosmic insights. 🔮 What question burns in your heart today?`,
  readingInProgress: `🔮 ${toBoldFont("Whispering to the cards...")} ✨\n\nI'm connecting with the mystical energies and drawing your three sacred cards. This may take a moment... 🌙`,
  cardsDrawn: `🎴 ${toBoldFont("Your Cards Are Drawn")} ✨\n\n${toBoldFont("Whispering with the ancient energies to reveal their story...")}`,

  // Completion messages
  readingComplete: "\n\n💫 Your daily reading is complete! Come back tomorrow for a new one. 🌟",

  // Error messages
  aiUnavailable: "AI interpretation temporarily unavailable. Please try your question again.",
  dailyLimitReached: "You've already received your daily reading! ✨\n\nCome back in {time} for a new one. 🌟",

  // Cooldown messages
  readingTooFresh: `🌙 ${toBoldFont("Your recent reading is still fresh in the mystical energies...")} ✨\n\nPlease wait a moment before requesting another reading. The cards need time to settle. 🔮`,

  // Birthdate messages
  promptBirthdate: `🎂 ${toBoldFont("To begin your mystical journey, I need your birthdate")} ✨\n\nThis helps me align the cards with your unique cosmic energy. Please enter your birthdate in this format:\n\n${toBoldFont("Example:")} Oct 15, Dec 2, Jan 30\n\n📅 ${toBoldFont("Month")} followed by ${toBoldFont("day")} (no year needed)`,
  invalidBirthdate: `❌ ${toBoldFont("Invalid format")} ✨\n\nPlease use the format: ${toBoldFont("Month day")}\n\n${toBoldFont("Examples:")} Oct 15, Dec 2, Jan 30\n\nTry again! 🔮`,
  birthdateSaved: `✨ ${toBoldFont("Birthdate saved!")} ✨\n\nYour cosmic energy is now aligned. Ready for your reading? 🔮`,

  // Prompts
  readyForReading: "Ready for your daily tarot reading? 🔮"
} as const;

// Quick reply options
export const QUICK_REPLIES = {
  start: { title: "🔮 Start My Reading", payload: "Start" },
  aboutMe: { title: "👤 About Me", payload: "About Me" },
  career: { title: "💼 Career & Work", payload: "What's my career path?" },
  love: { title: "💝 Love & Heart", payload: "How can I find true love?" },
  growth: { title: "🌱 Personal Growth", payload: "What should I focus on today?" },
  guidance: { title: "🎯 Life Guidance", payload: "What guidance do the cards have for me?" },
  quickQuestion: { title: "❓ Quick Question", payload: "Quick Question" },
  dailyInsight: { title: "✨ Daily Insight", payload: "Daily Insight" }
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
  sessionAvailable: `💫 ${toBoldFont("Your reading is ready for deeper exploration")} ✨\n\nWould you like to ask a follow-up question to gain more clarity?`,
  questionPrompt: `🔮 ${toBoldFont("What's on your mind?")} ✨\n\nAsk me anything about your reading for deeper insights:`,
  processingQuestion: `🔮 ${toBoldFont("Consulting the cards again...")} ✨\n\nI'm weaving together the mystical energies from your original reading.`,
  remainingQuestions: (remaining: number, max: number) => `📊 ${toBoldFont("Questions remaining:")} ${remaining}/${max}`,
  limitReached: `🌟 ${toBoldFont("You've reached your follow-up limit for this reading")} ✨\n\nReady to explore more mystical wisdom? Upgrade your experience!`,
  sessionEnded: `💫 ${toBoldFont("Thank you for exploring the cards deeper")} ✨\n\nMay their wisdom continue to guide your path. 🔮✨`,
  invalidQuestion: `❌ ${toBoldFont("I couldn't fully connect that question to your reading")} ✨\n\nTry rephrasing or asking about specific cards from your spread.`,
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
    return `${baseMessage}\n\n🌟 ${toBoldFont("Ready for more mystical insights?")}\n💎 ${toBoldFont("Mystic Guide")} → 5 daily readings + 3 follow-ups + deeper insights\n👑 ${toBoldFont("Oracle Master")} → Unlimited readings + 5 follow-ups + premium guidance`;
  } else if (userType === "mystic" || userType === "pro") {
    return `${baseMessage}\n\n🌟 ${toBoldFont("Seeking even deeper mystical wisdom?")}\n👑 ${toBoldFont("Upgrade to Oracle Master")} → Unlimited readings (vs 5 daily) + 5 follow-ups (vs 3) + exclusive premium features`;
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
