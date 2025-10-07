import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Facebook webhook verification and message handling
http.route({
  path: "/webhook",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification attempt:", { mode, token, challenge });

    // Verify the webhook
    if (mode === "subscribe" && token === "webhook_testing") {
      console.log("WEBHOOK_VERIFIED");
      return new Response(challenge, { 
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    } else {
      console.log("Verification failed - incorrect token or mode");
      return new Response("Forbidden", { status: 403 });
    }
  }),
});

http.route({
  path: "/webhook",
  method: "POST", 
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log(body);
    
    // Handle incoming messages here
    // This is where you'll process Facebook Messenger events
    
    return new Response("EVENT_RECEIVED", { status: 200 });
  }),
});

export default http;
