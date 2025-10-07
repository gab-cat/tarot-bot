import { action } from "./_generated/server";
import { v } from "convex/values";
import { FOLLOWUP_QUICK_REPLIES } from "./constants";

export interface FacebookUserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}

export const getUserProfile = action({
  args: {
    userId: v.string(), // PSID (Page-Scoped User ID)
    accessToken: v.string(),
  },
  handler: async (ctx, args): Promise<FacebookUserProfile | null> => {
    try {
      const url = `https://graph.facebook.com/v19.0/${args.userId}?fields=id,first_name,last_name,name&access_token=${encodeURIComponent(args.accessToken)}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error("Facebook API error:", response.status, await response.text());
        return null;
      }

      const profile: FacebookUserProfile = await response.json();
      return profile;
    } catch (error) {
      console.error("Error fetching user profile from Facebook:", error);
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
  handler: async (ctx, args): Promise<boolean> => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN not configured");
      return false;
    }

    try {
      const quickReplies = buildFollowupQuickReplies(args.remainingQuestions, args.questionLimit);

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
  handler: async (ctx, args): Promise<boolean> => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN not configured");
      return false;
    }

    try {
      const messageData = {
        recipient: { id: args.messengerId },
        message: {
          text: "🔮 *What's on your mind?* ✨\n\nSend me any message to ask follow-up questions about your reading for deeper insights.",
          quick_replies: [
            {
              content_type: "text",
              title: FOLLOWUP_QUICK_REPLIES.endSession.title,
              payload: FOLLOWUP_QUICK_REPLIES.endSession.payload,
            },
          ],
        },
      };

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
  handler: async (ctx, args): Promise<boolean> => {
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

// Helper functions
function buildFollowupQuickReplies(remainingQuestions: number, questionLimit: number): any[] {
  const quickReplies = [];

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

async function sendMessageToFacebook(messageData: any, accessToken: string): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;

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
