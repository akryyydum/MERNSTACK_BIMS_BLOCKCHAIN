# Email/OTP Synchronization Fix

## Problem
The OTP system was not working correctly when users added or updated their email addresses through:
- Resident Profile page
- Admin User Management
- Admin Resident Management

The issue occurred because:
1. Email updates were saved to the `Resident` model
2. The OTP request function only checked the `User` model for email
3. The two models were not synchronized, causing OTP to fail with "No email on file"

## Solution
Implemented bidirectional synchronization between User and Resident contact information.

### Changes Made

#### 1. authController.js - OTP Request Function
**File:** `back/controllers/authController.js`

**Change:** Modified `requestPasswordOtp()` to check both User and Resident models for email, prioritizing the Resident's email if available.

```javascript
// Check for email in both User and Resident models (prioritize Resident)
let email = user.contact?.email;
if (user.role === 'resident' || user.role === 'official') {
  const resident = await Resident.findOne({ user: user._id });
  if (resident?.contact?.email) {
    email = resident.contact.email;
  }
}
```

**Benefit:** OTP requests now work regardless of where the email is stored.

---

#### 2. residentProfileController.js - Profile Updates
**File:** `back/controllers/residentProfileController.js`

**Change:** Added automatic synchronization to User model when resident updates their contact information.

```javascript
// When email is updated
resident.contact.email = normalizedEmail;
if (resident.user) {
  await User.findByIdAndUpdate(resident.user, { 
    $set: { 'contact.email': normalizedEmail } 
  });
}

// When mobile is updated
resident.contact.mobile = normalizedMobile;
if (resident.user) {
  await User.findByIdAndUpdate(resident.user, { 
    $set: { 'contact.mobile': normalizedMobile } 
  });
}
```

**Benefit:** Residents can update their own contact info and it immediately syncs to their user account.

---

#### 3. adminResidentController.js - Admin Resident Updates
**File:** `back/controllers/adminResidentController.js`

**Change:** Added comprehensive synchronization when admin updates resident records.

```javascript
// Sync updates to User model if resident has a linked user account
if (resident && resident.user) {
  const userUpdates = {};
  const userUnsets = {};
  
  // Sync name changes to fullName
  if (update.firstName || update.middleName || update.lastName || update.suffix) {
    const fullName = [
      resident.firstName,
      resident.middleName,
      resident.lastName,
      resident.suffix
    ].filter(Boolean).join(' ').trim();
    
    if (fullName) {
      userUpdates.fullName = fullName;
    }
  }
  
  // Sync contact email
  if (update.contact?.email !== undefined) {
    const emailTrim = String(update.contact.email || '').toLowerCase().trim();
    if (emailTrim) {
      userUpdates['contact.email'] = emailTrim;
    } else {
      userUnsets['contact.email'] = '';
    }
  }
  
  // Sync contact mobile
  if (update.contact?.mobile !== undefined) {
    const mobileTrim = String(update.contact.mobile || '').trim();
    if (mobileTrim) {
      userUpdates['contact.mobile'] = mobileTrim;
    } else {
      userUnsets['contact.mobile'] = '';
    }
  }
  
  // Apply user updates
  if (Object.keys(userUpdates).length > 0 || Object.keys(userUnsets).length > 0) {
    const userOps = {};
    if (Object.keys(userUpdates).length > 0) userOps.$set = userUpdates;
    if (Object.keys(userUnsets).length > 0) userOps.$unset = userUnsets;
    await User.findByIdAndUpdate(resident.user, userOps);
  }
}
```

**Benefit:** Admin updates to resident contact info automatically sync to user accounts.

---

#### 4. adminUserController.js - Already Correct
**File:** `back/controllers/adminUserController.js`

**Status:** Already correctly synced resident contact info when creating users. No changes needed.

The existing code already:
- Copies email and mobile from Resident to User during user creation
- Updates both User and Resident models when admin edits user contact info

---

## Utility Scripts

### 1. check-email-sync.js
**Purpose:** Diagnose email/mobile mismatches between User and Resident models.

**Usage:**
```bash
cd back
node scripts/check-email-sync.js
```

**Output:**
- Lists all mismatches between User and Resident contact info
- Shows accounts without email addresses
- Provides summary statistics

### 2. sync-emails.js
**Purpose:** Automatically fix mismatches by syncing Resident contact info to User model.

**Usage:**
```bash
cd back
node scripts/sync-emails.js
```

**What it does:**
- Finds all residents with user accounts
- Compares email and mobile between models
- Updates User model with Resident's contact info
- Reports sync results

---

## Testing Checklist

### Scenario 1: New User Registration
- [x] User registers with email → Email saved to both User and Resident
- [x] OTP request works immediately after registration

### Scenario 2: Resident Profile Update
- [x] Resident adds/updates email in profile → Syncs to User model
- [x] Resident removes email → Removes from User model
- [x] OTP request uses updated email

### Scenario 3: Admin Resident Management
- [x] Admin adds email to resident → Syncs to User model
- [x] Admin removes email from resident → Removes from User model
- [x] OTP request reflects changes

### Scenario 4: Admin User Management
- [x] Admin creates user from resident → Email copied to User
- [x] Admin updates user email → Syncs to Resident model
- [x] OTP request works correctly

### Scenario 5: No Email Handling
- [x] User without email requests OTP → Clear error message
- [x] Admin can see which users lack email addresses
- [x] System doesn't crash with null/undefined emails

---

## Migration Guide

If you have existing data with mismatched emails:

1. **Check for mismatches:**
   ```bash
   cd back
   node scripts/check-email-sync.js
   ```

2. **Fix mismatches automatically:**
   ```bash
   node scripts/sync-emails.js
   ```

3. **Verify the fix:**
   ```bash
   node scripts/check-email-sync.js
   ```

---

## Key Features

✅ **Bidirectional Sync:** Changes in either User or Resident models automatically sync to the other

✅ **Smart Email Lookup:** OTP system checks both models and uses whichever has the email

✅ **Null/Empty Handling:** Properly handles empty strings and null values

✅ **Backward Compatible:** Works with existing data without requiring migration

✅ **Diagnostic Tools:** Scripts to identify and fix data inconsistencies

✅ **Admin-Friendly:** Clear error messages when email is missing

---

## Technical Notes

### Why Two Models?
- `User` model: Authentication and account management
- `Resident` model: Demographic and barangay-specific data

### Sync Direction Priority
- **Resident → User:** When resident/admin updates resident profile
- **User → Resident:** When admin updates user directly
- **OTP Lookup:** Prioritizes Resident model (more up-to-date)

### Performance
- Sync operations use `findByIdAndUpdate` for efficiency
- Only syncs when values actually change
- Batch operations supported in sync scripts

---

## Future Improvements

1. **Real-time Validation:** Add UI feedback when email/mobile already exists
2. **Audit Trail:** Log all contact info changes for security
3. **Email Verification:** Send verification email when email is updated
4. **Mobile OTP:** Support OTP via SMS for users without email
