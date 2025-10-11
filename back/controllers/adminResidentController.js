const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Resident = require("../models/resident.model");

// POST /api/admin/residents
exports.create = async (req, res) => {
  try {
    const {
      // user fields intentionally NOT required here
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth,
      birthPlace,
      gender,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      education,
      contact = {},
      idFiles,
      status, // optional, default to 'verified' for admin-created
    } = req.body;

    // Validate required resident fields only
    const requiredResidentMissing =
      !firstName || !lastName || !dateOfBirth || !birthPlace || !gender || !civilStatus ||
      !ethnicity || !address?.purok || !address?.barangay ||
      !address?.municipality || !address?.province ||
      !citizenship || !occupation || !education || !contact?.email || !contact?.mobile;

    if (requiredResidentMissing) {
      return res.status(400).json({ message: "Missing required resident fields" });
    }

    // Normalize types
    const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;

    // Create Resident only (no User, no username/password)
    const resident = await Resident.create({
      firstName,
      middleName,
      lastName,
      suffix,
      dateOfBirth: dob,
      birthPlace,
      gender,
      civilStatus,
      religion,
      ethnicity,
      address,
      citizenship,
      occupation,
      education,
      contact: { email: String(contact.email).toLowerCase().trim(), mobile: contact.mobile },
      idFiles,
      status: status || "verified", // admin-created records default to verified
    });

    res.status(201).json({ message: "Resident created", resident });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/residents
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (String(req.query.unlinked) === "true") {
      filter.$or = [{ user: { $exists: false } }, { user: null }];
    }
    const residents = await Resident.find(filter).populate("user", "username fullName contact");
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