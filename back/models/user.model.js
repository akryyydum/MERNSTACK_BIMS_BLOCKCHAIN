const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, minlength: 6 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'official', 'resident'], default: 'resident' },
    fullName: { type: String, required: true },
    // Position/title for officials (ignored for other roles)
    position: { type: String },
    contact: {
        mobile: { type: String },
        email: { type: String, lowercase: true, trim: true }
    },
    isActive: { type: Boolean, default: true },
    inactiveReason: { type: String },
    isVerified: { type: Boolean, default: true },
    verificationToken: { type: String } // keeping for password reset functionality
    ,passwordResetOtpHash: { type: String },
    passwordResetOtpExpires: { type: Date }
}, { timestamps: true });

// Make email unique only when present (avoid duplicate null/undefined)
userSchema.index(
    { 'contact.email': 1 },
    { unique: true, sparse: true }
);

module.exports = mongoose.model('User', userSchema);