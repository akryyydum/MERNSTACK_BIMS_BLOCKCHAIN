const User = require('../models/user.model');
const Resident = require('../models/resident.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

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
      gender,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      education,
      contact = {},
    } = req.body;

    // Minimal required for account + resident creation
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }
    if (!firstName || !lastName || !dateOfBirth || !ethnicity) {
      return res.status(400).json({ message: 'firstName, lastName, dateOfBirth, and ethnicity are required' });
    }

    // Validate required resident fields
    if (!birthPlace || !gender || !civilStatus || !address?.purok || !address?.barangay || 
        !address?.municipality || !address?.province || !citizenship || !occupation || 
        !education) {
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
    
    // Create User first
    const user = await User.create({
      username: normalize(username),
      passwordHash,
      role: 'resident',
      fullName: fullName || 'Resident',
      contact: {
        email: email || undefined,
        mobile: normalize(contact.mobile || '') || undefined
      },
      isVerified: true,
      isActive: true,
    });

    // Create Resident record linked to the user
    const resident = await Resident.create({
      user: user._id,
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth: new Date(dateOfBirth),
      birthPlace,
      gender,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      education,
      contact: {
        email: email || undefined,
        mobile: normalize(contact.mobile || '') || undefined
      },
      status: 'pending', // new registrations start as pending
    });

    res.status(201).json({ message: 'Registration successful! You can log in immediately.' });
  } catch (err) {
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
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let isVerified = true;
    let userData = { 
      _id: user._id,
      username: user.username 
    };
    if (user.role === 'resident') {
      // Check if resident info exists and is verified
      const resident = await require('../models/resident.model').findOne({ user: user._id });
      if (!resident || resident.status !== 'verified') {
        isVerified = false;
      }
      if (resident) {
        userData.firstName = resident.firstName;
        userData.lastName = resident.lastName;
        userData.residentId = resident._id; // Add resident ID as well
      }
    } else {
      userData.firstName = user.fullName ? user.fullName.split(' ')[0] : '';
      userData.lastName = user.fullName ? user.fullName.split(' ').slice(1).join(' ') : '';
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    console.log('[AUTH] Login success', { userId: user._id.toString(), role: user.role });
    res.json({ token, role: user.role, isVerified, userData });
  } catch (err) {
    console.error('[AUTH] Login error', err);
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
    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword
};