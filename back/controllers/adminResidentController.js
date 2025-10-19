const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Resident = require("../models/resident.model");

const ADDRESS_DEFAULTS = {
  barangay: "La Torre North",
  municipality: "Bayombong",
  province: "Nueva Vizcaya",
  zipCode: "3700",
};
const DEFAULT_CITIZENSHIP = "Filipino";
const ALLOWED_STATUSES = new Set(["verified", "pending", "rejected"]);

// POST /api/admin/residents
exports.create = async (req, res) => {
  try {
    const {
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
      contact = {},
      idFiles,
      status,
    } = req.body;

    const contactData = contact && typeof contact === "object" ? contact : {};
    const normalizedEmail =
      typeof contactData.email === "string" && contactData.email.trim()
        ? contactData.email.toLowerCase().trim()
        : undefined;

    const rawAddress = address && typeof address === "object" ? address : {};
    const normalizedAddress = {
      ...ADDRESS_DEFAULTS,
      ...rawAddress,
      purok:
        typeof rawAddress.purok === "string" ? rawAddress.purok.trim() : rawAddress.purok,
    };

    const dob =
      typeof dateOfBirth === "string" || typeof dateOfBirth === "number"
        ? new Date(dateOfBirth)
        : dateOfBirth instanceof Date
        ? dateOfBirth
        : null;

    if (!dob || Number.isNaN(dob.getTime())) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    const sanitized = {
      firstName: typeof firstName === "string" ? firstName.trim() : firstName,
      middleName: typeof middleName === "string" ? middleName.trim() : middleName,
      lastName: typeof lastName === "string" ? lastName.trim() : lastName,
      suffix: typeof suffix === "string" ? suffix.trim() : suffix,
      birthPlace: typeof birthPlace === "string" ? birthPlace.trim() : birthPlace,
      gender: typeof gender === "string" ? gender.trim().toLowerCase() : gender,
      civilStatus:
        typeof civilStatus === "string" ? civilStatus.trim().toLowerCase() : civilStatus,
      religion: typeof religion === "string" ? religion.trim() : religion,
      ethnicity: typeof ethnicity === "string" ? ethnicity.trim() : ethnicity,
      citizenship:
        typeof citizenship === "string" && citizenship.trim()
          ? citizenship.trim()
          : DEFAULT_CITIZENSHIP,
      occupation: typeof occupation === "string" ? occupation.trim() : occupation,
    };

    const requiredMissing =
      !sanitized.firstName ||
      !sanitized.lastName ||
      !dob ||
      !sanitized.birthPlace ||
      !sanitized.gender ||
      !sanitized.civilStatus ||
      !sanitized.ethnicity ||
      !normalizedAddress?.purok ||
      !normalizedAddress?.barangay ||
      !normalizedAddress?.municipality ||
      !normalizedAddress?.province ||
      !sanitized.citizenship ||
      !sanitized.occupation;

    if (requiredMissing) {
      return res.status(400).json({ message: "Missing required resident fields" });
    }

    const sanitizedContact = {};
    if (normalizedEmail) sanitizedContact.email = normalizedEmail;
    if (typeof contactData.mobile === "string" && contactData.mobile.trim()) {
      sanitizedContact.mobile = contactData.mobile.trim();
    }

    const statusValue =
      typeof status === "string" ? status.trim().toLowerCase() : undefined;
    const resolvedStatus = ALLOWED_STATUSES.has(statusValue)
      ? statusValue
      : "verified";

    const resident = await Resident.create({
      firstName: sanitized.firstName,
      middleName: sanitized.middleName,
      lastName: sanitized.lastName,
      suffix: sanitized.suffix,
      dateOfBirth: dob,
      birthPlace: sanitized.birthPlace,
      gender: sanitized.gender,
      civilStatus: sanitized.civilStatus,
      religion: sanitized.religion,
      ethnicity: sanitized.ethnicity,
      address: normalizedAddress,
      citizenship: sanitized.citizenship,
      occupation: sanitized.occupation,
      contact: sanitizedContact,
      idFiles,
      status: resolvedStatus,
    });

    res.status(201).json({ message: "Resident created", resident });
  } catch (err) {
    console.error("Resident creation error:", err);
    const statusCode = err.name === "ValidationError" ? 400 : 500;
    res.status(statusCode).json({
      message: err.message || "Internal server error",
      error: err.name === "ValidationError" ? err.errors : undefined,
    });
  }
};

// GET /api/admin/residents
exports.list = async (req, res) => {
  try {
    console.log("Admin residents list request:", {
      user: req.user,
      query: req.query,
      headers: {
        authorization: req.headers.authorization ? "Present" : "Missing"
      }
    });
    
    const filter = {};
    if (String(req.query.unlinked) === "true") {
      filter.$or = [{ user: { $exists: false } }, { user: null }];
    }
    const residents = await Resident.find(filter).populate("user", "username fullName contact");
    
    console.log(`Found ${residents.length} residents`);
    res.json(residents);
  } catch (err) {
    console.error("Error in residents list:", err);
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