const Complaint = require('../models/complaint.model');
const Resident = require('../models/resident.model');
const { createNotification } = require('./residentNotificationController');
const fs = require('fs').promises;
const path = require('path');

exports.list = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('residentId')
      .populate('resolvedBy', 'username')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Failed to load complaints.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, response } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;
    if (response) complaint.response = response;
    
    if (status === 'resolved' || status === 'closed') {
      complaint.resolvedBy = req.user.id;
      complaint.resolvedAt = new Date();
    }

    await complaint.save();
    
    const updated = await Complaint.findById(req.params.id)
      .populate('residentId')
      .populate('resolvedBy', 'username');
    
    // Create notification for resident
    try {
      const statusMessages = {
        investigating: 'Your complaint is being investigated.',
        resolved: 'Your complaint has been resolved.',
        closed: 'Your complaint has been closed.'
      };
      
      if (statusMessages[status]) {
        await createNotification({
          residentId: complaint.residentId,
          type: 'complaint',
          title: `Complaint ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: statusMessages[status],
          link: '/resident/reports-complaints',
          relatedId: complaint._id,
          priority: status === 'resolved' ? 'high' : 'medium'
        });
      }
    } catch (notifErr) {
      console.warn('Failed to create notification:', notifErr.message);
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Failed to update complaint' });
  }
};

exports.delete = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Delete associated files
    if (complaint.attachments && complaint.attachments.length > 0) {
      const uploadDir = path.join(__dirname, '..', 'uploads', 'complaints');
      for (const filename of complaint.attachments) {
        try {
          await fs.unlink(path.join(uploadDir, filename));
        } catch (err) {
          console.warn(`Failed to delete file ${filename}:`, err.message);
        }
      }
    }

    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
};

exports.create = async (req, res) => {
  try {
    const { residentId, type, category, title, description, location, priority } = req.body;
    
    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push(file.filename);
      }
    }

    const complaint = await Complaint.create({
      residentId,
      type,
      category,
      title,
      description,
      location,
      priority: priority || 'medium',
      attachments
    });

    const populated = await Complaint.findById(complaint._id).populate('residentId');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Failed to create complaint' });
  }
};

// Download attachment (admin can view any attachment)
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, filename } = req.params;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (!complaint.attachments.includes(filename)) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'complaints', filename);
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ message: 'Failed to download attachment' });
  }
};