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

// Update current resident's profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find the resident record for this user
    const resident = await Resident.findOne({ user: userId });
    
    if (!resident) {
      return res.status(404).json({ message: 'Resident profile not found' });
    }

    // Extract updatable fields from request body
    const {
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      sex,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      sectoralInformation,
      employmentStatus,
      registeredVoter,
      contact
    } = req.body;

    // Update fields if provided
    if (firstName !== undefined) resident.firstName = firstName;
    if (middleName !== undefined) resident.middleName = middleName;
    if (lastName !== undefined) resident.lastName = lastName;
    if (suffix !== undefined) resident.suffix = suffix;
    if (dateOfBirth !== undefined) resident.dateOfBirth = new Date(dateOfBirth);
    if (birthPlace !== undefined) resident.birthPlace = birthPlace;
    if (sex !== undefined) resident.sex = sex;
    if (civilStatus !== undefined) resident.civilStatus = civilStatus;
    if (religion !== undefined) resident.religion = religion;
    if (ethnicity !== undefined) resident.ethnicity = ethnicity;
    if (citizenship !== undefined) resident.citizenship = citizenship;
    if (occupation !== undefined) resident.occupation = occupation;
    if (sectoralInformation !== undefined) resident.sectoralInformation = sectoralInformation;
    if (employmentStatus !== undefined) resident.employmentStatus = employmentStatus;
    if (registeredVoter !== undefined) resident.registeredVoter = registeredVoter;

    // Update address if provided
    if (address) {
      if (address.purok !== undefined) resident.address.purok = address.purok;
      if (address.barangay !== undefined) resident.address.barangay = address.barangay;
      if (address.municipality !== undefined) resident.address.municipality = address.municipality;
      if (address.province !== undefined) resident.address.province = address.province;
      if (address.zipCode !== undefined) resident.address.zipCode = address.zipCode;
    }

    // Update contact if provided
    if (contact) {
      if (contact.mobile !== undefined) resident.contact.mobile = contact.mobile;
      if (contact.email !== undefined) resident.contact.email = contact.email;
    }

    // Update the updatedAt timestamp
    resident.updatedAt = new Date();

    // Save the updated resident
    await resident.save();

    // Populate user data before sending response
    await resident.populate('user', 'username isActive isVerified role position');

    res.json({ 
      message: 'Profile updated successfully', 
      resident 
    });
  } catch (error) {
    console.error('Error updating resident profile:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors 
      });
    }
    
    res.status(500).json({ message: 'Failed to update profile data' });
  }
};

module.exports = {
  getProfile,
  updateProfile
};