const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'official', 'resident'], default: 'resident' },
    fullName: { type: String, required: true },
    contact: {
        mobile: { type: String, required: true },
        email: { type: String, required: true, lowercase: true, trim: true }
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    verificationToken: { type: String } // keeping for password reset functionality
}, { timestamps: true });

userSchema.index({ 'contact.email': 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);