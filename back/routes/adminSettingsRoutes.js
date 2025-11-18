const router = require('express').Router();
const { auth, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/adminSettingsController');

// Protect all settings routes; admin only
router.get('/', auth, authorize('admin'), controller.getSettings);
router.patch('/', auth, authorize('admin'), controller.updateSettings);

module.exports = router;
