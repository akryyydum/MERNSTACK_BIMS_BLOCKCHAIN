const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/schema');
const { 
  registerSchema, 
  loginSchema, 
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  requestOtpSchema,
  verifyOtpSchema,
} = require('../middleware/schema');

// Note: CAPTCHA verification should be added here in production
// Example: router.post('/register', verifyCaptcha, validate(registerSchema), authController.register);

// Public routes with validation
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);

// OTP based password reset
router.post('/request-password-otp', validate(requestOtpSchema), authController.requestPasswordOtp);
router.post('/verify-otp-only', validate(verifyOtpSchema), authController.verifyOtpOnly);
router.post('/verify-password-otp', validate(verifyOtpSchema), authController.verifyPasswordOtp);

// Protected - Change Password (for authenticated users)
router.post('/change-password', auth, validate(changePasswordSchema), authController.changePassword);

// Token refresh endpoint
const User = require('../models/user.model');
const { refreshTokenHandler, logoutHandler } = require('../utils/tokenManager');
router.post('/refresh-token', async (req, res) => await refreshTokenHandler(req, res, User));
router.post('/logout', async (req, res) => await logoutHandler(req, res, User));

// Only Admins can access
router.get('/admin-only', auth, authorize('admin'), (req, res) => {
    res.json({ message: 'Welcome, Admin!' });
});

// Admin + Officials
router.get('/official-dashboard', auth, authorize('admin', 'official'), (req, res) => {
    res.json({ message: 'Welcome, Barangay Official!' });
});


module.exports = router;