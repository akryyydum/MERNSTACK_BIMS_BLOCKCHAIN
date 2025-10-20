const express = require('express');
const router = express.Router();
const residentComplaintController = require('../controllers/residentComplaintController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// Get all complaints for the authenticated resident
router.get('/', residentComplaintController.getMyComplaints);

// Create a new complaint
router.post('/', residentComplaintController.createComplaint);

// Get a specific complaint by ID
router.get('/:id', residentComplaintController.getComplaintById);

// Update a complaint (only if pending)
router.put('/:id', residentComplaintController.updateComplaint);

// Delete a complaint (only if pending)
router.delete('/:id', residentComplaintController.deleteComplaint);

module.exports = router;