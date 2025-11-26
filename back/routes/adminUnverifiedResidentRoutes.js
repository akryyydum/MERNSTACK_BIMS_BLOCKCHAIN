const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/authMiddleware');
const controller = require('../controllers/unverifiedResidentController');

// All routes protected for admin only
router.get('/', auth, authorize('admin'), controller.list);
router.post('/:id/approve', auth, authorize('admin'), controller.approve);
router.delete('/:id', auth, authorize('admin'), controller.reject);

module.exports = router;
