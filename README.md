# 🎴 Tarot Bot

<div align="center">
  <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun"/>
  <img src="https://img.shields.io/badge/Convex-FF6B35?style=for-the-badge&logo=convex&logoColor=white" alt="Convex"/>
  <img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini"/>
  <img src="https://img.shields.io/badge/Facebook%20Messenger-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Facebook Messenger"/>
</div>

<br/>

<div align="center">
  <h3>✨ AI-Powered Tarot Readings via Facebook Messenger ✨</h3>
  <p><em>Get personalized, insightful tarot readings that connect your past, present, and future with the wisdom of the cards</em></p>
</div>

## 🌟 About

Tarot Bot is an intelligent Facebook Messenger bot that provides personalized tarot readings powered by Google's Gemini AI. Ask any question about love, career, relationships, or life decisions, and receive a three-card reading with deep, contextual interpretations that feel like they're written just for you.

The bot draws from a complete Rider-Waite tarot deck, considering card positions (past, present, future) and reversals to provide nuanced, meaningful guidance.

## 🎯 Features

### 🔮 Core Functionality

- **AI-Powered Interpretations**: Uses Google Gemini 2.5 Pro for intelligent, contextual tarot readings
- **Three-Card Spreads**: Past, Present, Future positions for comprehensive insights
- **Card Reversals**: Cards can appear upright or reversed, adding depth to readings
- **Reading Memory (RAG)**: AI remembers and references your past readings for continuity
- **Emotional Analysis**: Real-time emotion detection adapts responses to your current state
- **Personalized Guidance**: AI analyzes your specific question to provide relevant insights
- **Contextual Follow-ups**: Unlimited follow-up questions with conversation history

### 🤖 Messenger Integration

- **Facebook Messenger Bot**: Seamless chat experience
- **Rich Card Displays**: Beautiful card images with descriptions
- **Interactive Experience**: Quick replies and intuitive conversation flow

### 👥 User Management

- **User Profiles**: Stores user information and reading history
- **Subscription System**: Free, Pro, and Pro+ tiers
- **Daily Readings**: Track and limit daily reading access
- **Session Management**: Maintains conversation context

### 🖼️ Media & Images

- **High-Quality Card Images**: Professional tarot card artwork
- **Dynamic Image Serving**: HTTP endpoints for card images
- **Image Processing**: Jimp integration for image manipulation

### 🧠 Advanced AI Features

#### Reading Memory (RAG)

- **Semantic Search**: Uses vector embeddings to find relevant past readings
- **Contextual Continuity**: AI references your previous readings when answering related questions
- **Personalized Narratives**: Builds ongoing spiritual journey stories across sessions
- **Memory Enhancement**: Full reading interpretations are embedded for comprehensive recall

#### Emotional Analysis

- **Real-time Detection**: Analyzes emotional state from every user message
- **Adaptive Responses**: AI tone adjusts based on detected emotions (anxious, sad, hopeful, etc.)
- **Empathetic Guidance**: Provides more compassionate and contextually appropriate advice
- **Emotion Tracking**: Stores emotional patterns for enhanced user understanding

## 🛠️ Tech Stack

- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager
- **[Convex](https://convex.dev/)** - Backend-as-a-Service with real-time database
- **[Google Gemini AI](https://ai.google.dev/)** - Gemini 2.5 Pro for interpretations, Gemini 2.5 Flash-Lite for emotion analysis, embedding-001 for semantic search
- **[Facebook Messenger API](https://developers.facebook.com/docs/messenger-platform/)** - Bot messaging platform
- **[Jimp](https://github.com/jimp-dev/jimp)** - JavaScript image processing
- **TypeScript** - Type-safe development

## 📋 Prerequisites

Before you begin, ensure you have:

- **Bun** installed ([Installation Guide](https://bun.sh/docs/installation))
- **Node.js** 18+ (for Convex CLI compatibility)
- **Facebook Developer Account** (for Messenger bot setup)
- **Google AI API Key** (for Gemini integration)
- **Convex Account** (for backend deployment)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/tarot-bot.git
   cd tarot-bot
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up Convex**

   ```bash
   bunx convex dev --once  # Initialize Convex project
   ```

4. **Configure environment variables** (see [Environment Setup](#environment-setup))

## ⚙️ Environment Setup

Create a `.env` file in your project root with the following variables:

```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Facebook Messenger (get from Facebook Developers)
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_VERIFY_TOKEN=your_verify_token
FACEBOOK_APP_SECRET=your_app_secret

# Convex (auto-generated when you run convex dev)
CONVEX_URL=your_convex_deployment_url

# Xendit Payment Integration
XENDIT_SECRET_KEY=xnd_development_...  # Secret API key from Xendit Dashboard (Test mode for development)
XENDIT_CALLBACK_TOKEN=your_webhook_callback_token  # Callback token from Xendit Dashboard for webhook validation
APP_BASE_URL=https://your-project.convex.cloud  # Your Convex deployment URL (replace with actual)
```

### Getting API Keys

#### Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

#### Facebook Messenger Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add Messenger product
4. Generate Page Access Token and App Secret
5. Set up webhooks pointing to your Convex HTTP endpoints

#### Xendit Setup

1. Log in to your Xendit Dashboard
2. Go to Settings > API Keys and copy the Secret Key (use Test key initially)
3. Go to Settings > Callbacks, set Invoice callback URL to `{APP_BASE_URL}/xendit/webhook`, and copy the Callback Token
4. Enable PHP currency and suitable payment methods (Cards, GCash, etc.)

**Important**: For production, set these environment variables in your Convex dashboard under project settings, not just in `.env`.

## 🎮 Usage

### Development

```bash
# Start Convex development server
bun run dev

# The bot will be available at your Convex deployment URL
```

### Testing the Bot

1. Set up your Facebook Page and connect it to your bot
2. Send a message to your page: "Tell me about my love life"
3. Receive a three-card reading with AI interpretation

### Sample Interaction

```
You: "Should I take that new job offer?"

Bot: 🎴 Your Cards Are Drawn ✨

⏮️ Past: The Hermit (Reversed)
└─ Major Arcana
└─ You've been feeling isolated...

▶️ Present: The Lovers
└─ Major Arcana
└─ A choice between two paths...

⏭️ Future: Ace of Pentacles
└─ Minor Arcana
└─ New opportunities...

🔮 The Real Deal: The cards are showing you...
```

### Advanced AI Features in Action

**Reading Memory Example:**

```
You: "I'm still worried about that job decision from last week"

Bot: Drawing from your reading on October 15th where The Lovers appeared in your present position, and considering your current anxious state, the cards show...

[AI references your previous reading context and emotional state]
```

**Emotional Analysis Example:**

```
You: "I'm so anxious about this decision"

Bot: [AI detects anxiety and adapts tone]
I understand this decision has you feeling anxious. Let's approach this with the cards' gentle wisdom...

[Response uses calming, reassuring language]
```

## 📡 API Reference

### HTTP Endpoints

#### `GET /images/cards/:filename`

Serves tarot card images.

- **Parameters**: `filename` - Card image filename (e.g., `the-fool.jpg`)
- **Returns**: JPEG image file

#### `POST /webhook` (Facebook Webhook)

Handles incoming Messenger messages and events.

### Convex Functions

#### Queries

- `users:getByMessengerId` - Get user by Messenger ID
- `readings:getByUser` - Get user's reading history
- `tarotCards:getById` - Get card information

#### Mutations

- `users:createOrUpdate` - Create/update user profile
- `readings:createReading` - Save a new reading
- `tarotCardImages:storeImage` - Store card image data

#### Actions

- `tarot:drawThreeRandomCards` - Generate AI-powered reading
- `tarot:generateFollowupResponse` - Generate contextual follow-up responses
- `ai:interpretationModel.generateInterpretation` - Core AI interpretation with RAG and emotion context
- `ai:emotionalAnalysis.analyzeEmotion` - Detect user's emotional state from text
- `rag:buildReadingMemoryContext` - Retrieve relevant past readings for RAG
- `embeddings:computeReadingEmbedding` - Generate vector embeddings for readings
- `embeddings:storeReadingEmbedding` - Store embeddings for future retrieval
- `facebookApi:getUserProfile` - Fetch user profile from Facebook

## 🗄️ Database Schema

### Users Table

```typescript
{
  messengerId: string,
  firstName?: string,
  lastName?: string,
  birthdate?: string,
  isSubscribed: boolean,
  userType: "free" | "mystic" | "oracle" | "pro" | "pro+",
  createdAt: number,
  lastActiveAt: number,
  lastReadingDate?: number,
  sessionState?: string,
  description?: string,
  descriptionLastUpdated?: number,
  followupSessionsToday?: number,
  lastFollowupAt?: number,
  scheduledNotificationId?: Id<"_scheduled_functions">,
  subscriptionStartAt?: number,
  subscriptionExpiresAt?: number,
  scheduledDowngradeId?: Id<"_scheduled_functions">,
  lastEmotionLabel?: string,
  lastEmotionAt?: number
}
```

### Readings Table

```typescript
{
  userId: Id<"users">,
  messengerId: string,
  question?: string,
  cards: Array<{
    id: string,
    name: string,
    meaning: string,
    position: string,
    reversed: boolean,
    description: string,
    cardType: string
  }>,
  interpretation: string,
  readingType: "daily" | "question" | "manual",
  createdAt: number,
  sessionState: "active" | "followup_available" | "followup_in_progress" | "completed" | "ended",
  subscriptionTier: "free" | "mystic" | "oracle" | "pro" | "pro+",
  maxFollowups: number,
  followupsUsed: number,
  conversationHistory?: Array<{
    type: "initial_reading" | "followup_question" | "followup_response" | "session_end",
    timestamp: number,
    content: string,
    questionNumber?: number,
    responseTime?: number,
    isValidQuestion?: boolean
  }>,
  lastActivityAt: number,
  embedding?: number[], // Vector embedding for RAG retrieval
  emotionLabel?: string, // Detected emotion from user's question
  emotionScores?: {
    anxious?: number,
    sad?: number,
    neutral?: number,
    hopeful?: number,
    angry?: number,
    confused?: number
  }
}
```

### Tarot Cards Table

```typescript
{
  cardId: string,
  name: string,
  arcana: string,
  meaningUpright: string,
  meaningReversed: string,
  description: string,
  keywords: string[]
}
```

## 🚀 Deployment

### Convex Deployment

```bash
# Deploy to Convex
bunx convex deploy

# Your bot will be live at: https://your-deployment.convex.cloud
```

### Facebook Webhook Setup

1. In Facebook Developers, set webhook URL to: `https://your-deployment.convex.cloud/webhook`
2. Subscribe to `messages` and `messaging_postbacks` events
3. Verify the webhook with your `FACEBOOK_VERIFY_TOKEN`

### Xendit Dashboard Steps

1. **API Keys**
   - Go to Dashboard → Settings → API Keys
   - Create/Copy Secret API Key (Test for now)

2. **Callback/Webhooks**
   - Dashboard → Settings → Callbacks (or API & Webhooks)
   - Set `Invoice` callback URL to `https://<your-deployment>.convex.cloud/xendit/webhook`
   - Set/Copy `Callback Token` and put it in `XENDIT_CALLBACK_TOKEN`

3. **Payment Methods**
   - Enable payment methods suitable for PH (Cards, GCash, GrabPay, etc.)

4. **Currencies**
   - Ensure PHP is enabled on your account

5. **Test Mode**
   - Keep in Test; use test cards/GCash sandbox per Xendit docs

6. **Go Live**
   - Switch to Live, rotate keys if needed, update Convex env vars, re-test

### Environment Variables for Production

Set the same environment variables in your Convex dashboard:

- `GEMINI_API_KEY`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `FACEBOOK_VERIFY_TOKEN`
- `FACEBOOK_APP_SECRET`
- `XENDIT_SECRET_KEY`
- `XENDIT_CALLBACK_TOKEN`
- `APP_BASE_URL`
- `ADMIN_SECRET` (for running admin operations like migrations)

## 🔄 Subscription Migration

After deploying the subscription refactor, run the migration to backfill existing paid users with subscription data:

```bash
# Set your admin secret in environment
export ADMIN_SECRET=your-admin-secret

# Run migration via HTTP endpoint
curl -X POST https://your-deployment.convex.cloud/admin/migrate-subscriptions \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

This migration will:

- Find all users with `userType: "mystic"` or `"oracle"` without subscription data
- Set `subscriptionStartAt` to current time
- Set `subscriptionExpiresAt` to 30 days from now
- Schedule automatic downgrade jobs for all migrated users

The migration is idempotent and can be run multiple times safely.

## 🧪 Development

### Project Structure

```
tarot-bot/
├── convex/                 # Convex backend functions
│   ├── _generated/         # Auto-generated types
│   ├── constants.ts        # Bot messages and config
│   ├── facebookApi.ts      # Facebook API integration
│   ├── http.ts             # HTTP endpoints
│   ├── readings.ts         # Reading management
│   ├── schema.ts           # Database schema
│   ├── tarot.ts            # Core tarot logic
│   ├── users.ts            # User management
│   └── *.json              # Tarot card data
├── index.ts                # Main entry point
├── package.json            # Dependencies
└── README.md              # This file
```

### Adding New Features

1. Define database schema changes in `schema.ts`
2. Create Convex functions in appropriate files
3. Update constants and messages as needed
4. Test with Convex dev server

### Testing

```bash
# Run Convex functions locally
bunx convex run <function-name> --args '{}'

# Test AI interpretations
bunx convex run tarot:drawThreeRandomCards --args '{"prompt": "Test question"}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add proper error handling
- Update documentation for new features
- Test thoroughly before submitting PRs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Rider-Waite Tarot Deck** - Classic tarot imagery
- **Google Gemini AI** - For intelligent interpretations
- **Convex** - Amazing backend-as-a-service
- **Facebook Messenger Platform** - For the bot interface

---

<div align="center">
  <p><em>Made with ❤️ and a touch of magic</em></p>
  <p>Questions? Issues? <a href="https://github.com/your-username/tarot-bot/issues">Open an issue</a></p>
</div>
