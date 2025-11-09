const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const residentProfileController = require('../controllers/residentProfileController');

// Get current resident's profile - requires authentication
router.get('/profile', protect, residentProfileController.getProfile);

// Update current resident's profile - requires authentication
router.put('/profile', protect, residentProfileController.updateProfile);

module.exports = router;