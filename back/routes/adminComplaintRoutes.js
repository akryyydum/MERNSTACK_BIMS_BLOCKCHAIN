const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/authMiddleware');
const {
  list,
  updateStatus,
  delete: deleteComplaint,
  create,
  downloadAttachment
} = require('../controllers/adminComplaintController');
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

// Protect all routes
router.use(auth, authorize('admin'));

router.get('/', list);
router.post('/', upload.array('attachments', 5), create);
router.patch('/:id/status', updateStatus);
router.delete('/:id', deleteComplaint);
router.get('/:id/attachments/:filename', downloadAttachment);

module.exports = router;