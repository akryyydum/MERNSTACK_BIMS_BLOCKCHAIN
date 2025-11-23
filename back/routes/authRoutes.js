const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, authorize } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validate');

// Public
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
// OTP based password reset
router.post('/request-password-otp', authController.requestPasswordOtp);
router.post('/verify-otp-only', authController.verifyOtpOnly);
router.post('/verify-password-otp', authController.verifyPasswordOtp);

// Protected - Change Password (for authenticated users)
router.post('/change-password', auth, authController.changePassword);

// Only Admins can access
router.get('/admin-only', auth, authorize('admin'), (req, res) => {
    res.json({ message: 'Welcome, Admin!' });
});

// Admin + Officials
router.get('/official-dashboard', auth, authorize('admin', 'official'), (req, res) => {
    res.json({ message: 'Welcome, Barangay Official!' });
});


module.exports = router;