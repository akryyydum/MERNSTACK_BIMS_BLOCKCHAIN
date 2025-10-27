const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

// List all officials (return array, not {items: []})
exports.list = async (req, res) => {
  try {
    const officials = await User.find({ role: "official" })
      .select("-passwordHash -verificationToken")
      .sort({ createdAt: -1 })
      .lean();
    res.json(officials);
  } catch (err) {
    console.error("[adminOfficialController.list]", err);
    res.status(500).json({ message: err.message });
  }
};

// Create a new official from an existing resident
exports.create = async (req, res) => {
  try {
    const { residentId, position, email, mobile } = req.body;
    
    if (!residentId || !position) {
      return res.status(400).json({ message: "Resident selection and position are required" });
    }

    // Find the resident first
    const Resident = require("../models/resident.model");
    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(404).json({ message: "Resident not found" });
    }

    // Check if resident already has a user account linked
    let user = null;
    if (resident.user) {
      user = await User.findById(resident.user);
    }

    if (user) {
      // Update existing user account to official role
      user.role = "official";
      user.position = position?.trim();
      if (email) user.contact.email = String(email).toLowerCase().trim();
      if (mobile) user.contact.mobile = mobile;
      await user.save();
    } else {
      // Create new user account for the resident
      const exists = await User.findOne({
        $or: [
          { username: resident.username },
          { "contact.email": String(email || resident.contact?.email || '').toLowerCase().trim() },
        ],
      });
      if (exists) return res.status(400).json({ message: "Username or email already exists" });

      // Generate a temporary password (they can change it later)
      const tempPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      user = await User.create({
        username: resident.username || `${resident.firstName}${resident.lastName}`.toLowerCase(),
        passwordHash,
        role: "official",
        fullName: resident.fullName,
        position: position?.trim(),
        contact: {
          email: String(email || resident.contact?.email || '').toLowerCase().trim(),
          mobile: mobile || resident.contact?.mobile || '',
        },
        isVerified: true,
        isActive: true,
      });

      // Link the user to the resident
      resident.user = user._id;
      await resident.save();
    }

    res.status(201).json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      position: user.position,
      contact: user.contact,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("[adminOfficialController.create]", err);
    res.status(500).json({ message: err.message });
  }
};

// Update official (accept flat fields, like resident controller)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
  const { fullName, email, mobile, isActive, position } = req.body;
    const update = {};
    if (fullName) update.fullName = String(fullName).trim();
  if (position !== undefined) update.position = String(position).trim();
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (email !== undefined) update["contact.email"] = String(email).toLowerCase().trim();
    if (mobile !== undefined) update["contact.mobile"] = mobile;
    if (email) {
      const exists = await User.findOne({
        _id: { $ne: id },
        "contact.email": String(email).toLowerCase().trim(),
      });
      if (exists) return res.status(400).json({ message: "Email already in use" });
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) return res.status(404).json({ message: "Official not found" });
    res.json({ message: "Official updated", user });
  } catch (err) {
    console.error("[adminOfficialController.update]", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete official
// Remove official role (demote to resident, don't delete user)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the user and update their role instead of deleting
    const user = await User.findByIdAndUpdate(
      id, 
      { 
        role: "resident",      // Change role back to resident
        $unset: { position: 1 }    // Remove the position field
      }, 
      { new: true }
    );
    
    if (!user) return res.status(404).json({ message: "Official not found" });
    
    res.json({ 
      message: "Official role removed successfully. User demoted to resident.", 
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        contact: user.contact,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error("[adminOfficialController.remove]", err);
    res.status(500).json({ message: err.message });
  }
};
