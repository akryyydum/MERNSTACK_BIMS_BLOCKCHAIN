# OTP Email Lookup - How It Works

## Current Implementation Status: ✅ CORRECT

The OTP system correctly checks emails from both User and Resident models.

## How Email Lookup Works

### 1. User Identification
```
User enters: username or full name
    ↓
System searches: User.username (exact match)
    ↓
If not found: User.fullName (case-insensitive)
    ↓
Result: User object
```

### 2. Email Lookup Logic

```javascript
// Step 1: Start with User model email
let email = user.contact?.email;
let emailSource = 'User model';

// Step 2: If resident/official, check Resident model (PRIORITY)
if (user.role === 'resident' || user.role === 'official') {
  const resident = await Resident.findOne({ user: user._id });
  
  if (resident?.contact?.email) {
    email = resident.contact.email;  // Override with Resident email
    emailSource = 'Resident model (priority)';
  }
}

// Step 3: Use whichever email was found
// Resident email takes priority if it exists
```

### 3. Email Priority

| Scenario | User Email | Resident Email | Which is Used? |
|----------|------------|----------------|----------------|
| Admin user | `admin@email.com` | N/A | User email ✅ |
| Resident with both | `old@email.com` | `new@email.com` | **Resident email** ✅ |
| Resident with User only | `user@email.com` | `null` | User email ✅ |
| Resident with Resident only | `null` | `resident@email.com` | **Resident email** ✅ |
| No email anywhere | `null` | `null` | **Error** ❌ |

## Debug Logging

When OTP is requested, the server logs show:

```
[OTP] User found: john_doe (resident)
[OTP] User model email: john@old.com
[OTP] Resident found: Yes
[OTP] Resident model email: john@new.com
[OTP] Final email to use: john@new.com (from Resident model (priority))
[OTP] Normalized email: john@new.com
[OTP] Generated OTP for john_doe, attempting to send to john@new.com
[OTP] SUCCESS: Email sent to john@new.com
```

## Testing Instructions

### Manual Test

1. **Create a test user with email only in Resident model:**
   ```bash
   # In MongoDB
   db.residents.updateOne(
     { _id: ObjectId("...") },
     { $set: { "contact.email": "test@example.com" } }
   )
   
   db.users.updateOne(
     { _id: ObjectId("...") },
     { $unset: { "contact.email": "" } }
   )
   ```

2. **Request OTP using username**
3. **Check server logs** - Should show Resident email is used
4. **Check email inbox** - Should receive OTP

### Automated Check

Run the diagnostic script:
```bash
node back/scripts/check-user-emails.js
```

This shows:
- All users in database
- Email in User model
- Email in Resident model (if resident/official)
- Which email OTP will use
- OTP readiness status

## Common Scenarios

### ✅ Scenario 1: Resident Updates Email via Profile
```
User edits profile → Email saved to Resident model
                   → Also synced to User model
                   → OTP uses Resident email (primary)
                   → WORKS!
```

### ✅ Scenario 2: Admin Adds Email via Resident Management
```
Admin edits resident → Email saved to Resident model
                     → Also synced to User model
                     → OTP uses Resident email
                     → WORKS!
```

### ✅ Scenario 3: Admin Adds Email via User Management
```
Admin edits user → Email saved to User model
                 → Also synced to Resident model
                 → OTP uses Resident email (if exists) or User email
                 → WORKS!
```

### ❌ Scenario 4: No Email Anywhere
```
User requests OTP → System checks User model: NONE
                  → System checks Resident model: NONE
                  → Returns error: "No email on file"
                  → User told to contact admin
                  → FAILS (as expected)
```

## Validation Layers

The OTP system has multiple validation layers:

1. **User exists?** → 404: "Account not yet registered"
2. **Email exists?** → 400: "No email on file"
3. **Email not empty?** → 400: "No email on file"
4. **Email valid format?** → 400: "Invalid email format on file"
5. **Email can be sent?** → 500: "Failed to send OTP email"

All checks pass → ✅ OTP sent successfully

## Email Sync Status

When you update emails anywhere:

| Update Location | User Model | Resident Model | Synced? |
|----------------|------------|----------------|---------|
| Resident Profile | ✅ Updated | ✅ Updated | ✅ Yes |
| Admin → Resident Mgmt | ✅ Updated | ✅ Updated | ✅ Yes |
| Admin → User Mgmt | ✅ Updated | ✅ Updated | ✅ Yes |
| Database directly | ⚠️ Manual | ⚠️ Manual | ❌ No* |

*If you update the database directly, run `sync-emails.js` to sync.

## Troubleshooting

### Issue: "No email on file" but email exists

**Check:**
```bash
node back/scripts/check-user-emails.js
```

**Look for:**
- Email in User model column
- Email in Resident model column
- Mismatch indicators

**Fix:**
```bash
node back/scripts/sync-emails.js
```

### Issue: OTP sent but to wrong email

**Cause:** Resident email differs from User email

**Solution:** System uses Resident email (correct behavior)
- Update Resident email if wrong
- Sync will happen automatically

### Issue: Want to verify which email will be used

**Check server logs when requesting OTP:**
```
[OTP] Final email to use: xxx@example.com (from Resident model (priority))
```

This shows exactly which email is being used and from which source.

## Summary

✅ **System checks BOTH User and Resident models**
✅ **Resident email takes priority (most up-to-date)**
✅ **Falls back to User email if Resident has none**
✅ **Clear error if no email found**
✅ **All updates automatically sync between models**
✅ **Comprehensive logging for debugging**

The implementation is **working correctly** and prioritizes the most recently updated email (Resident model).
