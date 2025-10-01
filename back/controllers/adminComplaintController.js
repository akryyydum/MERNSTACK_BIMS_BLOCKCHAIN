const Complaint = require('../models/complaint.model');
const Resident = require('../models/resident.model');

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
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Failed to update complaint' });
  }
};

exports.delete = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
};

exports.create = async (req, res) => {
  try {
    const { residentId, type, category, title, description, location, priority } = req.body;
    
    const complaint = await Complaint.create({
      residentId,
      type,
      category,
      title,
      description,
      location,
      priority: priority || 'medium'
    });

    const populated = await Complaint.findById(complaint._id).populate('residentId');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Failed to create complaint' });
  }
};