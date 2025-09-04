const User = require('../models/user.model');
const Resident = require('../models/resident.model'); // add
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

async function register(req, res) {
  try {
    const {
      username,
      password,
      fullName,
      contact = {},
      role,
      // Resident fields
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
    } = req.body;

    // Basic user validation
    if (!username || !password || !fullName || !contact.email) {
      return res.status(400).json({ message: 'username, password, fullName, and contact.email are required' });
    }

    // Basic resident validation (ensure required Resident fields exist)
    const missingResident =
      !firstName || !lastName || !dateOfBirth || !birthPlace || !gender || !civilStatus ||
      !address?.street || !address?.barangay || !address?.municipality || !address?.province ||
      !citizenship || !occupation || !education || !contact.mobile;

    if (missingResident) {
      return res.status(400).json({ message: 'Missing required resident fields' });
    }

    // Uniqueness check
    const existingUser = await User.findOne({
      $or: [{ username }, { 'contact.email': contact.email }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Create User
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await new User({
      username,
      passwordHash,
      role: role || 'resident',
      fullName,
      contact: { mobile: contact.mobile, email: contact.email },
      isVerified: false,
      verificationCode,
      verificationCodeExpires
    }).save();

    try {
      // Create Resident linked to the user
      await Resident.create({
        user: user._id,
        firstName,
        middleName,
        lastName,
        suffix,
        dateOfBirth,     // accepts ISO string or Date
        birthPlace,
        gender,
        civilStatus,
        religion,
        address,
        citizenship,
        occupation,
        education,
        contact: {
          mobile: contact.mobile,
          email: contact.email
        },
        status: 'pending'
      });
    } catch (residentErr) {
      // Rollback user if resident creation fails
      await User.deleteOne({ _id: user._id });
      return res.status(400).json({ message: residentErr.message || 'Failed to create resident record' });
    }

    // Send verification email (after data is saved)
    await sendEmail(
      contact.email,
      'Your verification code',
      `Your verification code is ${verificationCode}. It expires in 10 minutes.`
    );

    res.status(201).json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function verifyCode(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'email and code are required' });
    }

    const user = await User.findOne({ 'contact.email': email });
    if (!user || !user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ message: 'No verification code found' });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code expired' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role });
  } catch (err) {
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

async function resendCode(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });
    const user = await User.findOne({ 'contact.email': email });
    if (!user) return res.status(404).json({ message: 'Email not found' });
    const verificationCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendEmail(email, 'Your verification code', `Your verification code is ${verificationCode}. It expires in 10 minutes.`);
    res.json({ message: 'A new verification code has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  register,
  verifyCode,
  login,
  forgotPassword,
  resetPassword,
  resendCode, // add
};