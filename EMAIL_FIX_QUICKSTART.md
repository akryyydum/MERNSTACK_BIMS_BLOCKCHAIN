# Quick Fix Guide: Email/OTP Not Working

## Problem Summary
OTP emails were not being sent because the system couldn't find the email address when:
- User added email via Resident Profile
- Admin added email via Resident Management
- Admin added email via User Management

## Root Cause
Email was saved to `Resident` model but OTP system only checked `User` model.

---

## ✅ What Was Fixed

### 1. OTP Now Checks Both Models
The system now looks for email in both `User` and `Resident` models automatically.

### 2. Automatic Email Sync
Any email update now syncs between both models:
- Update in Resident Profile → Syncs to User
- Update in Admin Resident Management → Syncs to User
- Update in Admin User Management → Already synced correctly

### 3. Handles Missing Emails Gracefully
- Clear error: "No email on file. Please contact your admin."
- Won't crash if email is deleted
- Both models stay consistent

---

## 🔧 How to Use

### For Existing Data (Run Once)

**Step 1: Check for issues**
```bash
cd back
node scripts/check-email-sync.js
```

**Step 2: Fix automatically**
```bash
node scripts/sync-emails.js
```

**Step 3: Verify fixed**
```bash
node scripts/check-email-sync.js
```

### For New Data
Nothing needed! Email sync now happens automatically.

---

## 🧪 Test Scenarios

### Test 1: Resident Updates Email
1. Login as resident
2. Go to Profile
3. Add/update email
4. Try forgot password → OTP should work ✅

### Test 2: Admin Updates via Resident Management
1. Login as admin
2. Go to Resident Management
3. Edit resident and add/update email
4. That resident tries forgot password → OTP should work ✅

### Test 3: Admin Updates via User Management
1. Login as admin
2. Go to User Management
3. Edit user and add/update email
4. That user tries forgot password → OTP should work ✅

### Test 4: No Email Scenario
1. Remove email from a user
2. Try forgot password → Clear error message ✅
3. No system crash ✅

---

## 📝 Files Changed

1. **back/controllers/authController.js**
   - Modified `requestPasswordOtp()` to check both models

2. **back/controllers/residentProfileController.js**
   - Added sync to User model when resident updates contact

3. **back/controllers/adminResidentController.js**
   - Added sync to User model when admin updates resident

4. **back/scripts/check-email-sync.js** (NEW)
   - Diagnostic tool to find mismatches

5. **back/scripts/sync-emails.js** (NEW)
   - Utility to fix existing data

---

## ⚠️ Important Notes

- **No data loss**: All existing emails are preserved
- **Backward compatible**: Works with old and new data
- **No frontend changes needed**: All fixes are backend
- **Safe to run multiple times**: Sync scripts are idempotent

---

## 🆘 Troubleshooting

### "No email on file" Error
**Cause:** User genuinely has no email in either model

**Fix:**
1. Admin adds email via User Management or Resident Management
2. Email will auto-sync to both models
3. OTP will work immediately

### Email Showing in UI but OTP Fails
**Cause:** Email only in one model (old data)

**Fix:**
```bash
cd back
node scripts/sync-emails.js
```

### How to Verify a Specific User
```bash
cd back
node scripts/check-email-sync.js
# Look for the user's name in the output
```

---

## 📊 Status Indicators

When running `check-email-sync.js`:

✅ **Matching records**: Email is in both models (good!)

❌ **Mismatches**: Email different between models (needs fixing)

⚠️ **No email**: User has no email in either model (admin needs to add)

---

## 💡 Tips

1. **Always use the UI**: Updates through UI automatically sync
2. **Run diagnostics periodically**: Check for sync issues monthly
3. **Train admins**: Show them User vs Resident management differences
4. **Monitor errors**: Check logs for "No email on file" messages

---

## Questions?

- Check `EMAIL_OTP_SYNC_FIX.md` for technical details
- Run diagnostic scripts to investigate issues
- All changes are logged in the database
