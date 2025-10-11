<!-- 152b5208-8e63-4cef-adf5-113f05ee5f1e 9f30f738-f731-4461-afcd-b0691b302bae -->
# Promotional Period Feature Implementation

## Overview

Add a promotional period feature that bypasses daily reading and follow-up limits for targeted users during a specified time period. The system will send notifications at the start and end of the promotional period.

## Schema Changes

### Add promotionalPeriods table to `convex/schema.ts`

```typescript
promotionalPeriods: defineTable({
  startDate: v.number(),           // Unix timestamp
  endDate: v.number(),             // Unix timestamp
  targetedUserIds: v.optional(v.array(v.string())),  // Messenger IDs
  targetedUserTypes: v.optional(v.array(v.string())), // ["free", "mystic", etc.]
  isActive: v.boolean(),
  createdAt: v.number(),
  deactivatedAt: v.optional(v.number()),
  scheduledEndJobId: v.optional(v.id("_scheduled_functions")),
}).index("by_active", ["isActive"])
```

## New File: `convex/promotions.ts`

Create a new module to handle all promotional period logic:

### Public Functions

- `createPromotionalPeriod` (mutation): Creates a new promo period
  - Parameters: `durationDays`, `targetedUserIds?`, `targetedUserTypes?`, `startDate?`
  - Validates no overlapping active promotions
  - Schedules end notification and auto-deactivation
  - Sends start notifications immediately if startDate is now
  - Returns the promotional period ID

- `getActivePromotionalPeriod` (query): Returns current active promo or null

- `isUserEligibleForPromo` (query): Checks if a specific user qualifies
  - Parameters: `messengerId`
  - Returns boolean indicating eligibility

- `listPromotionalPeriods` (query): Lists all promos (for admin/dashboard)

### Internal Functions

- `deactivatePromotionalPeriod` (internalMutation): Marks promo as inactive
- `sendPromotionalNotifications` (internalAction): Sends start/end notifications

## Modify Existing Files

### `convex/users.ts` - Update `canReadToday` function

Around line 120-156, add promotional period check at the beginning:

```typescript
// Check for active promotional period first
const promoEligible = await ctx.runQuery(api.promotions.isUserEligibleForPromo, {
  messengerId: args.messengerId
});
if (promoEligible) return true;

// Continue with existing limit checks...
```

### `convex/followups.ts` - Update `validateFollowupLimit` function

Around line 270-273, modify to check promotional periods:

```typescript
export async function validateFollowupLimit(
  ctx: QueryCtx, 
  messengerId: string,
  userType: string, 
  usedCount: number
): Promise<boolean> {
  // Check promotional period first
  const promoEligible = await ctx.runQuery(api.promotions.isUserEligibleForPromo, {
    messengerId
  });
  if (promoEligible) return true;
  
  // Existing logic
  const limit = FOLLOWUP_LIMITS[userType as keyof typeof FOLLOWUP_LIMITS] || 0;
  return usedCount < limit;
}
```

Note: Need to update all call sites of `validateFollowupLimit` to pass context and messengerId.

### `convex/notifications.ts` - Add promotional notification functions

Add new notification messages and functions:

- `sendPromotionalStartNotification` (internalAction): Notifies users when promo starts
- `sendPromotionalEndNotification` (internalAction): Notifies users when promo ends

Messages should be mystical/engaging, e.g.:

- Start: "🌟 A gift from the cosmos! Unlimited readings await you for the next 7 days..."
- End: "✨ The promotional period has ended. Thank you for your mystical journey..."

## Testing & Validation

Test cases to verify:

1. Create promotional period with 7 days duration
2. Verify users in targeted groups have unlimited reads/followups
3. Verify non-targeted users still have normal limits
4. Verify overlapping promos are rejected
5. Verify notifications are sent at start and end
6. Verify promotional period auto-deactivates at end time

## Example Usage

From Convex dashboard, call:

```typescript
createPromotionalPeriod({
  durationDays: 7,
  targetedUserTypes: ["free"],  // Only free users
  // or targetedUserIds: ["12345", "67890"],  // Specific users
  // or omit both for all users
})
```

For the specific 10/11-10/18 promotion mentioned, call with:

```typescript
createPromotionalPeriod({
  durationDays: 7,
  startDate: new Date("2025-10-11T00:00:00").getTime(),
  // targetedUserIds or targetedUserTypes as needed
})
```

### To-dos

- [ ] Add promotionalPeriods table to schema.ts with all required fields and index
- [ ] Create convex/promotions.ts with core promotional period logic (create, get, check eligibility, list, deactivate)
- [ ] Modify canReadToday in users.ts to check promotional period eligibility before applying normal limits
- [ ] Modify validateFollowupLimit in followups.ts to check promotional period eligibility and update all call sites
- [ ] Add promotional notification functions to notifications.ts for start and end messages
- [ ] Test the promotional period feature end-to-end (create, verify unlimited access, notifications, auto-deactivation)