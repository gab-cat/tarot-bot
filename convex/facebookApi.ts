// One-off Page setup: the Get Started button and greeting text.
//   npx convex run facebookApi:setupWelcomeScreen

import { internalAction } from "./_generated/server";
import { getPageAccessToken, graphUrl } from "./lib/messenger";

const GREETING = "🎴 Welcome to Mystical Tarot Readings ✨\n\nDiscover what the cards have to reveal about your journey. 🔮";

async function setMessengerProfile(body: object, accessToken: string): Promise<string | null> {
  const res = await fetch(graphUrl("me/messenger_profile", accessToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return `${res.status} ${await res.text().catch(() => "")}`;
  const result = (await res.json()) as { result?: string };
  return result.result === "success" ? null : JSON.stringify(result);
}

export const setupWelcomeScreen = internalAction({
  args: {},
  handler: async (): Promise<{ success: boolean; errors: string[] }> => {
    const accessToken = getPageAccessToken();
    if (!accessToken) return { success: false, errors: ["ACCESS_TOKEN is not set"] };
    const errors = [
      await setMessengerProfile({ get_started: { payload: "GET_STARTED" } }, accessToken),
      await setMessengerProfile(
        {
          greeting: [
            { locale: "default", text: GREETING },
            { locale: "en_US", text: GREETING },
          ],
        },
        accessToken,
      ),
    ].filter((error): error is string => error !== null);
    return { success: errors.length === 0, errors };
  },
});
