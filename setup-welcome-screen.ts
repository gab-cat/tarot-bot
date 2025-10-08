#!/usr/bin/env bun

/**
 * Setup script for configuring the Facebook Messenger welcome screen
 *
 * This script configures:
 * - Get Started button with postback payload
 * - Greeting text for the welcome screen
 *
 * Run with: bun run setup-welcome-screen.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

async function setupWelcomeScreen() {
  console.log("🎴 Setting up Facebook Messenger Welcome Screen...");

  // Get Convex URL from environment
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ CONVEX_URL environment variable is required");
    process.exit(1);
  }

  // Check for required environment variables
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) {
    console.error("❌ ACCESS_TOKEN environment variable is required");
    console.log("💡 Make sure to set your Facebook Page Access Token");
    process.exit(1);
  }

  try {
    // Create Convex client
    const convex = new ConvexHttpClient(convexUrl);

    console.log("🔧 Configuring Get Started button and greeting text...");

    // Call the setup action
    const result = await convex.action(api.facebookApi.setupWelcomeScreen, {});

    if (result.success) {
      console.log("✅ Welcome screen setup completed successfully!");
      console.log("🎉 Your Facebook Page now has:");
      console.log("   • Get Started button configured");
      console.log("   • Personalized greeting text");
      console.log("   • Enhanced welcome experience for new users");
    } else {
      console.error("❌ Welcome screen setup failed:");
      result.errors.forEach(error => console.error(`   • ${error}`));
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Unexpected error during setup:", error);
    process.exit(1);
  }
}

// Run the setup
setupWelcomeScreen().catch(console.error);
