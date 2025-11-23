const User = require('../models/user.model');
const Resident = require('../models/resident.model');
const UnverifiedResident = require('../models/unverifiedResident.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { generateTokenPair } = require('../utils/tokenManager');
const { logAuthEvent, ActionType } = require('../utils/auditLogger');
const { recordAuthAttempt } = require('../utils/metrics');

function normalize(str) {
  return String(str || '').trim();
}

// Helper to match date-only (ignore timezones)
function sameDay(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

async function register(req, res) {
  try {
    const {
      username,
      password,
      // identifying info to match an existing resident OR create new one
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      sex,
      civilStatus,
      religion,
      ethnicity,
      address,
  citizenship,
  occupation,
  sectoralInformation,
  registeredVoter,
  contact = {},
    } = req.body;

    // Minimal required for account + resident creation
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }
    if (username.length < 6) {
      return res.status(400).json({ message: 'Username must be at least 6 characters' });
    }
    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({ message: 'firstName, lastName, and dateOfBirth are required' });
    }

    // Validate required resident fields
    if (!birthPlace || !sex || !civilStatus || !address?.purok || !address?.barangay || 
        !address?.municipality || !address?.province || !citizenship || !occupation) {
      return res.status(400).json({ message: 'All resident fields are required' });
    }

    // Ensure username uniqueness
    const existingUser = await User.findOne({ username: normalize(username) });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Only check email uniqueness if email is provided
    const email = contact.email ? normalize(contact.email).toLowerCase() : '';
    if (email) {
      const existingUserWithEmail = await User.findOne({ 'contact.email': email });
      if (existingUserWithEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Check if resident with same email already exists
      const existingResident = await Resident.findOne({ 'contact.email': email });
      if (existingResident) {
        return res.status(400).json({ message: 'A resident with this email already exists' });
      }
    }

    // Compute full name
    const fullName = [firstName, middleName, lastName, suffix]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create User first (mark isVerified false until resident record is linked & verified)
    const user = await User.create({
      username: normalize(username),
      passwordHash,
      role: 'resident',
      fullName: fullName || 'Resident',
      contact: {
        email: email || undefined,
        mobile: normalize(contact.mobile || '') || undefined
      },
      isVerified: false,
      isActive: true,
    });
    // Try to match existing resident roster (assumes pre-loaded canonical residents without user linkage)
    const existingResidentRoster = await Resident.findOne({
      firstName: normalize(firstName),
      lastName: normalize(lastName),
      dateOfBirth: new Date(dateOfBirth)
    });

    if (existingResidentRoster) {
      // If already linked to another user, abort
      if (existingResidentRoster.user) {
        return res.status(400).json({ message: 'Resident record already linked to an account. Contact admin.' });
      }
      existingResidentRoster.user = user._id;
      existingResidentRoster.status = existingResidentRoster.status || 'pending';
      await existingResidentRoster.save();
      // User stays unverified until resident.status becomes 'verified'
      return res.status(201).json({ message: 'Registration received. Your existing resident record is now linked and pending verification.' });
    }

    // Create unverified resident entry (to be approved by admin later)
    await UnverifiedResident.create({
      user: user._id,
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth: new Date(dateOfBirth),
      birthPlace,
      sex,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      sectoralInformation,
      registeredVoter: typeof registeredVoter === 'boolean' ? registeredVoter : false,
      contact: {
        email: email || undefined,
        mobile: normalize(contact.mobile || '') || undefined
      },
      status: 'pending'
    });

    // Log registration
    await logAuthEvent(ActionType.REGISTER, user._id, 'success', req, { username });
    recordAuthAttempt('success');
    
    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    await logAuthEvent(ActionType.REGISTER, null, 'failure', req, { error: err.message });
    recordAuthAttempt('failure');
    res.status(500).json({ message: err.message });
  }
}


async function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body;
    console.log('[AUTH] Incoming login attempt', { usernameOrEmail, hasPassword: !!password });

    // Find user by either username or email (if provided)
    let query;
    
    // Only search by email if it looks like an email (contains @)
    if (usernameOrEmail.includes('@')) {
      query = {
        $or: [
          { username: usernameOrEmail },
          { 'contact.email': usernameOrEmail }
        ]
      };
    } else {
      query = { username: usernameOrEmail };
    }
    
    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logAuthEvent(ActionType.LOGIN, user._id, 'failure', req, { reason: 'invalid_password' });
      recordAuthAttempt('failure');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let isVerified = true;
    let userData = { 
      _id: user._id,
      username: user.username 
    };
    let tokenPayload = { id: user._id, role: user.role };
    
    if (user.role === 'resident' || user.role === 'official') {
      // Check if resident info exists and is verified
      const resident = await Resident.findOne({ user: user._id });
      const residentStatus = resident?.status || 'pending';
      
      console.log('[AUTH] Resident check:', { 
        hasResident: !!resident, 
        status: residentStatus,
        residentId: resident?._id
      });
      
      // User is only verified if resident exists AND status is 'verified'
      if (!resident || residentStatus !== 'verified') {
        isVerified = false;
      }
      
      if (resident) {
        userData.firstName = resident.firstName;
        userData.lastName = resident.lastName;
        userData.residentId = resident._id; // Add resident ID as well
        userData.residentStatus = residentStatus; // Include status in userData
        tokenPayload.residentId = resident._id; // Include residentId in token
      }
    } else {
      userData.firstName = user.fullName ? user.fullName.split(' ')[0] : '';
      userData.lastName = user.fullName ? user.fullName.split(' ').slice(1).join(' ') : '';
    }
    // Generate token pair (access + refresh)
    const tokens = generateTokenPair(tokenPayload);
    
    // Log successful login
    await logAuthEvent(ActionType.LOGIN, user._id, 'success', req, { role: user.role });
    recordAuthAttempt('success');
    
    res.json({ 
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.accessToken, // For backward compatibility
      role: user.role, 
      isVerified, 
      userData 
    });
  } catch (err) {
    console.error('[AUTH] Login error', err);
    await logAuthEvent(ActionType.LOGIN, null, 'failure', req, { error: err.message });
    recordAuthAttempt('failure');
    res.status(500).json({ message: err.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ 'contact.email': email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = resetToken;
    await user.save();
    await sendEmail(
      email,
      'Password Reset Request',
      `Use this token to reset your password: ${resetToken}`
    );
    res.json({ message: 'Password reset token sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Request OTP using username or full name
async function requestPasswordOtp(req, res) {
  try {
    const { identifier } = req.body; // username or full name
    if (!identifier) return res.status(400).json({ message: 'Identifier (username or full name) is required' });

    // Try username exact match first
    let user = await User.findOne({ username: identifier.trim() });
    if (!user) {
      // Fallback: fullName case-insensitive exact match
      user = await User.findOne({ fullName: new RegExp(`^${identifier.trim()}$`, 'i') });
    }
    if (!user) return res.status(404).json({ message: 'Account not yet registered' });

    // Must have email to send OTP
    const email = user.contact?.email;
    if (!email) return res.status(400).json({ message: 'No email on file. Please contact your admin.' });

    // Generate 6-digit OTP
    const otp = ('' + Math.floor(100000 + Math.random() * 900000));
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    user.passwordResetOtpHash = hash;
    user.passwordResetOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    try {
      await sendEmail(email, 'Your Password Reset OTP', `Your OTP code is: ${otp}\nIt expires in 15 minutes.`);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to send OTP email', error: e.message });
    }

    res.json({ message: 'OTP sent to registered email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Verify OTP only (without changing password)
async function verifyOtpOnly(req, res) {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ message: 'identifier and otp are required' });
    }

    let user = await User.findOne({ username: identifier.trim() });
    if (!user) {
      user = await User.findOne({ fullName: new RegExp(`^${identifier.trim()}$`, 'i') });
    }
    if (!user) return res.status(404).json({ message: 'Account not yet registered' });

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpires) {
      return res.status(400).json({ message: 'No active OTP request. Please request a new OTP.' });
    }
    if (user.passwordResetOtpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (hash !== user.passwordResetOtpHash) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    res.json({ message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Verify OTP and change password
async function verifyPasswordOtp(req, res) {
  try {
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: 'identifier, otp and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    let user = await User.findOne({ username: identifier.trim() });
    if (!user) {
      user = await User.findOne({ fullName: new RegExp(`^${identifier.trim()}$`, 'i') });
    }
    if (!user) return res.status(404).json({ message: 'Account not yet registered' });

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpires) {
      return res.status(400).json({ message: 'No active OTP request. Please request a new OTP.' });
    }
    if (user.passwordResetOtpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (hash !== user.passwordResetOtpHash) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetOtpHash = undefined;
    user.passwordResetOtpExpires = undefined;
    await user.save();

    await logAuthEvent(ActionType.PASSWORD_RESET, user._id, 'success', req);
    
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.verificationToken = undefined;
    await user.save();
    
    await logAuthEvent(ActionType.PASSWORD_RESET, user._id, 'success', req);
    
    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logAuthEvent(ActionType.PASSWORD_CHANGE, userId, 'success', req);
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  requestPasswordOtp,
  verifyOtpOnly,
  verifyPasswordOtp
};