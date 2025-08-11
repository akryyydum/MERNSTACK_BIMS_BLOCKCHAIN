const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, authorize } = require('../middleware/authMiddleware');

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);

// New: verify via code (body: { email, code })
router.post('/verify-code', authController.verifyCode);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Only Admins can access
router.get('/admin-only', auth, authorize('admin'), (req, res) => {
    res.json({ message: 'Welcome, Admin!' });
});

// Admin + Officials
router.get('/official-dashboard', auth, authorize('admin', 'official'), (req, res) => {
    res.json({ message: 'Welcome, Barangay Official!' });
});

module.exports = router;