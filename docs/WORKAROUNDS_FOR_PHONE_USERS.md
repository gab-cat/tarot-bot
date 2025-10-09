# Workarounds for Getting Names from Phone-Registered Users

## The Problem

Facebook users who registered using **only a phone number** cannot have their profile information queried via the standard Graph API endpoint (`/{PSID}?fields=first_name,last_name`). This results in error code 100 with subcode 33.

**Approximately 30-50% of Messenger users** fall into this category, so having workarounds is important for a personalized user experience.

---

## ✅ Workaround #1: Message ID Approach (IMPLEMENTED)

### How It Works

Instead of querying the user profile directly via PSID:

```
GET /{PSID}?fields=first_name,last_name  ❌ Fails for phone users
```

We query the **message object** and extract sender information from it:

```
GET /{message_id}?fields=from  ✅ May work for phone users
```

### Why This Might Work

When you query a message object, Facebook includes a `from` field with the sender's information. This data is part of the message context rather than directly querying the user profile, so it _might_ bypass the phone-registration restriction.

**Note:** This is not officially documented as a workaround, but it's worth trying!

### Implementation

**File: `convex/facebookApi.ts`**

```typescript
export const getUserProfileViaMessage = action({
  args: {
    messageId: v.string(), // Facebook message ID (mid)
    accessToken: v.string(),
  },
  handler: async (_, args): Promise<FacebookUserProfile | null> => {
    // Queries the message object instead of user profile
    const url = `https://graph.facebook.com/v23.0/${args.messageId}?fields=from&...`;
    // ... returns from.name, from.first_name, from.last_name if available
  },
});
```

**File: `convex/http.ts`**

```typescript
// First, try the standard approach
userProfile = await ctx.runAction(api.facebookApi.getUserProfile, {
  userId: senderId,
  accessToken,
});

// If that fails, try the message_id workaround
if (!userProfile && messageId) {
  userProfile = await ctx.runAction(api.facebookApi.getUserProfileViaMessage, {
    messageId,
    accessToken,
  });
}
```

### Testing

1. **Deploy the updated code**
2. **Test with different user types:**
   - User with regular Facebook account (email/password)
   - User registered with phone number only
3. **Check Convex logs:**

**Expected outcomes:**

**Regular user:**

```
✅ Successfully fetched profile for PSID 123456789
   { id: '123456789', has_first_name: true, has_last_name: true }
```

**Phone-registered user (best case):**

```
⚠️ Cannot fetch profile for PSID 987654321 (error 100/33)
📝 Trying workaround: fetching user profile via message_id m_abc123...
✅ Successfully fetched profile via message_id m_abc123
   { id: '987654321', has_name: true, has_first_name: true, has_last_name: true }
```

**Phone-registered user (if workaround also fails):**

```
⚠️ Cannot fetch profile for PSID 987654321 (error 100/33)
📝 Trying workaround: fetching user profile via message_id m_abc123...
⚠️ Cannot fetch sender info via message_id m_abc123 (also failed)
   → Bot will use generic greeting
```

### Limitations

- **Only works for messages**, not postbacks (e.g., "Get Started" button won't have a message_id)
- **May still fail** for phone-registered users (not guaranteed to work)
- **Requires additional API call** (slight performance impact)

---

## 🔄 Workaround #2: Ask Users Directly (OPTIONAL)

### How It Works

If both API approaches fail, politely ask users to provide their name in the conversation. This is:

- ✅ 100% reliable
- ✅ Works for all user types
- ✅ Can be more personal and engaging
- ❌ Requires user action
- ❌ Some users might not respond

### Implementation Guide

If you want to implement this feature, you'll need to:

#### 1. Update Schema (`convex/schema.ts`)

Add a new session state for collecting user names:

```typescript
sessionState: v.union(
  v.literal("waiting_question"),
  v.literal("reading_in_progress"),
  v.literal("reading_complete"),
  v.literal("followup_available"),
  v.literal("followup_in_progress"),
  v.literal("waiting_name"),  // NEW
  // ...
),
```

#### 2. Add Mutation to Handle Name Collection (`convex/users.ts`)

```typescript
export const setWaitingName = mutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) =>
        q.eq("messengerId", args.messengerId)
      )
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        sessionState: "waiting_name",
      });
    }
  },
});

export const saveUserName = mutation({
  args: {
    messengerId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) =>
        q.eq("messengerId", args.messengerId)
      )
      .first();

    if (user) {
      // Parse the name (simple approach: first word = firstName, rest = lastName)
      const nameParts = args.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || undefined;

      await ctx.db.patch(user._id, {
        firstName,
        lastName,
        sessionState: null, // Clear session state
      });
    }
  },
});
```

#### 3. Update Webhook Handler (`convex/http.ts`)

When user profile cannot be fetched from Facebook:

```typescript
// After trying both API approaches
if (!userProfile) {
  // Check if we already have a saved name
  const existingUser = await ctx.runQuery(api.users.getUserByMessengerId, {
    messengerId: senderId,
  });

  if (!existingUser?.firstName) {
    // Ask user for their name
    await ctx.runMutation(api.users.setWaitingName, { messengerId: senderId });
    await sendTextMessage(
      senderId,
      "✨ To personalize your reading, what name would you like me to call you?",
      accessToken
    );
    continue; // Wait for user response
  }
}
```

Add handler for when user provides their name:

```typescript
// In the message processing section
if (sessionState === "waiting_name") {
  // User is providing their name
  await ctx.runMutation(api.users.saveUserName, {
    messengerId: senderId,
    name: trimmedText,
  });

  await sendTextMessage(
    senderId,
    `🌟 Thank you! Nice to meet you. What question would you like to ask the cards today?`,
    accessToken,
    [QUICK_REPLIES.start]
  );
  continue;
}
```

#### 4. Privacy Considerations

- ✅ Inform users why you're asking for their name
- ✅ Make it optional (allow users to skip)
- ✅ Don't require full legal names
- ✅ Add this to your privacy policy

### Example Flow

```
Bot: ✨ Welcome! To personalize your reading, what name would you like me to call you?
     (Or type "skip" to continue)

User: Sarah

Bot: 🌟 Thank you, Sarah! Nice to meet you.
     What question would you like to ask the cards today?
```

---

## 🎯 Recommendation

### Start with Workaround #1 (Already Implemented)

1. **Deploy the code** with the message_id approach
2. **Monitor your logs** for 1-2 weeks
3. **Check success rate:**
   - How many users get names via PSID?
   - How many get names via message_id workaround?
   - How many have no name data?

### Add Workaround #2 if Needed

Only implement the "ask users directly" feature if:

- ✅ Message_id approach doesn't work (still gets error for phone users)
- ✅ You have a high percentage of users without names
- ✅ Personalization is critical for your bot's experience

### Current Fallback Works Fine

Remember: Your bot already handles missing names gracefully!

- ✅ "Welcome!" instead of "Welcome, John!"
- ✅ All features work regardless of name availability
- ✅ No errors or broken flows

---

## Testing Checklist

- [ ] Deploy updated code with message_id workaround
- [ ] Test with regular Facebook account user
- [ ] Test with phone-registered user (if possible)
- [ ] Check Convex logs for both scenarios
- [ ] Verify fallback messages work correctly
- [ ] Monitor production logs for 1-2 weeks
- [ ] Decide if Workaround #2 is needed based on data

---

## Summary

| Approach                         | Reliability            | Complexity | Status           |
| -------------------------------- | ---------------------- | ---------- | ---------------- |
| **Standard API** (PSID)          | 50-70%                 | Simple     | ✅ Implemented   |
| **Workaround #1** (message_id)   | Unknown (worth trying) | Simple     | ✅ Implemented   |
| **Workaround #2** (ask directly) | 100%                   | Moderate   | 📝 Optional      |
| **Fallback** (no name)           | 100%                   | None       | ✅ Already works |

**Best practice:** Try Workaround #1 first, monitor results, then decide if Workaround #2 is necessary.
