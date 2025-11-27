const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

// List all officials (return array, not {items: []})
exports.list = async (req, res) => {
  try {
    const officials = await User.find({ role: "official" })
      .select("-passwordHash -verificationToken")
      .sort({ createdAt: -1 })
      .lean();
    
    // Populate resident data for each official
    const Resident = require("../models/resident.model");
    const officialsWithResidentData = await Promise.all(
      officials.map(async (official) => {
        const resident = await Resident.findOne({ user: official._id })
          .select('_id firstName middleName lastName suffix contact')
          .lean();
        
        // Format full name with middle initial
        let formattedFullName = official.fullName;
        if (resident) {
          const firstName = resident.firstName || '';
          const middleName = resident.middleName ? String(resident.middleName).trim() : '';
          const middleInitial = middleName.length > 0 ? (middleName[0].toUpperCase() + '.') : '';
          const lastName = resident.lastName || '';
          const suffix = resident.suffix ? String(resident.suffix).trim() : '';
          formattedFullName = [firstName, middleInitial, lastName, suffix]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        return {
          ...official,
          residentId: resident?._id || null,
          // Override contact with resident's contact if available
          contact: resident?.contact || official.contact,
          // Add full name from resident with middle initial format
          fullName: formattedFullName
        };
      })
    );
    
    res.json(officialsWithResidentData);
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
      // Update existing user account to official role using same logic as update function
      user.role = "official";
      user.position = position?.trim();
      
      // Format fullName with middle initial
      const firstName = resident.firstName || '';
      const middleName = resident.middleName ? String(resident.middleName).trim() : '';
      const middleInitial = middleName.length > 0 ? (middleName[0].toUpperCase() + '.') : '';
      const lastName = resident.lastName || '';
      const suffix = resident.suffix ? String(resident.suffix).trim() : '';
      const formattedFullName = [firstName, middleInitial, lastName, suffix]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Update fullName with middle initial format
      if (formattedFullName) {
        user.fullName = formattedFullName;
      }
      
      // Handle email - if provided as empty string, remove it
      if (email !== undefined) {
        const cleanEmail = String(email).toLowerCase().trim();
        if (cleanEmail.length > 0) {
          if (!user.contact) user.contact = {};
          user.contact.email = cleanEmail;
        } else {
          if (user.contact) user.contact.email = undefined;
        }
      }
      
      // Handle mobile - if provided as empty string, remove it
      if (mobile !== undefined) {
        const cleanMobile = String(mobile).trim();
        if (cleanMobile.length > 0) {
          if (!user.contact) user.contact = {};
          user.contact.mobile = cleanMobile;
        } else {
          if (user.contact) user.contact.mobile = undefined;
        }
      }
      
      await user.save();
    } else {
      // Create new user account for the resident
      const emailToCheck = String(email || resident.contact?.email || '').toLowerCase().trim();
      
      // Generate username from resident's name
      let username = '';
      if (resident.firstName && resident.lastName) {
        username = `${resident.firstName}${resident.lastName}`.toLowerCase().replace(/\s/g, '');
      } else if (resident.firstName) {
        username = `${resident.firstName}_${resident._id}`.toLowerCase().replace(/\s/g, '');
      } else {
        username = `resident_${resident._id}`;
      }
      
      // Check if username or email already exists
      const existsQuery = { username: username };
      if (emailToCheck && emailToCheck.length > 0) {
        existsQuery.$or = [
          { username: username },
          { "contact.email": emailToCheck },
        ];
      }
      
      const exists = await User.findOne(existsQuery);
      if (exists) {
        // If username conflicts, add a suffix
        if (exists.username === username) {
          username = `${username}_${Date.now()}`;
          // Check again with new username and email
          const existsAgain = await User.findOne({
            $or: [
              { username: username },
              ...(emailToCheck && emailToCheck.length > 0 ? [{ "contact.email": emailToCheck }] : [])
            ]
          });
          if (existsAgain) {
            return res.status(400).json({ message: "Email already exists" });
          }
        } else {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Generate a temporary password (they can change it later)
      const tempPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      const contact = { };
      if (emailToCheck && emailToCheck.length > 0) contact.email = emailToCheck;
      if (mobile) contact.mobile = mobile;

      // Format fullName with middle initial
      const firstName = resident.firstName || '';
      const middleName = resident.middleName ? String(resident.middleName).trim() : '';
      const middleInitial = middleName.length > 0 ? (middleName[0].toUpperCase() + '.') : '';
      const lastName = resident.lastName || '';
      const suffix = resident.suffix ? String(resident.suffix).trim() : '';
      const formattedFullName = [firstName, middleInitial, lastName, suffix]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      user = await User.create({
        username: username,
        passwordHash,
        role: "official",
        fullName: formattedFullName || resident.fullName || `${firstName} ${lastName}`.trim(),
        position: position?.trim(),
        contact,
        isVerified: true,
        isActive: true,
      });

      // Link the user to the resident
      resident.user = user._id;
    }
    
    // Update resident contact info using same logic as update function
    const residentUpdateOps = {};
    const residentUnsetOps = {};
    
    if (email !== undefined) {
      const clean = String(email).toLowerCase().trim();
      if (clean.length > 0) {
        residentUpdateOps["contact.email"] = clean;
      } else {
        residentUnsetOps["contact.email"] = "";
      }
    }
    if (mobile !== undefined) {
      const m = String(mobile).trim();
      if (m.length > 0) {
        residentUpdateOps["contact.mobile"] = m;
      } else {
        residentUnsetOps["contact.mobile"] = "";
      }
    }
    
    // Update resident if there are contact changes
    if (Object.keys(residentUpdateOps).length > 0 || Object.keys(residentUnsetOps).length > 0) {
      const residentOps = {};
      if (Object.keys(residentUpdateOps).length) residentOps.$set = residentUpdateOps;
      if (Object.keys(residentUnsetOps).length) residentOps.$unset = residentUnsetOps;
      await Resident.updateOne({ _id: residentId }, residentOps);
    } else {
      // Just save to link user if no contact updates
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
    
    // Email: if provided as non-empty, set; if provided as empty, unset; if omitted, ignore
    if (email !== undefined) {
      const clean = String(email).toLowerCase().trim();
      if (clean.length > 0) {
        update["contact.email"] = clean;
      } else {
        update.$unset = { ...(update.$unset || {}), "contact.email": 1 };
      }
    }
    if (mobile !== undefined) {
      const m = String(mobile).trim();
      if (m.length > 0) {
        update["contact.mobile"] = m;
      } else {
        update.$unset = { ...(update.$unset || {}), "contact.mobile": 1 };
      }
    }
    
    // Only check for email uniqueness if there's actually an email to check
    if (email && String(email).trim().length > 0) {
      const emailToCheck = String(email).toLowerCase().trim();
      const exists = await User.findOne({
        _id: { $ne: id },
        "contact.email": emailToCheck,
      });
      if (exists) return res.status(400).json({ message: "Email already in use" });
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    
    // Update the user
    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) return res.status(404).json({ message: "Official not found" });
    
    // Also update resident contact info if there are contact changes
    const Resident = require("../models/resident.model");
    const residentUpdateOps = {};
    const residentUnsetOps = {};
    
    if (email !== undefined) {
      const clean = String(email).toLowerCase().trim();
      if (clean.length > 0) {
        residentUpdateOps["contact.email"] = clean;
      } else {
        residentUnsetOps["contact.email"] = "";
      }
    }
    if (mobile !== undefined) {
      const m = String(mobile).trim();
      if (m.length > 0) {
        residentUpdateOps["contact.mobile"] = m;
      } else {
        residentUnsetOps["contact.mobile"] = "";
      }
    }
    
    // Update resident if there are contact changes
    if (Object.keys(residentUpdateOps).length > 0 || Object.keys(residentUnsetOps).length > 0) {
      const residentOps = {};
      if (Object.keys(residentUpdateOps).length) residentOps.$set = residentUpdateOps;
      if (Object.keys(residentUnsetOps).length) residentOps.$unset = residentUnsetOps;
      await Resident.updateOne({ user: id }, residentOps);
    }
    
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
