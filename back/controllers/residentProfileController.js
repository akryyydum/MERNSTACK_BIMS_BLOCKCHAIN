const Resident = require('../models/resident.model');
const User = require('../models/user.model');

// Get current resident's profile (works for both residents and officials)
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Find the resident record for this user with populated user data
    const resident = await Resident.findOne({ user: userId }).populate('user', 'username isActive isVerified role position');
    
    if (!resident) {
      return res.status(404).json({ message: 'Resident profile not found' });
    }

    res.json(resident);
  } catch (error) {
    console.error('Error fetching resident profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile data' });
  }
};

module.exports = {
  getProfile
};