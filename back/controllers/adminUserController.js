const User = require("../models/user.model");
const Resident = require("../models/resident.model");
const bcrypt = require("bcryptjs");

// GET /api/admin/users
exports.list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const { search, role } = req.query;
    const q = {};
    if (role) q.role = role;
    if (search) {
      const s = String(search).trim();
      q.$or = [
        { username: new RegExp(s, "i") },
        { fullName: new RegExp(s, "i") },
        { "contact.email": new RegExp(s, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(q)
        .select("-passwordHash -verificationToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(q),
    ]);

    // Populate resident status and contact info for each user
    const itemsWithResidentData = await Promise.all(
      items.map(async (user) => {
        const resident = await Resident.findOne({ user: user._id })
          .select('status contact firstName middleName lastName suffix')
          .lean();
        return {
          ...user,
          residentStatus: resident?.status || null,
          // Override contact with resident's contact if available
          contact: resident?.contact || user.contact,
          // Add full name from resident if available
          fullName: resident 
            ? [resident.firstName, resident.middleName, resident.lastName, resident.suffix]
                .filter(Boolean)
                .join(' ')
            : user.fullName
        };
      })
    );

    res.json({ items: itemsWithResidentData, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/users
exports.create = async (req, res) => {
  try {
    const { username, password, role, residentId } = req.body;

    // All user creation now uses resident selection approach
    if (!username || !password || !residentId || !role) {
      return res.status(400).json({ message: "username, password, residentId, and role are required" });
    }
    if (username.length < 6) {
      return res.status(400).json({ message: "Username must be at least 6 characters" });
    }

    if (!["resident", "admin", "official"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be resident, admin, or official" });
    }

    // Find resident and check if it's available (no user link or broken user link)
    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(400).json({ message: "Resident not found" });
    }

    // Check if resident is already properly linked to an existing user
    if (resident.user) {
      const existingUser = await User.findById(resident.user);
      if (existingUser) {
        return res.status(400).json({ message: "Resident is already linked to a user account" });
      }
      // If user doesn't exist, clean up the broken reference
      resident.user = undefined;
      await resident.save();
    }

    // Ensure username is unique
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const computedFullName = [resident.firstName, resident.middleName, resident.lastName, resident.suffix]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Prepare contact object - only include fields with values to avoid unique constraint issues
    const contactData = {};
    if (resident.contact?.email && resident.contact.email.trim()) {
      contactData.email = resident.contact.email.toLowerCase().trim();
    }
    if (resident.contact?.mobile && resident.contact.mobile.trim()) {
      contactData.mobile = resident.contact.mobile.trim();
    }

    const user = await User.create({
      username,
      passwordHash,
      role, // Can be resident, admin, or official
      fullName: computedFullName || "User",
      contact: contactData,
      isVerified: true,
      isActive: true,
    });

    // Link user to resident and set resident status to verified (automatically verified when created by admin)
    await Resident.updateOne({ _id: resident._id }, { $set: { user: user._id, status: 'verified' } });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      contact: user.contact,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('Error in adminUserController.create:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

// PATCH /api/admin/users/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
  const { role, isActive, isVerified, fullName, contact, residentStatus, username } = req.body;

  console.log('Update user request:', { id, body: req.body });

  const update = {};
  let unset = {};
  
    // Check for duplicate username if username is being updated
    if (username) {
      const usernameTrim = String(username).trim();
      if (usernameTrim) {
        const exists = await User.findOne({
          _id: { $ne: id },
          username: new RegExp(`^${usernameTrim}$`, 'i'),
        });
        if (exists) return res.status(400).json({ message: "Username already exists" });
        update.username = usernameTrim;
      }
    }
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (typeof isVerified === "boolean") update.isVerified = isVerified;
    if (fullName) update.fullName = String(fullName).trim();
    if (role) {
      if (!["admin", "official", "resident"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      update.role = role;
    }
    if (contact) {
      if (contact.email !== undefined) {
        const emailTrim = String(contact.email || "").toLowerCase().trim();
        if (emailTrim) {
          // ensure unique email if changed
          const exists = await User.findOne({
            _id: { $ne: id },
            "contact.email": emailTrim,
          });
          if (exists) return res.status(400).json({ message: "Email already in use" });
          update["contact.email"] = emailTrim;
        } else {
          unset["contact.email"] = ""; // treat empty email as removal
        }
      }
      if (contact.mobile !== undefined) {
        const mobileTrim = typeof contact.mobile === 'string' ? contact.mobile.trim() : contact.mobile;
        if (mobileTrim) {
          update["contact.mobile"] = mobileTrim;
        } else {
          unset["contact.mobile"] = "";
        }
      }
    }

    // Also update resident contact info
    const residentUpdateOps = {};
    const residentUnsetOps = {};
    if (contact) {
      if (contact.email !== undefined) {
        const emailTrim = String(contact.email || "").toLowerCase().trim();
        if (emailTrim) {
          residentUpdateOps["contact.email"] = emailTrim;
        } else {
          residentUnsetOps["contact.email"] = "";
        }
      }
      if (contact.mobile !== undefined) {
        const mobileTrim = typeof contact.mobile === 'string' ? contact.mobile.trim() : contact.mobile;
        if (mobileTrim) {
          residentUpdateOps["contact.mobile"] = mobileTrim;
        } else {
          residentUnsetOps["contact.mobile"] = "";
        }
      }
    }

    // Update resident if there are contact changes
    if (Object.keys(residentUpdateOps).length > 0 || Object.keys(residentUnsetOps).length > 0) {
      const residentOps = {};
      if (Object.keys(residentUpdateOps).length) residentOps.$set = residentUpdateOps;
      if (Object.keys(residentUnsetOps).length) residentOps.$unset = residentUnsetOps;
      await Resident.updateOne({ user: id }, residentOps);
    }

    // Update resident status if provided
    if (residentStatus) {
      if (!['pending', 'verified', 'rejected'].includes(residentStatus)) {
        return res.status(400).json({ message: "Invalid resident status. Must be pending, verified, or rejected" });
      }
      
      console.log('Updating resident status to:', residentStatus);
      const result = await Resident.updateOne(
        { user: id },
        { $set: { status: residentStatus } }
      );
      console.log('Resident update result:', result);
    }

    // Only update user if there are fields to update
    if (Object.keys(update).length > 0 || Object.keys(unset).length > 0) {
      const updateOps = {};
      if (Object.keys(update).length) updateOps.$set = update;
      if (Object.keys(unset).length) updateOps.$unset = unset;
      await User.updateOne({ _id: id }, updateOps);
    }
    
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    // optional: prevent self-delete
    if (req.user && String(req.user.id) === String(id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    
    // Delete the user
    await User.deleteOne({ _id: id });
    
    // Clean up any resident references to this deleted user
    await Resident.updateMany(
      { user: id },
      { $unset: { user: 1 } }
    );
    
    res.json({ message: "User deleted and resident references cleaned up" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/users/:id/change-password
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password and update (admin can change without verifying current password)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: id }, { $set: { passwordHash: newPasswordHash } });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};