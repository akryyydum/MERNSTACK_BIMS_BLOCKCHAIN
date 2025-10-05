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
      // identifying info to match an existing resident
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      gender,
      civilStatus,
      religion,
      address,
      citizenship,
      occupation,
      education,
      contact = {},
    } = req.body;

    // Minimal required for account + matching
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }
    if (!firstName || !lastName || !dateOfBirth || !contact.email) {
      return res.status(400).json({ message: 'firstName, lastName, dateOfBirth, and contact.email are required to match your resident record' });
    }

    // Ensure username/email uniqueness
    const existingUser = await User.findOne({
      $or: [{ username: normalize(username) }, { 'contact.email': normalize(contact.email).toLowerCase() }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Find existing Resident without a linked user that matches provided info
    const email = normalize(contact.email).toLowerCase();

    // Fetch potential matches by email (primary) and lastName to narrow
    const candidates = await Resident.find({
      $and: [
        { $or: [{ user: { $exists: false } }, { user: null }] },
        { 'contact.email': email },
        { lastName: new RegExp(`^${normalize(lastName)}$`, 'i') }
      ]
    }).lean();

    const resident = candidates.find(r =>
      new RegExp(`^${normalize(firstName)}$`, 'i').test(r.firstName || '') &&
      (!middleName || new RegExp(`^${normalize(middleName)}$`, 'i').test(r.middleName || '')) &&
      (!suffix || new RegExp(`^${normalize(suffix)}$`, 'i').test(r.suffix || '')) &&
      (r.dateOfBirth && sameDay(r.dateOfBirth, dateOfBirth))
    );

    if (!resident) {
      return res.status(400).json({ message: 'No matching resident record found or an account already exists' });
    }

    // Compute full name from resident
    const fullName = [resident.firstName, resident.middleName, resident.lastName, resident.suffix]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: normalize(username),
      passwordHash,
      role: 'resident',
      fullName: fullName || 'Resident',
      contact: {
        email: email,
        mobile: resident.contact?.mobile || normalize(contact.mobile || '')
      },
      isVerified: true,   // account is usable, but dashboard access still gated by resident.status in login()
      isActive: true,
    });

    // Link resident to user and keep resident status as-is (pending/verified)
    await Resident.updateOne({ _id: resident._id }, { $set: { user: user._id } });

    res.status(201).json({ message: 'Registration successful! You can log in immediately.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


async function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body;
    console.log('[AUTH] Incoming login attempt', { usernameOrEmail, hasPassword: !!password });

    // Find user by either username or email
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { 'contact.email': usernameOrEmail }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let isVerified = true;
    let userData = { username: user.username };
    if (user.role === 'resident') {
      // Check if resident info exists and is verified
      const resident = await require('../models/resident.model').findOne({ user: user._id });
      if (!resident || resident.status !== 'verified') {
        isVerified = false;
      }
      if (resident) {
        userData.firstName = resident.firstName;
        userData.lastName = resident.lastName;
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