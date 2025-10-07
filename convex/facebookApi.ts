import { action } from "./_generated/server";
import { v } from "convex/values";

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
