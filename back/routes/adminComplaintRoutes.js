const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/authMiddleware');
const {
  list,
  updateStatus,
  delete: deleteComplaint,
  create
} = require('../controllers/adminComplaintController');

// Protect all routes
router.use(auth, authorize('admin'));

router.get('/', list);
router.post('/', create);
router.patch('/:id/status', updateStatus);
router.delete('/:id', deleteComplaint);

module.exports = router;