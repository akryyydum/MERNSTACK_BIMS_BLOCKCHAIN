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
      !address?.street || !address?.purok ||
      !address?.barangay || !address?.municipality || !address?.province ||
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

    const user = await new User({
      username,
      passwordHash,
      role: role || 'resident',
      fullName,
      contact: { mobile: contact.mobile, email: contact.email },
      isVerified: true // Ensure user is verified instantly for immediate login
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

    res.status(201).json({ message: 'Registration successful! You can log in immediately.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


async function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body;

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

    // No verification check - users can log in instantly
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

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword
};