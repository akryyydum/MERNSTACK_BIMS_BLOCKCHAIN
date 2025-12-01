const express = require('express');
const router = express.Router();
const residentComplaintController = require('../controllers/residentComplaintController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for complaint attachments
const uploadDir = path.join(__dirname, '..', 'uploads', 'complaints');
require('fs').mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image and video files are allowed!'));
  }
});

// Apply auth middleware to all routes
router.use(protect);

// Get all complaints for the authenticated resident
router.get('/', residentComplaintController.getMyComplaints);

// Create a new complaint (with file uploads)
router.post('/', upload.array('attachments', 5), residentComplaintController.createComplaint);

// Get a specific complaint by ID
router.get('/:id', residentComplaintController.getComplaintById);

// Update a complaint (only if pending, with file uploads)
router.put('/:id', upload.array('attachments', 5), residentComplaintController.updateComplaint);

// Delete a complaint (only if pending)
router.delete('/:id', residentComplaintController.deleteComplaint);

// Download attachment
router.get('/:id/attachments/:filename', residentComplaintController.downloadAttachment);

module.exports = router;