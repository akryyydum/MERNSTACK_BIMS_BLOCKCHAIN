# Email Validation Fix - Preventing Invalid Email Sends

## Problem
The system was attempting to send OTP emails even when:
- Email field was null or undefined
- Email field was empty string
- Email field contained only whitespace
- Email had invalid format

This caused confusion as the system would "send" emails to nowhere without proper error messages.

## Solution Implemented

### 1. Enhanced `sendEmail` Utility Function
**File:** `back/utils/sendEmail.js`

Added comprehensive validation before attempting to send any email:

```javascript
// Validates:
- Email exists (not null/undefined)
- Email is a string
- Email is not empty after trimming
- Email matches basic format (user@domain.tld)
```

**Result:** Any attempt to send email to invalid address throws a clear error.

---

### 2. Strengthened OTP Request Validation
**File:** `back/controllers/authController.js` - `requestPasswordOtp()` function

Added multiple validation layers:

```javascript
// Step 1: Check both User and Resident models for email
let email = user.contact?.email;
if (user.role === 'resident' || user.role === 'official') {
  const resident = await Resident.findOne({ user: user._id });
  if (resident?.contact?.email) {
    email = resident.contact.email;
  }
}

// Step 2: Validate email exists and is not empty
if (!email || typeof email !== 'string' || !email.trim()) {
  return res.status(400).json({ message: 'No email on file...' });
}

// Step 3: Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email.trim())) {
  return res.status(400).json({ message: 'Invalid email format...' });
}

// Step 4: Normalize email
email = email.trim().toLowerCase();
```

---

### 3. Enhanced Forgot Password Validation
**File:** `back/controllers/authController.js` - `forgotPassword()` function

Added input validation before database lookup:

```javascript
// Validates:
- Email parameter is provided
- Email is not empty
- Email has valid format
- Email is normalized (trimmed & lowercased)
```

---

## Error Messages

Users now receive clear, specific error messages:

| Scenario | Error Message |
|----------|---------------|
| No email in database | "No email on file. Please contact your admin." |
| Invalid email format in database | "Invalid email format on file. Please contact your admin to update your email." |
| Missing email parameter | "Email is required" |
| Invalid email format submitted | "Invalid email format" |
| Email not found | "Email not found" |

---

## Testing

### Manual Test Cases

1. **Test with no email:**
   - Try to request OTP for user without email
   - Expected: "No email on file" error ✅

2. **Test with empty email:**
   - Set user email to empty string in database
   - Try to request OTP
   - Expected: "No email on file" error ✅

3. **Test with whitespace email:**
   - Set user email to "   " in database
   - Try to request OTP
   - Expected: "No email on file" error ✅

4. **Test with invalid format:**
   - Set user email to "notanemail" in database
   - Try to request OTP
   - Expected: "Invalid email format on file" error ✅

5. **Test with valid email:**
   - User has proper email "user@example.com"
   - Try to request OTP
   - Expected: OTP sent successfully ✅

### Automated Tests

Run the test script:
```bash
cd back
node scripts/test-email-validation.js
```

---

## Benefits

✅ **Prevents silent failures** - No more attempting to send to invalid addresses

✅ **Clear error messages** - Users know exactly what's wrong

✅ **Early validation** - Catches issues before attempting email send

✅ **Format validation** - Ensures basic email structure is correct

✅ **Consistent behavior** - All email sending paths have same validation

✅ **Better UX** - Users get immediate feedback about missing/invalid email

---

## Technical Details

### Email Validation Regex
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

This validates:
- At least one character before @
- @ symbol present
- At least one character for domain
- Dot (.) present
- At least one character for TLD

### Validation Flow

```
User Action (Request OTP/Reset Password)
    ↓
Check if user exists
    ↓
Look for email in User model
    ↓
If resident/official, check Resident model too
    ↓
Validate email exists (not null/undefined/empty)
    ↓
Validate email format (regex)
    ↓
Normalize email (trim + lowercase)
    ↓
Attempt to send email
    ↓
sendEmail validates again (fail-safe)
    ↓
Send email via nodemailer
```

---

## Migration Notes

No database migration needed. This is purely validation logic.

Existing users with invalid/missing emails will:
- Get clear error messages when requesting OTP
- Be prompted to contact admin to update email
- Not experience system crashes or silent failures

---

## Future Enhancements

1. **Email verification** - Send confirmation when email is added/changed
2. **Email deliverability check** - Verify email domain exists
3. **Disposable email detection** - Block temporary email services
4. **Rate limiting** - Prevent spam by limiting OTP requests per email
5. **Email history** - Track all emails sent to users for audit

---

## Related Files

- `back/utils/sendEmail.js` - Core email sending utility
- `back/controllers/authController.js` - Authentication endpoints
- `back/scripts/test-email-validation.js` - Test suite
- `back/scripts/check-email-sync.js` - Email sync diagnostic
- `back/scripts/sync-emails.js` - Email sync utility
