import { action } from "./_generated/server";
import { v } from "convex/values";
import { FOLLOWUP_QUICK_REPLIES, toBoldFont } from "./constants";

export interface FacebookUserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}

// Facebook API types
interface FacebookQuickReply {
  content_type: "text";
  title: string;
  payload: string;
}

interface FacebookMessageData {
  recipient: { id: string };
  message: {
    text?: string;
    attachment?: {
      type: string;
      payload: { url: string };
    };
    quick_replies?: FacebookQuickReply[];
  };
}

/**
 * Attempts to get user profile from Facebook using PSID.
 * Note: This will fail for users registered via phone number (error 100/33).
 */
export const getUserProfile = action({
  args: {
    userId: v.string(), // PSID (Page-Scoped User ID)
    accessToken: v.string(),
  },
  handler: async (_, args): Promise<FacebookUserProfile | null> => {
    try {
      const url = `https://graph.facebook.com/v23.0/${args.userId}?fields=id,first_name,last_name,name&access_token=${encodeURIComponent(args.accessToken)}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }

        const errorCode = errorData?.error?.code;
        const errorSubcode = errorData?.error?.error_subcode;

        // Error 100 with subcode 33 typically means:
        // 1. User registered via phone number (cannot query their profile)
        // 2. Missing permissions
        // 3. Invalid PSID
        if (errorCode === 100 && errorSubcode === 33) {
          console.warn(
            `Cannot fetch profile for PSID ${args.userId}. ` +
            `This user likely registered via phone number, which prevents profile access via Graph API. ` +
            `Error details:`,
            errorData
          );
        } else {
          console.error(
            `Facebook API error fetching user profile (PSID: ${args.userId}):`,
            response.status,
            errorData
          );
        }
        return null;
      }

      const profile: FacebookUserProfile = await response.json();
      console.log(`Successfully fetched profile for PSID ${args.userId}:`, {
        id: profile.id,
        has_first_name: !!profile.first_name,
        has_last_name: !!profile.last_name,
      });
      return profile;
    } catch (error) {
      console.error("Error fetching user profile from Facebook:", error);
      return null;
    }
  },
});

/**
 * WORKAROUND: Attempts to get user info via message_id instead of PSID.
 * This may work for phone-registered users since we're querying the message object,
 * not the user profile directly.
 */
export const getUserProfileViaMessage = action({
  args: {
    messageId: v.string(), // Facebook message ID (mid)
    accessToken: v.string(),
  },
  handler: async (_, args): Promise<FacebookUserProfile | null> => {
    try {
      const url = `https://graph.facebook.com/v23.0/${args.messageId}?fields=from&access_token=${encodeURIComponent(args.accessToken)}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }

        console.warn(
          `Cannot fetch sender info via message_id ${args.messageId}:`,
          errorData
        );
        return null;
      }

      const messageData = await response.json();
      
      // The 'from' field should contain sender info
      if (messageData.from) {
        const profile: FacebookUserProfile = {
          id: messageData.from.id,
          name: messageData.from.name,
          first_name: messageData.from.first_name,
          last_name: messageData.from.last_name,
        };
        
        console.log(`Successfully fetched profile via message_id ${args.messageId}:`, {
          id: profile.id,
          has_name: !!profile.name,
          has_first_name: !!profile.first_name,
          has_last_name: !!profile.last_name,
        });
        
        return profile;
      }

      console.warn(`No 'from' field in message ${args.messageId}`);
      return null;
    } catch (error) {
      console.error("Error fetching user profile via message_id:", error);
      return null;
    }
  },
});

export const sendFollowupResponse = action({
  args: {
    messengerId: v.string(),
    response: v.string(),
    remainingQuestions: v.number(),
    questionLimit: v.number(),
  },
  handler: async (_, args): Promise<boolean> => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN not configured");
      return false;
    }

    try {
      const quickReplies = buildFollowupQuickReplies(args.remainingQuestions);

      const messageData = {
        recipient: { id: args.messengerId },
        message: {
          text: args.response,
          quick_replies: quickReplies,
        },
      };

      const result = await sendMessageToFacebook(messageData, accessToken);
      return result;
    } catch (error) {
      console.error("Error sending follow-up response:", error);
      return false;
    }
  },
});

export const sendFollowupPrompt = action({
  args: {
    messengerId: v.string(),
  },
  handler: async (_, args): Promise<boolean> => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN not configured");
      return false;
    }

    try {
      const messageData = {
        recipient: { id: args.messengerId },
        message: {
          text: `🔮 ${toBoldFont("What's on your mind?")} ✨\n\nSend me any message to ask follow-up questions about your reading for deeper insights.\n\n⏰ ${toBoldFont("Follow-ups will be entertained within 10 minutes")}`,
          quick_replies: [
            {
              content_type: "text",
              title: FOLLOWUP_QUICK_REPLIES.endSession.title,
              payload: FOLLOWUP_QUICK_REPLIES.endSession.payload,
            },
          ],
        },
      } as FacebookMessageData;

      const result = await sendMessageToFacebook(messageData, accessToken);
      return result;
    } catch (error) {
      console.error("Error sending follow-up prompt:", error);
      return false;
    }
  },
});

export const sendSessionEnded = action({
  args: {
    messengerId: v.string(),
    message: v.string(),
  },
  handler: async (_, args): Promise<boolean> => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN not configured");
      return false;
    }

    try {
      const messageData = {
        recipient: { id: args.messengerId },
        message: {
          text: args.message,
        },
      };

      const result = await sendMessageToFacebook(messageData, accessToken);
      return result;
    } catch (error) {
      console.error("Error sending session ended message:", error);
      return false;
    }
  },
});

export const sendDailyReadingNotification = action({
  args: {
    messengerId: v.string(),
    message: v.string(),
  },
  handler: async (_, args): Promise<boolean> => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN not configured");
      return false;
    }

    try {
      const messageData = {
        recipient: { id: args.messengerId },
        message: {
          text: args.message,
          quick_replies: [
            {
              content_type: "text",
              title: "🔮 Start My Reading",
              payload: "Start",
            },
          ],
        },
      } as FacebookMessageData;

      const result = await sendMessageToFacebook(messageData, accessToken);
      return result;
    } catch (error) {
      console.error("Error sending daily reading notification:", error);
      return false;
    }
  },
});

// Helper functions
function buildFollowupQuickReplies(remainingQuestions: number): FacebookQuickReply[] {
  const quickReplies: FacebookQuickReply[] = [];

  if (remainingQuestions > 0) {
    quickReplies.push({
      content_type: "text",
      title: FOLLOWUP_QUICK_REPLIES.askQuestion.title,
      payload: FOLLOWUP_QUICK_REPLIES.askQuestion.payload,
    });
  } else {
    quickReplies.push({
      content_type: "text",
      title: FOLLOWUP_QUICK_REPLIES.upgradePrompt.title,
      payload: FOLLOWUP_QUICK_REPLIES.upgradePrompt.payload,
    });
  }

  // Always include end session option
  quickReplies.push({
    content_type: "text",
    title: FOLLOWUP_QUICK_REPLIES.endSession.title,
    payload: FOLLOWUP_QUICK_REPLIES.endSession.payload,
  });

  return quickReplies;
}

// Welcome Screen API functions
export const setupWelcomeScreen = action({
  args: {},
  handler: async (): Promise<{success: boolean, errors: string[]}> => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      return { success: false, errors: ["ACCESS_TOKEN not configured"] };
    }

    const errors: string[] = [];

    try {
      // Set up Get Started button
      const getStartedSuccess = await setupGetStartedButton(accessToken);
      if (!getStartedSuccess) {
        errors.push("Failed to set up Get Started button");
      }

      // Set up greeting text
      const greetingSuccess = await setupGreetingText(accessToken);
      if (!greetingSuccess) {
        errors.push("Failed to set up greeting text");
      }

      return {
        success: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error("Error setting up welcome screen:", error);
      return { success: false, errors: ["Unexpected error occurred"] };
    }
  },
});

async function setupGetStartedButton(accessToken: string): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v23.0/me/messenger_profile?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        get_started: {
          payload: "GET_STARTED"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to set Get Started button:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("Get Started button setup result:", result);
    return result.result === "success";
  } catch (error) {
    console.error("Error setting up Get Started button:", error);
    return false;
  }
}

async function setupGreetingText(accessToken: string): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v23.0/me/messenger_profile?access_token=${encodeURIComponent(accessToken)}`;

    const greetingData = {
      greeting: [
        {
          locale: "default",
          text: "🎴 Welcome to Mystical Tarot Readings ✨\n\nDiscover what the cards have to reveal about your journey. 🔮"
        },
        {
          locale: "en_US",
          text: "🎴 Welcome to Mystical Tarot Readings ✨\n\nDiscover what the cards have to reveal about your journey. 🔮"
        }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(greetingData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to set greeting text:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("Greeting text setup result:", result);
    return result.result === "success";
  } catch (error) {
    console.error("Error setting up greeting text:", error);
    return false;
  }
}

export const takeThreadControl = action({
  args: {
    recipientId: v.string(),
    accessToken: v.string(),
  },
  handler: async (_, args): Promise<boolean> => {
    try {
      const url = `https://graph.facebook.com/v23.0/me/take_thread_control?access_token=${encodeURIComponent(args.accessToken)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: args.recipientId },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to take thread control:", response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log("Thread control taken successfully:", result);
      return result.success === true;
    } catch (error) {
      console.error("Error taking thread control:", error);
      return false;
    }
  },
});

async function sendMessageToFacebook(messageData: FacebookMessageData, accessToken: string): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v23.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Facebook Messenger API error:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    return !!result.recipient_id;
  } catch (error) {
    console.error("Error sending message to Facebook:", error);
    return false;
  }
}
