const Complaint = require('../models/complaint.model');
const Resident = require('../models/resident.model');
const { notifyComplaintCreated } = require('./adminNotificationController');

// Get complaints for the authenticated resident (fallback resolve residentId if missing in token)
exports.getMyComplaints = async (req, res) => {
  try {
    let residentId = req.user.residentId;
    if (!residentId) {
      // Fallback: find resident by linked user id
      const residentDoc = await Resident.findOne({ user: req.user.id }).select('_id');
      if (residentDoc) residentId = residentDoc._id.toString();
    }
    if (!residentId) {
      return res.status(404).json({ message: 'Resident profile not found for authenticated user' });
    }
    const complaints = await Complaint.find({ residentId })
      .populate('residentId')
      .populate('resolvedBy', 'username')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching resident complaints:', error);
    res.status(500).json({ message: 'Failed to load complaints.' });
  }
};

// Create a new complaint/report
exports.createComplaint = async (req, res) => {
  try {
    const { type, category, title, description, location, priority } = req.body;
    let residentId = req.user.residentId;
    if (!residentId) {
      const residentDoc = await Resident.findOne({ user: req.user.id }).select('_id');
      if (residentDoc) residentId = residentDoc._id.toString();
    }
    if (!residentId) {
      return res.status(404).json({ message: 'Resident profile not found' });
    }

    // Basic validation mirroring admin side expectations
    const missing = [];
    if (!type) missing.push('type');
    if (!category) missing.push('category');
    if (!title) missing.push('title');
    if (!description) missing.push('description');
    if (!location) missing.push('location');
    if (missing.length) {
      return res.status(400).json({ message: 'Missing required fields', missing });
    }
    if (!['complaint', 'report'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type value' });
    }
    if (priority && !['low','medium','high','urgent'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority value' });
    }

    const complaint = await Complaint.create({
      residentId,
      type,
      category: category.trim(),
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      priority: priority || 'medium'
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('residentId')
      .populate('resolvedBy', 'username');
    
    // Notify admins about the new complaint
    try {
      const residentDoc = await Resident.findById(residentId);
      await notifyComplaintCreated(complaint, residentDoc);
    } catch (notifErr) {
      console.warn('Failed to notify admins about complaint:', notifErr.message);
      // Non-blocking: complaint is still created
    }
    
    res.status(201).json(populated);
    
  } catch (error) {
    console.error('Error creating complaint:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) });
    }
    res.status(500).json({ message: 'Failed to create complaint' });
  }
};

// Get a specific complaint by ID (only if it belongs to the resident)
exports.getComplaintById = async (req, res) => {
  try {
    let residentId = req.user.residentId;
    if (!residentId) {
      const residentDoc = await Resident.findOne({ user: req.user.id }).select('_id');
      if (residentDoc) residentId = residentDoc._id.toString();
    }
    const complaintId = req.params.id;

    const complaint = await Complaint.findOne({ 
      _id: complaintId, 
      residentId 
    })
      .populate('residentId')
      .populate('resolvedBy', 'username');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ message: 'Failed to load complaint' });
  }
};

// Update complaint (residents can only update if status is pending)
exports.updateComplaint = async (req, res) => {
  try {
    let residentId = req.user.residentId;
    if (!residentId) {
      const residentDoc = await Resident.findOne({ user: req.user.id }).select('_id');
      if (residentDoc) residentId = residentDoc._id.toString();
    }
    const complaintId = req.params.id;
    const { type, category, title, description, location, priority } = req.body;

    const complaint = await Complaint.findOne({ 
      _id: complaintId, 
      residentId,
      status: 'pending' // Only allow updates if still pending
    });

    if (!complaint) {
      return res.status(404).json({ 
        message: 'Complaint not found or cannot be updated' 
      });
    }

    // Update fields
    complaint.type = type || complaint.type;
    complaint.category = category || complaint.category;
    complaint.title = title || complaint.title;
    complaint.description = description || complaint.description;
    complaint.location = location || complaint.location;
    complaint.priority = priority || complaint.priority;

    await complaint.save();

    const updated = await Complaint.findById(complaintId)
      .populate('residentId')
      .populate('resolvedBy', 'username');

    res.json(updated);
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Failed to update complaint' });
  }
};

// Delete complaint (residents can only delete if status is pending)
exports.deleteComplaint = async (req, res) => {
  try {
    const residentId = req.user.residentId;
    const complaintId = req.params.id;

    const complaint = await Complaint.findOne({ 
      _id: complaintId, 
      residentId,
      status: 'pending' // Only allow deletion if still pending
    });

    if (!complaint) {
      return res.status(404).json({ 
        message: 'Complaint not found or cannot be deleted' 
      });
    }

    await Complaint.findByIdAndDelete(complaintId);
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
};