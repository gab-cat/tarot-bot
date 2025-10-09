# User Profile Migration Guide

## Overview

The migration function allows you to backfill user profile information for existing users who don't have first names and last names stored in the database. This is useful for users who were created before we implemented the Facebook API workarounds.

## What It Does

- **Finds users** without `firstName` and `lastName` in the database
- **Attempts to fetch** their profile information from Facebook API
- **Updates the database** with the fetched information
- **Provides detailed logging** of the migration process

## Important Limitations

⚠️ **Cannot migrate phone-registered users:** Users who registered Facebook via phone number only cannot be migrated because their profile information cannot be accessed via the API.

## Usage

### Run Migration (Production)

```bash
# Migrate all users without names (10 users at a time)
bunx convex run users:migrateUserProfiles

# Migrate with custom batch size
bunx convex run users:migrateUserProfiles --batchSize 5

# Dry run - see what would be done without making changes
bunx convex run users:migrateUserProfiles --dryRun true
```

### Run Migration (Development)

```bash
# In development
bunx convex run users:migrateUserProfiles
```

## Expected Output

### Successful Migration

```
🔄 Starting user profile migration (batchSize: 10, dryRun: false)
📊 Found 25 users without profile information
📦 Processing batch of 10 users...
🔍 Processing user 24692744937054541...
✅ Successfully fetched profile for user 24692744937054541: { has_first_name: true, has_last_name: true }
🔍 Processing user 24692744937054542...
⚠️ Cannot fetch profile for user 24692744937054542 (likely phone-registered)
✅ Batch complete: 7 successful, 3 failed
📦 Processing batch of 10 users...
...
🎉 Migration complete: {
  success: true,
  processed: 25,
  successful: 18,
  failed: 7,
  message: "Migration complete: 18/25 users updated successfully"
}
```

### No Users Need Migration

```
🔄 Starting user profile migration (batchSize: 10, dryRun: false)
📊 Found 0 users without profile information
✅ No users need migration
{
  success: true,
  processed: 0,
  successful: 0,
  failed: 0,
  message: "No users need migration"
}
```

## Parameters

| Parameter   | Type    | Default | Description                                                 |
| ----------- | ------- | ------- | ----------------------------------------------------------- |
| `batchSize` | number  | 10      | How many users to process at once                           |
| `dryRun`    | boolean | false   | If true, only log what would be done without making changes |

## How It Works

### Step 1: Find Users Without Names

```typescript
// Finds users where both firstName and lastName are missing or empty
const users = await ctx.db
  .query("users")
  .filter((q) =>
    q.and(
      q.or(
        q.eq(q.field("firstName"), undefined),
        q.eq(q.field("firstName"), "")
      ),
      q.or(q.eq(q.field("lastName"), undefined), q.eq(q.field("lastName"), ""))
    )
  )
  .collect();
```

### Step 2: Process in Batches

- Processes users in batches to avoid overwhelming the API
- Each batch is processed concurrently for efficiency
- Failed users don't stop the migration of others

### Step 3: Attempt Profile Fetch

For each user:

1. Try to fetch profile using standard API (`getUserProfile`)
2. If successful, update the database
3. If failed (likely phone-registered user), mark as failed

### Step 4: Update Database

```typescript
await ctx.runMutation(internal.users.updateUserProfile, {
  messengerId: user.messengerId,
  firstName: userProfile.first_name,
  lastName: userProfile.last_name,
});
```

## Migration Results

After running the migration, you should see:

### Database Updates

- Users with accessible profiles will have `firstName` and `lastName` populated
- No changes for phone-registered users (cannot be migrated)

### Improved User Experience

- Users who previously got generic greetings now get personalized ones
- Better overall bot experience for users with accessible profiles

## Monitoring Migration

### Check Migration Progress

```bash
# View Convex logs during migration
bunx convex logs

# Or check the function return value
bunx convex run users:migrateUserProfiles
```

### Verify Results

```bash
# Check how many users now have names
bunx convex run users:getUsersWithoutNames
```

## Best Practices

### 1. Run During Low Traffic

- Run the migration during off-peak hours
- Monitor API rate limits (Facebook has limits)

### 2. Start with Dry Run

```bash
# Always test with dry run first
bunx convex run users:migrateUserProfiles --dryRun true
```

### 3. Monitor Success Rate

- Expect ~50-70% success rate (phone-registered users will fail)
- If success rate is very low, check Facebook permissions

### 4. Re-run Periodically

- Re-run migration for new users who don't have names
- Useful after major bot updates or user onboarding improvements

## Troubleshooting

### Low Success Rate (<30%)

**Problem:** Most migrations are failing
**Solution:**

- Check Facebook permissions in Developer Dashboard
- Verify Page Access Token is valid
- Ensure `ACCESS_TOKEN` environment variable is set correctly

### All Migrations Fail

**Problem:** Every user migration fails
**Solution:**

- Check Convex logs for detailed error messages
- Verify API connectivity
- Check Facebook API status

### Migration Times Out

**Problem:** Large batches time out
**Solution:**

- Reduce batch size: `--batchSize 5`
- Process in multiple runs

## Technical Details

### Functions Created

| Function               | Type               | Purpose                      |
| ---------------------- | ------------------ | ---------------------------- |
| `migrateUserProfiles`  | `internalAction`   | Main migration function      |
| `getUsersWithoutNames` | `internalQuery`    | Find users needing migration |
| `updateUserProfile`    | `internalMutation` | Update user profile data     |

### Database Changes

**Before Migration:**

```json
{
  "messengerId": "24692744937054541",
  "firstName": null,
  "lastName": null,
  "userType": "free"
}
```

**After Successful Migration:**

```json
{
  "messengerId": "24692744937054541",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "userType": "free"
}
```

### Environment Requirements

- ✅ `ACCESS_TOKEN` environment variable must be set
- ✅ Valid Facebook Page Access Token with proper permissions
- ✅ Convex deployment with access to the database

## Summary

The migration function provides a way to backfill user profile information for existing users, improving the personalization of your tarot bot. While it can't help with phone-registered users (Facebook limitation), it will significantly improve the experience for users with accessible profiles.

**Run it regularly** to ensure new users get the best possible experience!
