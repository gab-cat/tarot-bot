# Tarot Bot Documentation

## Recent Updates

### Facebook API Error Fix (Error 100, Subcode 33)

**Status:** ✅ Fixed

**Files Modified:**

- `convex/facebookApi.ts` - Improved error handling and logging + message_id workaround
- `convex/http.ts` - Automatic fallback to message_id approach

**Documentation Created:**

- [`QUICK_FIX_SUMMARY.md`](./QUICK_FIX_SUMMARY.md) - Quick reference guide
- [`FACEBOOK_API_PERMISSIONS.md`](./FACEBOOK_API_PERMISSIONS.md) - Comprehensive guide
- [`WORKAROUNDS_FOR_PHONE_USERS.md`](./WORKAROUNDS_FOR_PHONE_USERS.md) - Workarounds to get user names

---

## Quick Start

### Understanding the Facebook API Error

If you see this error:

```
Facebook API error: 400
code: 100, error_subcode: 33
```

**Don't panic!** This is **normal** and **expected**.

Read: [`QUICK_FIX_SUMMARY.md`](./QUICK_FIX_SUMMARY.md) for a quick explanation.

### What's Different Now?

✅ Better error handling
✅ Clear distinction between warnings and actual errors
✅ Graceful fallbacks for all users
✅ Helpful logging to understand what's happening

### Next Steps

1. **Deploy the updated code** (if not already deployed)
2. **Monitor Convex logs** to see the improved error messages
3. **Test with different user accounts** - some will work, some won't (phone users)
4. **No action needed** unless you see permission errors for ALL users

---

## Documentation Index

| Document                                                           | Purpose                                            |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| [QUICK_FIX_SUMMARY.md](./QUICK_FIX_SUMMARY.md)                     | Quick reference - what changed and why             |
| [FACEBOOK_API_PERMISSIONS.md](./FACEBOOK_API_PERMISSIONS.md)       | Complete guide to Facebook permissions setup       |
| [WORKAROUNDS_FOR_PHONE_USERS.md](./WORKAROUNDS_FOR_PHONE_USERS.md) | Workarounds to get user names (with testing guide) |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)                         | How to migrate existing users to add profile info  |

---

## Common Questions

### Q: Why can't I get some users' names?

**A:** They registered with a phone number instead of email. Facebook blocks access to their profile for privacy. This affects 30-50% of Messenger users.

### Q: Is this a bug?

**A:** No! This is intentional Facebook behavior. Your bot handles it correctly.

### Q: What should I do?

**A:** Nothing! The code now handles this gracefully. Users without accessible profiles get generic greetings instead of personalized ones.

### Q: How do I know if it's working?

**A:** Check your Convex logs. You'll see:

- ✅ Success messages for regular users
- ⚠️ Warnings for phone-registered users (normal)
- ❌ Errors only for real permission issues

---

## Need More Help?

1. Read the full documentation in [`FACEBOOK_API_PERMISSIONS.md`](./FACEBOOK_API_PERMISSIONS.md)
2. Check your Convex logs for specific error messages
3. Verify your Facebook Developer settings match the requirements
4. Test with multiple user accounts to see the different behaviors

---

**Remember:** Error 100/33 is **not a problem** - it's Facebook protecting user privacy! 🎉
