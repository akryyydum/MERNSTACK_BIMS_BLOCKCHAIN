const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Resident = require("../models/resident.model");

// POST /api/admin/residents
exports.create = async (req, res) => {
  try {
    const {
      username,
      password,
      // resident fields
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      gender,
      civilStatus,
      religion,
      address,
      citizenship,
      occupation,
      education,
      contact = {},
    } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }
    const requiredResidentMissing =
      !firstName || !lastName || !dateOfBirth || !birthPlace || !gender || !civilStatus ||
      !address?.street || !address?.purok || !address?.barangay || 
      !address?.municipality || !address?.province ||
      !citizenship || !occupation || !education || !contact?.email || !contact?.mobile;
    if (requiredResidentMissing) {
      return res.status(400).json({ message: "Missing required resident fields" });
    }

    // Uniqueness
    const exists = await User.findOne({
      $or: [{ username }, { "contact.email": contact.email }],
    });
    if (exists) return res.status(400).json({ message: "Username or email already exists" });

    // Build full name for User
    const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    // Create User
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash,
      role: "resident",
      fullName,
      contact: { email: String(contact.email).toLowerCase().trim(), mobile: contact.mobile },
      isVerified: true,  // admin-created
      isActive: true,
    });

    try {
      // Create Resident linked to User
      await Resident.create({
        user: user._id,
        firstName,
        middleName,
        lastName,
        suffix,
        dateOfBirth,
        birthPlace,
        gender,
        civilStatus,
        religion,
        address,
        citizenship,
        occupation,
        education,
        contact: { email: contact.email, mobile: contact.mobile },
        status: "verified",
      });
    } catch (residentErr) {
      await User.deleteOne({ _id: user._id }); // rollback user
      return res.status(400).json({ message: residentErr.message || "Failed to create resident document" });
    }

    res.status(201).json({ message: "Resident created", id: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/residents
exports.list = async (req, res) => {
  try {
    const residents = await Resident.find().populate("user", "username fullName contact");
    res.json(residents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/residents/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    if (update.dateOfBirth && typeof update.dateOfBirth === "string") {
      update.dateOfBirth = new Date(update.dateOfBirth);
    }
    const resident = await Resident.findByIdAndUpdate(id, update, { new: true });
    if (!resident) return res.status(404).json({ message: "Resident not found" });
    res.json({ message: "Resident updated", resident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/residents/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const resident = await Resident.findByIdAndDelete(id);
    if (!resident) return res.status(404).json({ message: "Resident not found" });
    // Optionally delete the linked user:
    await User.findByIdAndDelete(resident.user);
    res.json({ message: "Resident deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/residents/:id/verify
exports.verify = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const resident = await Resident.findByIdAndUpdate(
      id,
      { status: status || "verified" },
      { new: true }
    );
    if (!resident) return res.status(404).json({ message: "Resident not found" });
    res.json({ message: "Resident status updated", resident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};