# Email Removal Fix - Ensuring OTP Fails When Email is Removed

## Problem Statement
When email is removed from resident record, OTP should fail but was still being sent.

**Root Cause:** Email might have been removed from Resident model but still existed in User model, causing OTP to still work.

## Solution Implemented

### 1. Automatic Sync on Email Removal

Both `residentProfileController.js` and `adminResidentController.js` now **automatically sync** email removal to User model:

```javascript
// When email is removed (set to empty/null)
if (resident.user) {
  await User.findByIdAndUpdate(resident.user, { 
    $unset: { 'contact.email': '' }  // Removes email from User model
  });
}
```

This ensures that when you remove email from resident, it's also removed from the User model.

### 2. Enhanced OTP Email Lookup

The OTP system checks **both** models with proper priority:

```javascript
// Step 1: Check User model
let email = user.contact?.email;

// Step 2: Check Resident model (higher priority)
if (user.role === 'resident' || user.role === 'official') {
  const resident = await Resident.findOne({ user: user._id });
  if (resident?.contact?.email) {
    email = resident.contact.email;  // Use Resident email
  }
}

// Step 3: Validate email exists
if (!email || !email.trim()) {
  return res.status(400).json({ 
    message: 'No email on file. Please contact your admin.' 
  });
}
```

**Result:** If email is removed from both models, OTP request will fail with clear error.

## How Email Removal Works Now

### Scenario A: Remove Email via Resident Profile

```
User goes to Profile
    ↓
Removes/clears email field
    ↓
Saves changes
    ↓
Backend: Sets resident.contact.email = null
    ↓
Backend: Removes email from User model (sync)
    ↓
[SYNC] Log: "Removing email from User model (resident email removed)"
    ↓
Result: Email removed from BOTH models ✅
    ↓
OTP Request: FAILS with "No email on file" ✅
```

### Scenario B: Remove Email via Admin Resident Management

```
Admin goes to Resident Management
    ↓
Edits resident, removes email
    ↓
Saves changes
    ↓
Backend: Updates resident.contact.email = null
    ↓
Backend: Removes email from User model (sync)
    ↓
[SYNC] Log: "Admin update: Removing email from User model"
    ↓
Result: Email removed from BOTH models ✅
    ↓
OTP Request: FAILS with "No email on file" ✅
```

## Logging Added

When email is removed, you'll see in server console:

```
[SYNC] Removing email from User model (resident email removed)
```

When OTP is requested for user without email:

```
[OTP] User found: username (resident)
[OTP] User model email: NONE
[OTP] Resident found: Yes
[OTP] Resident model email: NONE
[OTP] Final email to use: NONE (from User model)
[OTP] FAIL: No valid email found
```

## Testing Instructions

### Step 1: Create Test User with Email
```bash
# Via UI: Register new user with email
# OR via Admin: Create resident with email
```

### Step 2: Verify Email Exists
```bash
node back/scripts/test-email-removal.js
```

Expected output:
```
👤 Testing: testuser (resident)
   User Model Email: test@example.com
   Resident Model Email: test@example.com
   
   🔐 OTP System Behavior:
   ✅ WILL SEND OTP to: test@example.com
   📧 Email source: Resident model (priority)
   
   ✅ Correctly synced: Email exists in both models
```

### Step 3: Remove Email
Go to:
- **Option A:** Resident Profile → Edit email → Clear field → Save
- **Option B:** Admin Resident Management → Edit resident → Clear email → Save

### Step 4: Check Server Logs
You should see:
```
[SYNC] Removing email from User model (resident email removed)
```

### Step 5: Verify Email Removed
```bash
node back/scripts/test-email-removal.js
```

Expected output:
```
👤 Testing: testuser (resident)
   User Model Email: NONE
   Resident Model Email: NONE
   
   🔐 OTP System Behavior:
   ❌ WILL REJECT OTP REQUEST
   💬 Error: "No email on file. Please contact your admin."
   
   ✅ Correctly synced: No email in either model
   → OTP will properly fail
```

### Step 6: Test OTP Request
Try to request OTP for that user via the forgot password form.

Expected result:
```
❌ Error: "No email on file. Please contact your admin."
```

## Common Issues & Solutions

### Issue: "Still sending OTP after removing email"

**Possible causes:**

1. **Email only removed from Resident model, still in User model**
   
   **Check:**
   ```bash
   node back/scripts/test-email-removal.js
   ```
   
   **Fix:**
   ```bash
   node back/scripts/sync-emails.js
   ```

2. **Browser cache showing old data**
   
   **Fix:** Hard refresh (Ctrl+Shift+R) or clear browser cache

3. **Removed email from UI but didn't save/submit**
   
   **Fix:** Make sure to click Save/Submit button

### Issue: "Sync not happening"

**Check server logs when saving:** Should see `[SYNC] Removing email from User model`

**If no log appears:**
- Backend server might not be running
- Check if changes are reaching backend (network tab in browser)
- Verify the update endpoint is being called

### Issue: "Sync happened but OTP still works"

**This should NOT happen with current implementation.**

**Debug steps:**
1. Run `node back/scripts/test-email-removal.js`
2. Check if email exists in User model vs Resident model
3. Check server logs when OTP requested - should show which email it found
4. If email still in either model, sync didn't work properly

## Verification Checklist

✅ **Email Removal Syncs Properly**
- [ ] Remove email via Resident Profile → Both models updated
- [ ] Remove email via Admin Resident Management → Both models updated
- [ ] Server logs show `[SYNC] Removing email from User model`

✅ **OTP Fails After Email Removal**
- [ ] Test script shows "NONE" for both User and Resident emails
- [ ] OTP request returns "No email on file" error
- [ ] No OTP email sent

✅ **Email Addition Still Works**
- [ ] Add email via any method → Syncs to both models
- [ ] OTP request succeeds
- [ ] OTP email received

## Technical Details

### Files Modified

1. **residentProfileController.js**
   - Added User model sync when email removed
   - Added logging for sync operations

2. **adminResidentController.js**
   - Enhanced User model sync for email removal
   - Added logging for admin email updates

3. **authController.js**
   - Already had proper email lookup from both models
   - Added detailed logging for debugging

### Sync Operations

**When email is set:**
```javascript
await User.findByIdAndUpdate(resident.user, { 
  $set: { 'contact.email': newEmail } 
});
```

**When email is removed:**
```javascript
await User.findByIdAndUpdate(resident.user, { 
  $unset: { 'contact.email': '' } 
});
```

### Database State

After email removal, database should show:

**User collection:**
```json
{
  "_id": "...",
  "username": "testuser",
  "contact": {
    "mobile": "1234567890"
    // Note: "email" field completely removed
  }
}
```

**Resident collection:**
```json
{
  "_id": "...",
  "firstName": "Test",
  "lastName": "User",
  "contact": {
    "mobile": "1234567890"
    // Note: "email" field completely removed or null
  }
}
```

## Summary

✅ **Email removal from Resident → Auto-syncs to User model**
✅ **OTP checks both models → Fails if neither has email**
✅ **Comprehensive logging → Easy to debug**
✅ **Test scripts → Verify sync is working**

**The fix ensures that removing email from resident profile or admin panel will prevent OTP from being sent.**
