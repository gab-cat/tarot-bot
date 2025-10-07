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

- **AI-Powered Interpretations**: Uses Google Gemini 2.5 Flash for intelligent, contextual tarot readings
- **Three-Card Spreads**: Past, Present, Future positions for comprehensive insights
- **Card Reversals**: Cards can appear upright or reversed, adding depth to readings
- **Personalized Guidance**: AI analyzes your specific question to provide relevant insights

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

## 🛠️ Tech Stack

- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager
- **[Convex](https://convex.dev/)** - Backend-as-a-Service with real-time database
- **[Google Gemini AI](https://ai.google.dev/)** - Advanced AI for tarot interpretations
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
- `facebookApi:getUserProfile` - Fetch user profile from Facebook

## 🗄️ Database Schema

### Users Table

```typescript
{
  messengerId: string,
  firstName?: string,
  lastName?: string,
  isSubscribed: boolean,
  userType: "free" | "pro" | "pro+",
  createdAt: number,
  lastActiveAt: number,
  lastReadingDate?: number,
  sessionState?: string
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
    reversed: boolean
  }>,
  interpretation: string,
  readingType: "daily" | "question" | "manual",
  createdAt: number
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

### Environment Variables for Production

Set the same environment variables in your Convex dashboard:

- `GEMINI_API_KEY`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `FACEBOOK_VERIFY_TOKEN`
- `FACEBOOK_APP_SECRET`

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
